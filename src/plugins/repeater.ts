import { MessageSegment, Plugin, PluginContext } from '../types';
import { createLogger } from '../logger';
import { getImageDataUrl } from './image-cache';
import { isKnowledgeTopic } from './knowledge-base';

/**
 * 复读机插件 - 检测群友连续发相同消息时跟着复读
 * 这是一个非常"真人"的行为——当群里有人开始复读，真人也会跟着复读
 *
 * 支持：纯文本、纯图片、纯表情包(face)、单 record 短语音
 */

interface RepeatState {
  /** 用于判等的指纹 */
  signature: string;
  /** 实际要发出去的消息（可能是 string 或 segment 数组） */
  payload: string | MessageSegment[];
  count: number;
  hasRepeated: boolean;
  updatedAt: number;
}

const groupRepeatState: Map<number, RepeatState> = new Map();
const MAX_GROUP_STATES = 500;
const logger = createLogger('Repeater');

function pruneStatesIfNeeded(): void {
  if (groupRepeatState.size < MAX_GROUP_STATES) return;
  const sorted = [...groupRepeatState.entries()].sort((a, b) => a[1].updatedAt - b[1].updatedAt);
  const removeCount = Math.max(1, groupRepeatState.size - MAX_GROUP_STATES + 1);
  for (const [groupId] of sorted.slice(0, removeCount)) {
    groupRepeatState.delete(groupId);
  }
}

function isUnsafeRepeatText(text: string): boolean {
  const normalized = text.replace(/\s+/g, '');
  if (/^[\d.。,\s，、]+$/.test(normalized)) return true;
  if (/^[哈啊嗯哦额呃草艹wW6]+$/.test(normalized) && normalized.length <= 8) return true;
  if (/^[^\u4e00-\u9fa5A-Za-z0-9]+$/.test(normalized)) return true;
  return false;
}

function includesAnyKeyword(text: string, keywords: string[] = []): boolean {
  if (!text || keywords.length === 0) return false;
  const lowerText = text.toLowerCase();
  return keywords.some((keyword) => keyword && lowerText.includes(keyword.toLowerCase()));
}

