import type { ChatMessage } from './llm-api';
import { detectCsTopicQuery } from './fuzzy-command';

export interface StoredMessageMeta {
  mid: number;
  uid: number;
  name: string;
  text: string;
}

export interface FocusedHistoryJob {
  userId: number;
  repliedMessageId?: number;
  effectiveText: string;
  hasImages: boolean;
  hasRecords: boolean;
  contextMessages: ChatMessage[];
}

export function parseStoredMessageMeta(message: ChatMessage): StoredMessageMeta | null {
  if (message.role !== 'user' || typeof message.content !== 'string') return null;
  const match = message.content.match(/^\[mid=(\d+)\s+uid=(\d+)\]\s*([^:：\n]{1,32})[:：]\s*([\s\S]*)$/);
  if (!match) return null;
  return {
    mid: Number(match[1]),
    uid: Number(match[2]),
    name: match[3],
    text: match[4] || '',
  };
}

export function cleanHistoryMessage(message: ChatMessage): ChatMessage {
  if (message.role !== 'user' || typeof message.content !== 'string') return message;
  const meta = parseStoredMessageMeta(message);
  const cleaned = meta ? `${meta.name}: ${meta.text}` : message.content.replace(/^\[mid=\d+\s+uid=\d+\]\s*/, '');
  return { role: message.role, content: cleaned };
}

export function normalizeMemoryDuplicateText(text: string): string {
  return (text || '')
    .replace(/^\[mid=\d+\s+uid=\d+\]\s*/, '')
    .replace(/^[^:：\n]{1,32}[:：]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeMemoryRiskText(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/^\[mid=\d+\s+uid=\d+\]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const REALTIME_MEMORY_QUERY_RE = /(?:最新|现在|当前|目前|今天|今日|今晚|昨天|昨晚|刚才|刚刚|最近|近期|本周|这周|本月|这两天|这几天|实时|现况|状态|表现|赛程|赛果|战报|比分|排名|排行|阵容|转会|加入|离队|替补|match\s*id|matchid|hltv|vrs|rating|adr|kast|k\/?d|数据|谁c|谁C|谁赢|赢了|输了|第几|第一|top\s*\d*)/i;
const CS_MEMORY_CONTEXT_RE = /(?:\bcs(?:2|go)?\b|hltv|vrs|major|iem|blast|esl|epl|pgl|cct|valve|战队|队伍|选手|阵容|赛程|赛果|比分|地图池|赛事|navi|natus\s*vincere|vitality|spirit|faze|mouz|g2|falcons|astralis|liquid|furia|heroic|mongolz|tyloo|lynn|cloud9|complexity|virtus\s*pro|ence|fnatic|3dmax|pain|zywoo|donk|niko|m0nesy|s1mple|ropz|sh1ro|magixx|jl|b1t|hunter|huNter|aleksib|karrigan|device|broky|frozen|apex|mezii|flamez|jimpphat|siuhy|kscerato|yuurih|cadian|mirage|inferno|nuke|ancient|anubis|dust2|train|overpass)/i;
const CS_TIME_SENSITIVE_MEMORY_RE = /(?:最新|现在|当前|目前|今天|今日|今晚|昨天|昨晚|刚才|刚刚|最近|近期|排名|排行|第[一二三四五六七八九十\d]+|第一|top\s*\d*|阵容|转会|加入|离队|替补|租借|官宣|爆料|传闻|赛果|比分|赢了|输了|击败|战胜|rating|adr|kast|k\/?d|数据|状态|表现|首发|替补|地图池|版本|胜率|match\s*id|matchid)/i;

export function isRealtimeMemoryQuery(text: string, csRealtimeIntent = false): boolean {
  const clean = normalizeMemoryRiskText(text);
  if (!clean) return false;
  if (csRealtimeIntent) return true;
  if (REALTIME_MEMORY_QUERY_RE.test(clean) && CS_MEMORY_CONTEXT_RE.test(clean)) return true;
  const csTopic = detectCsTopicQuery(clean);
  return csTopic.needsMatches || csTopic.needsRanking || csTopic.needsResults;
}

export function classifyMemoryTruthRisk(query: string, memoryText: string, csRealtimeIntent = false): string | null {
  if (!isRealtimeMemoryQuery(query, csRealtimeIntent)) return null;
  const memory = normalizeMemoryRiskText(memoryText);
  if (!memory) return null;
  if (!CS_MEMORY_CONTEXT_RE.test(memory)) return null;
  if (!CS_TIME_SENSITIVE_MEMORY_RE.test(memory)) return null;
  return '旧CS实时事实';
}

export function filterMemoryTruthRisk<T extends { text: string }>(
  query: string,
  memories: T[],
  csRealtimeIntent = false,
): { kept: T[]; filtered: T[]; reasons: string[] } {
  const kept: T[] = [];
  const filtered: T[] = [];
  const reasons: string[] = [];
  for (const memory of memories) {
    const reason = classifyMemoryTruthRisk(query, memory.text, csRealtimeIntent);
    if (reason) {
      filtered.push(memory);
      if (reasons.length < 4) reasons.push(reason);
    } else {
      kept.push(memory);
    }
  }
  return {
    kept,
    filtered,
    reasons: [...new Set(reasons)],
  };
}

export function formatMemoryAge(seconds: number | undefined): string {
  const value = Math.max(0, Math.floor(seconds || 0));
  if (value < 60) return `${value}s`;
  if (value < 3600) return `${Math.round(value / 60)}m`;
  if (value < 86400) return `${Math.round(value / 3600)}h`;
  return `${Math.round(value / 86400)}d`;
}

export function hasTokenOverlap(a: string, b: string): boolean {
  const tokens = (a.toLowerCase().match(/[\u4e00-\u9fa5]{2,8}|[a-z0-9]{2,16}/g) || [])
    .filter((token) => token.length >= 2)
    .slice(0, 20);
  if (tokens.length === 0) return false;
  const haystack = b.toLowerCase();
  let hits = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) hits++;
    if (hits >= 2) return true;
  }
  return hits >= 1 && tokens.length <= 3;
}

export function buildFocusedHistory(job: FocusedHistoryJob, sendLimit: number): { history: ChatMessage[]; focused: boolean } {
  const messages = job.contextMessages.slice(0, -1);
  if (messages.length <= sendLimit) {
    return { history: messages.map(cleanHistoryMessage), focused: false };
  }

  const scored = messages.map((message, index) => {
    const meta = parseStoredMessageMeta(message);
    const content = typeof message.content === 'string' ? message.content : '';
    let score = index / Math.max(1, messages.length);
    if (index >= messages.length - Math.ceil(sendLimit * 0.55)) score += 6;
    if (message.role === 'assistant') score += 2.5;
    if (meta) {
      if (meta.uid === job.userId) score += 6;
      if (job.repliedMessageId && meta.mid === job.repliedMessageId) score += 18;
      if (job.effectiveText && meta.text && hasTokenOverlap(job.effectiveText, meta.text)) score += 4;
    }
    if (job.hasImages && /\[图片\]|含\d+张图/.test(content)) score += 2;
    if (job.hasRecords && /\[语音\]|含\d+条语音/.test(content)) score += 2;
    return { message, index, score };
  });

  const keep = Math.max(4, sendLimit);
  const selected = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, keep)
    .sort((a, b) => a.index - b.index)
    .map((item) => cleanHistoryMessage(item.message));
  return { history: selected, focused: true };
}
