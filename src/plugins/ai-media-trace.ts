import type { AIConfig, MessageSegment } from '../types';

export interface VisionCacheInspectItem {
  status: string;
  cacheKey?: string;
  ttlSeconds?: number;
  sizeKB?: number;
}

export interface VisionCacheEvidenceTrace {
  visionCacheBefore?: string[];
  visionCacheAfter?: string[];
}

export interface MediaReplyTrace extends VisionCacheEvidenceTrace {
  timestamp: number;
  chatType: 'group' | 'private';
  chatId: number;
  userId: number;
  messageId: number;
  senderName: string;
  rawTextPreview?: string;
  hasImages: boolean;
  imageInputCount?: number;
  imageSourceKinds?: string[];
  hasRecords: boolean;
  recordInputCount?: number;
  recordSourceKinds?: string[];
  recordTranscripts: number;
  sttLimit?: number;
  sttTruncated?: boolean;
  visionPayload: boolean;
  visionImages?: number;
  visionLimit?: number;
  visionTruncated?: boolean;
  visionDataInfo?: string[];
  visionError?: string;
}

export interface ImageCacheStatsSnapshot {
  count: number;
  maxFiles: number;
  sizeMB: number;
  maxSizeMB: number;
  hits: number;
  misses: number;
  downloadFailures: number;
  inFlight: number;
  maxFileMB: number;
  maxRedirects: number;
  cleanupIntervalMinutes: number;
  lastError?: string;
}

export type MediaSourceKind =
  | 'empty'
  | 'data-url'
  | 'base64'
  | 'file-url'
  | 'http-url'
  | 'local-path'
  | 'unknown';

export function classifyMediaSource(source: string): MediaSourceKind {
  if (!source) return 'empty';
  if (source.startsWith('data:')) return 'data-url';
  if (source.startsWith('base64://')) return 'base64';
  if (source.startsWith('file://')) return 'file-url';
  if (/^https?:\/\//i.test(source)) return 'http-url';
  if (/^[a-zA-Z]:[\\/]/.test(source) || source.startsWith('/')) return 'local-path';
  return 'unknown';
}

export function classifyImageSource(source: string): string {
  return classifyMediaSource(source);
}

export function classifyAudioSource(source: string): string {
  return `audio-${classifyMediaSource(source)}`;
}

export function summarizeMediaSourceKinds(sources: string[], label?: string): string[] {
  const counts = new Map<string, number>();
  for (const source of sources) {
    const kind = classifyMediaSource(source || '');
    const key = label ? `${label}-${kind}` : kind;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([kind, count]) => `${kind}${count > 1 ? `x${count}` : ''}`)
    .slice(0, 6);
}

export function summarizeImageSourceKinds(sources: string[]): string[] {
  return summarizeMediaSourceKinds(sources);
}

export function summarizeAudioSourceKinds(sources: string[]): string[] {
  return summarizeMediaSourceKinds(sources, 'audio');
}

export function imageSegmentCount(message: MessageSegment[]): number {
  return message.filter((seg) => seg.type === 'image').length;
}

export function compactTraceList(items: string[] | undefined, maxItems: number = 6): string {
  if (!items || items.length === 0) return '';
  const unique = items
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, all) => all.indexOf(item) === index)
    .slice(0, maxItems);
  return unique.join(' / ');
}

export function compactVisionCacheInspect(items: VisionCacheInspectItem[] | undefined): string[] {
  if (!items || items.length === 0) return [];
  return items.slice(0, 4).map((item, index) => {
    const key = item.cacheKey ? ` key=${item.cacheKey}` : '';
    const ttl = Number(item.ttlSeconds || 0) > 0 ? ` ttl=${item.ttlSeconds}s` : '';
    const size = Number(item.sizeKB || 0) > 0 ? ` ${item.sizeKB}KB` : '';
    return `${index + 1}:${item.status}${key}${ttl}${size}`;
  });
}

export function formatVisionCacheEvidence(trace: VisionCacheEvidenceTrace | null, maxItems = 4): string {
  if (!trace) return '';
  const before = compactTraceList(trace.visionCacheBefore, maxItems);
  const after = compactTraceList(trace.visionCacheAfter, maxItems);
  if (before && after) return `前 ${before} -> 后 ${after}`;
  if (before) return `前 ${before}`;
  if (after) return `后 ${after}`;
  return '';
}

