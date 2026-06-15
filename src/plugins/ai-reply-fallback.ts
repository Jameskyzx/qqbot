import type { ChatMessage } from './llm-api';

export interface FallbackReplyJob {
  hasRecords: boolean;
  hasImages: boolean;
  effectiveText: string;
  rawText?: string;
  messageId?: number;
  userId?: number;
}

export interface ApiNotReadyReplyContext {
  command?: string | null;
  isReplyToBot?: boolean;
  isPrivate?: boolean;
}

const DIRECT_AI_COMMANDS = new Set(['ai', 'ask', 'chat', 'talk', '问', '聊', '对话']);

function compactText(text: string): string {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function stableIndex(seed: string, size: number): number {
  if (size <= 1) return 0;
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) % size;
}

function pickStable(items: string[], seed: string): string {
  return items[stableIndex(seed, items.length)] || items[0] || '';
}

export function buildForcedFallbackReply(job: FallbackReplyJob, recordTranscripts: string[] = []): string {
  const transcripts = recordTranscripts.map(compactText).filter(Boolean);
  if (transcripts.length > 0) {
    return `我听到大概是「${transcripts.join(' ').slice(0, 80)}」 但刚才没接稳 你补一句想问啥`;
  }
  if (job.hasRecords && !compactText(job.effectiveText)) {
    return '语音收到了 但这下没听稳 你补句文字我接';
  }
  if (job.hasImages && !compactText(job.effectiveText)) {
    return '图收到了 但这下没看稳 你指一下看哪块';
  }
  const fallbacks = [
    '刚才卡了一拍 你再问一句',
    '这条我没接稳 再甩一下',
    '我刚才断了一下 你重新说',
    '这波信息没吃全 你补一下',
    '等下 我刚才没跟上 你再来一句',
    '这下掉了一拍 你把问题再丢一次',
    '没接住 你换个说法再问',
    '刚才那下糊了 你重发我接',
  ];
  return pickStable(fallbacks, [
    job.messageId ?? '',
    job.userId ?? '',
    job.rawText || job.effectiveText || '',
    job.hasImages ? 'img' : '',
    job.hasRecords ? 'rec' : '',
  ].join(':'));
}

export function buildApiNotReadyChatReply(ctx: ApiNotReadyReplyContext): string {
  const direct = [
    '我这边线还没接稳 先别上强度',
    '等一下 我这边还没热起来',
    '这波我没连上 等我缓一手',
    '先停一拍 我这边没连上',
  ];
  const reply = [
    '我刚才那下没续上 你换个角度再追一句',
    '这条我现在接不稳 等我缓过来再打',
    '刚才那波断节奏了 先别急',
  ];
  const privateLines = [
    '我这边还没接稳 等会儿再聊',
    '先别硬拷问我 我这边现在没续上',
    '这下没连上 等我回口血',
  ];
  const seed = [ctx.command || '', ctx.isReplyToBot ? 'reply' : '', ctx.isPrivate ? 'private' : ''].join(':');
  if (ctx.command && DIRECT_AI_COMMANDS.has(ctx.command)) {
    return pickStable(direct, seed || 'direct');
  }
  if (ctx.isReplyToBot) {
    return pickStable(reply, seed || 'reply');
  }
  if (ctx.isPrivate) {
    return pickStable(privateLines, seed || 'private');
  }
  return pickStable(direct, seed || 'default');
}

export function buildForcedApiFailureReply(
  job: FallbackReplyJob,
  _errMsg: string,
  recordTranscripts: string[] = [],
): string {
  return buildForcedFallbackReply(job, recordTranscripts);
}

export function looksLikeInactiveActivationReply(text: string): boolean {
  const compact = text.replace(/\s+/g, '').toLowerCase();
  if (!compact) return false;
  if (compact.length > 180 && !/(未激活|未触发|不需要回复|无需回复|没有被激活|notactivated|inactive)/i.test(compact)) {
    return false;
  }
  return /未激活回答|未激活回复|未触发|未被触发|没有被激活|当前消息未激活|不需要回复|无需回复|不予回复|notactivated|inactive/.test(compact);
}

export function buildInactiveActivationRetryMessages(messages: ChatMessage[], badReply: string): ChatMessage[] {
  return [
    ...messages,
    { role: 'assistant', content: badReply || '未激活回答' },
    {
      role: 'user',
      content: [
        '纠正：你已经被当前这条消息触发了，必须正常接话。',
        '不要再说“未激活回答/未触发/无需回复/不需要回复”。',
        '直接按当前消息和上下文回复，短一点，像直播间接弹幕。',
      ].join('\n'),
    },
  ];
}
