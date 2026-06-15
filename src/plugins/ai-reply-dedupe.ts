import { sanitizeOutgoingText } from '../message-sanitize';

const sessionRecentOpeners: Map<string, string[]> = new Map();
const sessionRecentReplies: Map<string, string[]> = new Map();

export function extractReplyOpener(text: string): string {
  const normalized = sanitizeOutgoingText(text)
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return '';
  const first = normalized.split(/[，,。！？!?；;\s]/).find(Boolean) || normalized;
  return first.slice(0, 12);
}

export function openerFamily(opener: string): string {
  const key = opener.toLowerCase().replace(/[\s，,。！？!?；;、]/g, '');
  if (!key) return '';
  if (/^(?:不是哥们|哥们|兄弟们?|家人们|老哥|兄弟)$/.test(key)) return 'address';
  if (/^(?:先别急|等一下|等等|先等等|别急|稍等)$/.test(key)) return 'pause';
  if (/^(?:讲道理|说实话|有一说一|确实|怎么说|我只能说)$/.test(key)) return 'hedge';
  if (/^(?:可以|可以的|有点东西|这波|这波有说法|有说法|有点抽象)$/.test(key)) return 'catchphrase';
  if (/^(?:我看|看了一眼|简单说两句|先说正事)$/.test(key)) return 'assistanty';
  return '';
}

export function shouldDedupeOpener(before: string, recent: string[]): boolean {
  if (!before) return false;
  const family = openerFamily(before);
  const repeatedExact = recent.includes(before);
  const repeatedFamily = !!family && recent.some((item) => openerFamily(item) === family);
  return (repeatedExact || repeatedFamily) && /^(?:可以(?:的)?|这波(?:有说法)?|有点东西|有一说一|先别急|等一下|等等|先等等|别急|讲道理|说实话|确实|怎么说|啊|我看|看了一眼|简单说两句|有点抽象|不是哥们|哥们|兄弟们?|家人们|老哥|兄弟|我只能说)$/.test(before);
}

export function dedupeSessionOpener(sessionId: string, text: string): {
  text: string;
  before: string;
  after: string;
  deduped: boolean;
  recent: string[];
} {
  const recent = sessionRecentOpeners.get(sessionId) || [];
  const before = extractReplyOpener(text);
  let next = text;
  let deduped = false;
  if (shouldDedupeOpener(before, recent)) {
    const pattern = new RegExp(`^\\s*${before.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[，,。!！?？\\s]*`);
    const stripped = next.replace(pattern, '').trimStart();
    if (stripped.length >= 2) {
      next = stripped;
      deduped = true;
    }
  }
  const after = extractReplyOpener(next);
  const updated = after ? [after, ...recent.filter((item) => item !== after)].slice(0, 3) : recent.slice(0, 3);
  sessionRecentOpeners.set(sessionId, updated);
  return { text: next, before, after, deduped, recent: updated };
}

/** 标准化 bot 回复用于全句去重比较 */
export function normalizeForReplyDedup(text: string): string {
  return sanitizeOutgoingText(text)
    .toLowerCase()
    .replace(/\[(?:face|表情|emoji|qq)[:：]\d+\]/gi, '')
    .replace(/[\s，。！？,.!?；;、]/g, '')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}]/gu, '')
    .slice(0, 80);
}

export function similarityRatio(a: string, b: string): number {
  if (!a || !b) return 0;
  const shorter = a.length < b.length ? a : b;
  const longer = a.length < b.length ? b : a;
  if (!shorter) return 0;
  if (longer.includes(shorter)) return shorter.length / Math.max(1, longer.length);
  const grams = new Set<string>();
  for (let i = 0; i <= shorter.length - 2; i++) grams.add(shorter.slice(i, i + 2));
  if (grams.size === 0) return shorter === longer ? 1 : 0;
  let hits = 0;
  for (let i = 0; i <= longer.length - 2; i++) {
    if (grams.has(longer.slice(i, i + 2))) hits++;
  }
  return hits / Math.max(1, grams.size);
}

/** 检查 bot 这句和最近 5 条是否重复 */
export function isRecentReplyDuplicate(sessionId: string, text: string): boolean {
  const norm = normalizeForReplyDedup(text);
  if (!norm || norm.length < 6) return false;
  const recent = sessionRecentReplies.get(sessionId) || [];
  for (const past of recent) {
    if (!past) continue;
    // 完全相同 = 重复
    if (past === norm) return true;
    // 一方包含另一方 80% 以上 = 实质重复
    const shorter = past.length < norm.length ? past : norm;
    const longer = past.length < norm.length ? norm : past;
    if (shorter.length >= 8 && longer.includes(shorter)) return true;
    if (shorter.length >= 12 && similarityRatio(shorter, longer) >= 0.82) return true;
  }
  return false;
}

/** 记录 bot 最近回复 */
export function recordRecentReply(sessionId: string, text: string): void {
  const norm = normalizeForReplyDedup(text);
  if (!norm) return;
  const recent = sessionRecentReplies.get(sessionId) || [];
  recent.unshift(norm);
  if (recent.length > 5) recent.length = 5;
  sessionRecentReplies.set(sessionId, recent);
}

export function clearReplyDedupeSession(sessionId: string): void {
  sessionRecentOpeners.delete(sessionId);
  sessionRecentReplies.delete(sessionId);
}

export function clearReplyDedupeState(): void {
  sessionRecentOpeners.clear();
  sessionRecentReplies.clear();
}

export function pruneReplyDedupeSessions(maxSessions: number = 200): { openers: number; replies: number } {
  let openers = 0;
  let replies = 0;
  if (sessionRecentOpeners.size > maxSessions) {
    const keys = [...sessionRecentOpeners.keys()].slice(0, sessionRecentOpeners.size - maxSessions);
    for (const key of keys) {
      sessionRecentOpeners.delete(key);
      openers++;
    }
  }
  if (sessionRecentReplies.size > maxSessions) {
    const keys = [...sessionRecentReplies.keys()].slice(0, sessionRecentReplies.size - maxSessions);
    for (const key of keys) {
      sessionRecentReplies.delete(key);
      replies++;
    }
  }
  return { openers, replies };
}