export function formatRecordTrace(trace: Pick<MediaReplyTrace, 'hasRecords' | 'recordSourceKinds' | 'recordInputCount' | 'recordTranscripts' | 'sttLimit' | 'sttTruncated'>): string {
  if (!trace.hasRecords) return '无';
  const count = trace.recordSourceKinds?.length ? ` ${compactTraceList(trace.recordSourceKinds, 4)}` : '';
  const inputCount = trace.recordInputCount || (trace.recordTranscripts > 0 ? trace.recordTranscripts : 0);
  const input = inputCount ? `(${inputCount})` : '';
  const transcriptTotal = inputCount ? `/${inputCount}` : '';
  const limit = trace.sttLimit ? ` max${trace.sttLimit}` : '';
  const truncated = trace.sttTruncated ? ' 已截断' : '';
  return `有${input}${count} 听写${trace.recordTranscripts}${transcriptTotal}${limit}${truncated}`;
}

export function formatVisionTrace(trace: Pick<MediaReplyTrace, 'visionPayload' | 'visionImages' | 'imageInputCount' | 'visionLimit' | 'visionTruncated' | 'visionDataInfo' | 'visionError' | 'hasImages'>): string {
  if (trace.visionPayload) {
    const count = typeof trace.visionImages === 'number' ? trace.visionImages : 0;
    const total = trace.imageInputCount || count;
    const limit = trace.visionLimit ? ` max${trace.visionLimit}` : '';
    const truncated = trace.visionTruncated ? ' 已截断' : '';
    const data = trace.visionDataInfo?.length ? ` ${compactTraceList(trace.visionDataInfo, 2)}` : '';
    return `已传图 ${count}/${total}${limit}${truncated}${data}`;
  }
  if (trace.visionError) return '失败';
  if (trace.hasImages) return '未传图';
  return '无图';
}

export function formatVisionOnlyTrace(
  trace: MediaReplyTrace | null,
  formatTime: (timestamp: number) => string,
): string {
  if (!trace) return '还没有回复 trace。先发图 @ 一句，或跑 /vision test。';
  const sources = trace.imageSourceKinds?.length ? ` ${compactTraceList(trace.imageSourceKinds, 4)}` : '';
  const cacheEvidence = formatVisionCacheEvidence(trace);
  return [
    '最近识图 trace',
    `时间: ${formatTime(trace.timestamp)}`,
    `消息: mid=${trace.messageId} uid=${trace.userId} ${trace.senderName}`,
    `原文: ${trace.rawTextPreview || '[空/媒体消息]'}`,
    `图片: ${trace.hasImages ? `有${trace.imageInputCount ? `(${trace.imageInputCount})` : ''}${sources}` : '无'}`,
    `识图: ${formatVisionTrace(trace)}`,
    cacheEvidence ? `图片缓存: ${cacheEvidence}` : '',
    trace.visionError ? `识图错误: ${trace.visionError}` : '',
    cacheEvidence ? '缓存边界: hit/inline/local-readable 只说明图片源可用或可复用，模型是否真看图以“识图: 已传图”和回复内容为准。' : '',
    '完整链路: /trace last',
  ].filter(Boolean).join('\n');
}

export function formatVisionStatusLastTrace(
  trace: MediaReplyTrace | null,
  formatTime: (timestamp: number) => string,
): string {
  if (!trace) return '最近识图: 暂无回复 trace';
  const parts = [`最近识图: ${formatVisionTrace(trace)}`];
  if (trace.imageInputCount) parts.push(`输入${trace.imageInputCount}`);
  if (trace.imageSourceKinds?.length) parts.push(compactTraceList(trace.imageSourceKinds, 3));
  const cacheEvidence = formatVisionCacheEvidence(trace, 2);
  if (cacheEvidence) parts.push(`缓存${cacheEvidence}`);
  if (trace.visionError) parts.push(`错误${trace.visionError.slice(0, 80)}`);
  parts.push(formatTime(trace.timestamp));
  return parts.join(' / ');
}