function uniqueSources(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function compactInlineBase64(value: string): string {
  return value.replace(/\s+/g, '');
}

function dataUrlToBase64File(source: string): string {
  const match = source.match(/^data:image\/[^;]+;base64,(.+)$/is);
  if (!match) return '';
  const compact = compactInlineBase64(match[1]);
  return compact ? `base64://${compact}` : '';
}

function imageSegmentFromSendSource(source: string): MessageSegment | null {
  const cleaned = source.trim();
  if (!cleaned) return null;

  if (/^data:image\/[^;]+;base64,/i.test(cleaned)) {
    const file = dataUrlToBase64File(cleaned);
    return file ? { type: 'image', data: { file } } : null;
  }

  if (cleaned.startsWith('base64://')) {
    const compact = compactInlineBase64(cleaned.slice('base64://'.length));
    return compact ? { type: 'image', data: { file: `base64://${compact}` } } : null;
  }

  if (/^https?:\/\//i.test(cleaned)) {
    return { type: 'image', data: { file: cleaned, url: cleaned } };
  }

  if (cleaned.startsWith('file://')) {
    return { type: 'image', data: { file: cleaned } };
  }

  if (/^[/\\]|^[a-zA-Z]:[\\/]/.test(cleaned)) {
    return { type: 'image', data: { file: `file://${cleaned}` } };
  }

  return null;
}

function firstStringCandidate(items: unknown[]): string {
  for (const item of items) {
    if (typeof item === 'string' && item.trim()) return item.trim();
  }
  return '';
}

function apiBase64ImageSource(data: any): string {
  const inline = firstStringCandidate([
    data?.base64,
    data?.b64,
    data?.base64_file,
    data?.file_base64,
    data?.data?.base64,
    data?.data?.b64,
    data?.data?.base64_file,
    data?.data?.file_base64,
  ]);
  if (!inline) return '';
  if (inline.startsWith('data:image/')) return inline;
  if (inline.startsWith('base64://')) return inline;
  const compact = compactInlineBase64(inline);
  if (compact.length < 80 || !/^[A-Za-z0-9+/_=-]+$/.test(compact)) return '';
  return `base64://${compact}`;
}

function apiLocalImageSource(data: any): string {
  const local = firstStringCandidate([
    data?.file,
    data?.path,
    data?.file_path,
    data?.data?.file,
    data?.data?.path,
    data?.data?.file_path,
  ]);
  if (!local || /^https?:\/\//i.test(local) || /^data:image\//i.test(local) || local.startsWith('base64://')) return '';
  if (local.startsWith('file://')) return local;
  return /^[/\\]|^[a-zA-Z]:[\\/]/.test(local) ? `file://${local}` : '';
}

function apiUrlImageSource(data: any): string {
  return firstStringCandidate([
    data?.url,
    data?.file_url,
    data?.data?.url,
    data?.data?.file_url,
  ]);
}

async function sourceToSendableImage(source: string): Promise<MessageSegment | null> {
  const cleaned = source.trim();
  if (!cleaned) return null;
  if (/^(?:data:image\/|base64:\/\/)/i.test(cleaned)) return imageSegmentFromSendSource(cleaned);

  try {
    const dataUrl = await getImageDataUrl(cleaned);
    const inline = dataUrl ? imageSegmentFromSendSource(dataUrl) : null;
    if (inline) return inline;
  } catch (err) {
    logger.warn(`[Repeater] image cache resolve failed source=${cleaned.slice(0, 80)} err=${err instanceof Error ? err.message : String(err)}`);
  }

  return imageSegmentFromSendSource(cleaned);
}

async function resolveRepeatImageSegment(ctx: PluginContext, seg: MessageSegment): Promise<MessageSegment> {
  if (seg.type !== 'image') return seg;
  const file = String(seg.data.file || '').trim();
  const url = String(seg.data.url || '').trim();

  for (const source of uniqueSources([file, url])) {
    try {
      const res = await ctx.bot.callApiAsync('get_image', { file: source }, 6000);
      const data = (res as any)?.data || res;

      const inline = apiBase64ImageSource(data);
      if (inline) {
        const next = imageSegmentFromSendSource(inline);
        if (next) return next;
      }

      const local = apiLocalImageSource(data);
      if (local) {
        const next = await sourceToSendableImage(local);
        if (next) return next;
      }

      const resolvedUrl = apiUrlImageSource(data);
      if (resolvedUrl) {
        const next = await sourceToSendableImage(resolvedUrl);
        if (next) return next;
      }
    } catch (err) {
      logger.warn(`[Repeater] get_image failed source=${source.slice(0, 80)} err=${err instanceof Error ? err.message : String(err)}`);
    }
  }

  for (const source of uniqueSources([url, file])) {
    const next = await sourceToSendableImage(source);
    if (next) return next;
  }

  logger.warn(`[Repeater] image repeat fell back to original segment file=${file.slice(0, 80)}`);
  return seg;
}

async function prepareRepeatPayload(ctx: PluginContext, payload: string | MessageSegment[]): Promise<string | MessageSegment[]> {
  if (!Array.isArray(payload)) return payload;
  const resolved: MessageSegment[] = [];
  for (const seg of payload) {
    resolved.push(seg.type === 'image' ? await resolveRepeatImageSegment(ctx, seg) : seg);
  }
  return resolved;
}

/**
 * 从消息段计算"复读指纹"
 * 支持：纯文本 / 纯图 / 纯 face / 文本+表情混合
 * 如果消息含 at/reply/mface/复杂结构，返回 null（不复读）
 */
function computeRepeatFingerprint(message: MessageSegment[]): { sig: string; payload: string | MessageSegment[]; kind: string } | null {
  if (!message || message.length === 0) return null;

  // 过滤掉 at/reply（这种消息不能复读，会带噪音）
  const meaningful = message.filter((s) => s.type !== 'at' && s.type !== 'reply');
  if (meaningful.length === 0) return null;

  const types = new Set(meaningful.map((s) => s.type));
  // 单纯图片
  if (types.size === 1 && types.has('image')) {
    if (meaningful.length > 1) return null; // 多张图不复读
    const seg = meaningful[0];
    if (seg.type !== 'image') return null;
    const file = seg.data.file || seg.data.url || '';
    if (!file) return null;
    return {
      sig: `image:${file.slice(0, 200)}`,
      payload: [seg],
      kind: 'image',
    };
  }

  // 单 face
  if (types.size === 1 && types.has('face')) {
    if (meaningful.length > 3) return null;
    const sig = 'face:' + meaningful.map((s) => s.type === 'face' ? s.data.id : '').join(',');
    return { sig, payload: meaningful, kind: 'face' };
  }

  // 单短 record (小于 30s 的语音) - 这种就不复读了，意义不大
  if (types.size === 1 && types.has('record')) return null;

  // 文本+face 混合（限制 face <= 3 个）
  if (types.size <= 2 && types.has('text')) {
    let allText = '';
    let faceCount = 0;
    const cleaned: MessageSegment[] = [];
    for (const seg of meaningful) {
      if (seg.type === 'text') {
        allText += seg.data.text;
        cleaned.push(seg);
      } else if (seg.type === 'face') {
        faceCount++;
        if (faceCount > 3) return null;
        cleaned.push(seg);
      } else {
        return null;
      }
    }
    const trimmed = allText.trim();
    if (trimmed.length === 0 && faceCount === 0) return null;
    const sig = `mix:${trimmed.slice(0, 100)}|face=${meaningful.filter((s) => s.type === 'face').map((s) => s.type === 'face' ? s.data.id : '').join(',')}`;
    return { sig, payload: cleaned, kind: faceCount > 0 ? 'mix' : 'text' };
  }

  return null;
}

export const repeaterPlugin: Plugin = {
  name: 'repeater',
  description: '复读机 - 群友复读时跟着复读',

  handler: async (ctx) => {
    if (!ctx.groupId) return false;
    // 强触发必须让 AI 插件接，不让复读机截胡。
    if (ctx.isAtBot || ctx.isReplyToBot) return false;
    // 命令不复读
    if (ctx.command) return false;

    // 计算复读指纹（基于完整消息段，支持图/face/混合）
    const fp = computeRepeatFingerprint(ctx.event.message);
    if (!fp) return false;

    // 文本类的额外检查
    if (fp.kind === 'text' || fp.kind === 'mix') {
      if (!ctx.rawText || ctx.rawText.length > 50) return false;
      const ai = ctx.bot.getConfig().ai;
      if (includesAnyKeyword(ctx.rawText, [ai.active_preset, ...ai.trigger_keywords]) || isKnowledgeTopic(ctx.rawText)) return false;
      if (ctx.rawText.length < 2 && fp.kind === 'text') return false;
      if (fp.kind === 'text' && isUnsafeRepeatText(ctx.rawText)) return false;
    }

    const groupId = ctx.groupId;
    const state = groupRepeatState.get(groupId);

    if (!state || state.signature !== fp.sig) {
      // 新消息或不同消息，重置状态
      pruneStatesIfNeeded();
      groupRepeatState.set(groupId, {
        signature: fp.sig,
        payload: fp.payload,
        count: 1,
        hasRepeated: false,
        updatedAt: Date.now(),
      });
      return false;
    }

    // 相同消息，计数+1
    state.count++;
    state.payload = fp.payload;
    state.updatedAt = Date.now();

    // 2人复读就跟（之前是3人才跟）
    if (state.count >= 2 && !state.hasRepeated) {
      state.hasRepeated = true;
      // 文字才允许 30% 变形；图/face 按原样复读
      if (fp.kind === 'text') {
        const variant = maybeVariantRepeat(ctx.rawText);
        ctx.reply(variant);
      } else {
        ctx.reply(await prepareRepeatPayload(ctx, state.payload));
      }
      return true;
    }

    return false;
  },
};

/** 偶尔给复读加变形，模拟真人 */
function maybeVariantRepeat(text: string): string {
  const r = Math.random();
  // 70%直接复读
  if (r < 0.7) return text;
  // 15%加感叹号/问号
  if (r < 0.85) {
    if (text.endsWith('?') || text.endsWith('？')) return text + '?';
    if (!/[!！?？.。]$/.test(text)) return text + '!';
    return text + '!';
  }
  // 15%加前缀
  const prefixes = ['+1 ', '确实 ', '同感 ', ''];
  return prefixes[Math.floor(Math.random() * prefixes.length)] + text;
}