export function formatVisionRecentList(
  traces: MediaReplyTrace[],
  totalCount: number,
  maxTraces: number,
  limit = 8,
): string {
  const safeLimit = Math.max(1, Math.min(Math.floor(limit) || 8, maxTraces));
  const selected = traces.slice(0, safeLimit);
  if (selected.length === 0) {
    return [
      '识图最近记录',
      '最近: 无真实图片回复 trace',
      '说明: 只记录直接发图/强触发后的识图处理结果；/vision check 是只读预检，不会写入这里。',
    ].join('\n');
  }
  return [
    `识图最近记录 ${selected.length}/${totalCount}`,
    ...selected.map((trace, index) => {
      const time = new Date(trace.timestamp).toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai' });
      const sources = trace.imageSourceKinds?.length ? ` ${compactTraceList(trace.imageSourceKinds, 4)}` : '';
      const images = trace.hasImages ? `有${trace.imageInputCount ? `(${trace.imageInputCount})` : ''}${sources}` : '无';
      const cache = formatVisionCacheEvidence(trace, 2);
      const error = trace.visionError ? ` error=${trace.visionError.slice(0, 80)}` : '';
      const text = trace.rawTextPreview ? ` | ${trace.rawTextPreview}` : '';
      return `${index + 1}. ${time} mid=${trace.messageId} uid=${trace.userId} ${trace.chatType}=${trace.chatId} 图片=${images} 识图=${formatVisionTrace(trace)}${cache ? ` cache=${cache}` : ''}${error}${text}`;
    }),
    '边界: 这里只读最近图片回复链路，方便排查真实传图数、截断、图片源类型、缓存前后状态、下载失败和模型失败；缓存命中不等于模型已理解图片。',
  ].join('\n');
}

export function formatSttStatusLastTrace(
  trace: MediaReplyTrace | null,
  formatTime: (timestamp: number) => string,
): string {
  if (!trace) return '最近听写: 暂无回复 trace';
  return `最近听写: ${formatRecordTrace(trace)} / ${formatTime(trace.timestamp)}`;
}

export function describeDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:(image\/[^;]+);base64,(.+)$/s);
  if (!match) return 'unknown-size';
  const mime = match[1];
  const rawLength = match[2].replace(/\s+/g, '').length;
  const bytes = Math.floor(rawLength * 3 / 4);
  return `${mime} ${(bytes / 1024 / 1024).toFixed(2)}MB`;
}

export function looksLikeVisibleVisionDescription(text: string): boolean {
  const cleaned = text.replace(/\s+/g, '');
  if (cleaned.length < 8) return false;
  if (/无法查看|无法看到|不能查看|不能看到|没有看到图片|未提供图片|只是文本|作为.*模型|看不到图片/i.test(text)) return false;
  return /图|图片|画面|人物|队标|地图|武器|文字|截图|可见|看到|照片|界面|颜色|场景/.test(text);
}

export function buildVisionStatusDiagnosis(
  config: AIConfig,
  stats: ImageCacheStatsSnapshot,
  apiReady: boolean,
  attachedImages: number,
): string[] {
  const issues: string[] = [];
  const next: string[] = [];
  if (!config.enable_vision) {
    issues.push('识图未开启');
    next.push('把 enable_vision 打开');
  }
  if (!(config.vision_model || config.model)) {
    issues.push('识图模型未配置');
    next.push('配置 vision_model 或 model');
  }
  if (config.enable_vision && !apiReady) {
    issues.push('对话接口不可用');
    next.push('检查 api_url/model/api_key');
  }
  if (stats.lastError) {
    issues.push(`最近图片下载错误: ${stats.lastError}`);
    next.push('先用 /vision test <图片URL> 定位下载还是模型问题');
  }
  const attached = attachedImages > 0
    ? `附图解析: 已拿到${attachedImages}张图片源`
    : '附图解析: 当前消息未附图';
  const diagnosis = issues.length > 0
    ? `诊断: ${issues.join(' / ')}`
    : '诊断: 识图配置看起来能跑';
  const nextLine = next.length > 0
    ? `下一步: ${next.join('；')}`
    : '下一步: /vision test <图片URL> 跑一次端到端链路';
  return [diagnosis, attached, nextLine];
}
