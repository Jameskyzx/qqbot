import type { AIConfig } from '../types';
import { normalizeForReplyDedup } from './ai-reply-dedupe';
import * as crypto from 'crypto';

export interface InFlightReplyResult {
  value: string;
  reusable: boolean;
  reuseRejectedReason?: string;
}

export interface ReplyReusableJob {
  senderName: string;
  groupId?: number;
  userId: number;
  messageId: number;
}

export interface ReplyCacheKeyInspection {
  cached?: { value: string; expiresAt: number };
  ttlMs: number;
  state: 'bypass' | 'in-flight' | 'hit' | 'expired' | 'miss';
  keyState: string;
}

export interface ReplyCachePoolSnapshot {
  configuredTtl: number;
  maxEntries: number;
  entries: number;
  fresh: number;
  expired: number;
  inFlight: number;
  hits: number;
  misses: number;
  bypasses: number;
  policyTop: string[];
  ttlSeconds: number[];
}

export interface ReplyCacheStatsSnapshot {
  entries: number;
  maxEntries: number;
  inFlight: number;
  hits: number;
  misses: number;
  bypasses: number;
  policyTop: string[];
}

const replyCache: Map<string, { value: string; expiresAt: number }> = new Map();
const replyInFlight: Map<string, Promise<InFlightReplyResult>> = new Map();
const replyCacheBypassMessages = new Set<number>();
const replyCachePolicyMessages = new Set<number>();
const replyCachePolicyCounts: Map<string, number> = new Map();

let replyCacheHits = 0;
let replyCacheMisses = 0;
let replyCacheBypasses = 0;
let replyCacheMaxEntries = 300;

export function normalizeCacheCharacters(text: string): string {
  return Array.from(text).map((char) => {
    const code = char.charCodeAt(0);
    if (code >= 0xff01 && code <= 0xff5e) return String.fromCharCode(code - 0xfee0);
    return char;
  }).join('');
}

export function stripCacheAddressPrefix(text: string): string {
  let next = text;
  for (let i = 0; i < 3; i++) {
    const before = next;
    next = next
      .replace(/^\s*(?:(?:@|＠)\s*)?(?:机器人|bot|qqbot|小助手|玩机器|机器|machinewjq|machine|6657)(?=$|[\s,，:：、.!！?？\-])[\s,，:：、.!！?？\-]*/i, '')
      .replace(/^\s*(?:@|＠)[A-Za-z0-9_\-\u4e00-\u9fa5]{1,24}(?=$|[\s,，:：、.!！?？\-])[\s,，:：、.!！?？\-]*/i, '');
    if (next === before) break;
  }
  return next;
}

export function normalizeCacheText(text: string): string {
  const normalized = stripCacheAddressPrefix(normalizeCacheCharacters(text)
    .replace(/\[CQ:at,[^\]]+\]/gi, ' ')
    .replace(/[\u00a0\u3000]/g, ' ')
    .trim())
    .replace(/[？?]+/g, '?')
    .replace(/[！!]+/g, '!')
    .replace(/[。\.]{2,}/g, '.')
    .replace(/[，,]{2,}/g, ',')
    .replace(/、{2,}/g, '、')
    .replace(/[；;]{2,}/g, ';')
    .replace(/\s+/g, ' ')
    .replace(/[\s,，:：、.!！?？;；\-]+$/g, '')
    .trim()
    .toLowerCase();
  return normalized.slice(0, 500);
}

export function makeStableKnowledgeSignature(styleKnowledge: string, topicKnowledge: string, knowledgeTitles: string[]): string {
  return [
    knowledgeTitles.join('|'),
    normalizeForReplyDedup(styleKnowledge).slice(0, 160),
    normalizeForReplyDedup(topicKnowledge).slice(0, 220),
  ].join('\n');
}

export function makeReplyCacheKey(config: AIConfig, text: string, knowledgeSignature: string, cacheScope: string = ''): string {
  return crypto
    .createHash('sha1')
    .update([
      config.model,
      config.active_preset,
      config.persona_mode || '',
      config.aggression_level || '',
      cacheScope,
      normalizeCacheText(text),
      knowledgeSignature.slice(0, 500),
    ].join('\n'))
    .digest('hex')
    .slice(0, 24);
}

export function replyCacheKeyPrefix(key: string): string {
  return key ? key.slice(0, 8) : '';
}

export function clampReplyCacheMaxEntries(value?: number): number {
  const next = Math.floor(Number(value) || 300);
  return Math.max(20, Math.min(5000, Number.isFinite(next) ? next : 300));
}

export function configureReplyCache(maxEntries?: number): number {
  replyCacheMaxEntries = clampReplyCacheMaxEntries(maxEntries);
  pruneReplyCache(replyCacheMaxEntries);
  return replyCacheMaxEntries;
}

export function getCachedReply(key: string, now: number = Date.now()): string | null {
  const cached = replyCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= now) {
    replyCache.delete(key);
    return null;
  }
  replyCache.delete(key);
  replyCache.set(key, cached);
  replyCacheHits++;
  return cached.value;
}

export function deleteCachedReply(key: string): boolean {
  return replyCache.delete(key);
}

export function pruneReplyCache(maxEntries: number = replyCacheMaxEntries, now: number = Date.now()): void {
  const safeMax = clampReplyCacheMaxEntries(maxEntries);
  for (const [key, cached] of replyCache) {
    if (cached.expiresAt <= now) replyCache.delete(key);
  }
  while (replyCache.size > safeMax) {
    const oldest = replyCache.keys().next().value;
    if (!oldest) break;
    replyCache.delete(oldest);
  }
}

export function setCachedReply(key: string, value: string, ttlSeconds: number, maxEntries?: number): void {
  if (ttlSeconds <= 0 || !value) return;
  replyCacheMaxEntries = clampReplyCacheMaxEntries(maxEntries ?? replyCacheMaxEntries);
  pruneReplyCache(replyCacheMaxEntries - 1);
  replyCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
  pruneReplyCache(replyCacheMaxEntries);
}

export function setReplyCacheEntryForTests(key: string, value: string, ttlMs: number): void {
  replyCache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}

export function inspectReplyCacheKey(key: string, now: number = Date.now()): ReplyCacheKeyInspection {
  if (!key) return { ttlMs: 0, state: 'bypass', keyState: 'bypass' };
  const cached = replyCache.get(key);
  const ttlMs = cached ? cached.expiresAt - now : 0;
  if (replyInFlight.has(key)) return { cached, ttlMs, state: 'in-flight', keyState: 'in-flight' };
  if (cached && ttlMs > 0) {
    return { cached, ttlMs, state: 'hit', keyState: `hit ttl${Math.ceil(ttlMs / 1000)}s` };
  }
  if (cached) return { cached, ttlMs, state: 'expired', keyState: 'expired' };
  return { ttlMs: 0, state: 'miss', keyState: 'miss' };
}

export function isReplyReusableForCache(text: string, job: ReplyReusableJob): boolean {
  if (!text) return false;
  const compact = text.replace(/\s+/g, '');
  if (!compact) return false;
  if (job.senderName && job.senderName.length >= 2 && compact.includes(job.senderName.replace(/\s+/g, ''))) return false;
  if (job.groupId && compact.includes(String(job.groupId))) return false;
  if (compact.includes(String(job.userId)) || compact.includes(String(job.messageId))) return false;
  if (/(?:你刚才|你上一句|上面那句|前面那条|刚刚你|这个人|他刚才|她刚才)/.test(text)) return false;
  return true;
}

export function getInFlightReply(key: string): Promise<InFlightReplyResult> | null {
  const pending = replyInFlight.get(key);
  if (!pending) return null;
  replyCacheHits++;
  return pending;
}

export function setInFlightReply(key: string, pending: Promise<InFlightReplyResult>): void {
  const tracked = pending.finally(() => {
    if (replyInFlight.get(key) === tracked) {
      replyInFlight.delete(key);
    }
  });
  replyInFlight.set(key, tracked);
}

export function recordReplyCacheMiss(): void {
  replyCacheMisses++;
}

export function recordReplyCachePolicy(messageId: number, cachePolicy: string): void {
  if (!cachePolicy) return;
  if (!replyCachePolicyMessages.has(messageId)) {
    replyCachePolicyMessages.add(messageId);
    replyCachePolicyCounts.set(cachePolicy, (replyCachePolicyCounts.get(cachePolicy) || 0) + 1);
  }
  if (/^off\b/.test(cachePolicy) && !replyCacheBypassMessages.has(messageId)) {
    replyCacheBypassMessages.add(messageId);
    replyCacheBypasses++;
  }
}

export function compactReplyCachePolicyStats(maxItems: number = 6): string[] {
  return [...replyCachePolicyCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'))
    .slice(0, maxItems)
    .map(([policy, count]) => `${policy}=${count}`);
}

export function getReplyCacheStats(policyTopLimit: number = 6): ReplyCacheStatsSnapshot {
  return {
    entries: replyCache.size,
    maxEntries: replyCacheMaxEntries,
    inFlight: replyInFlight.size,
    hits: replyCacheHits,
    misses: replyCacheMisses,
    bypasses: replyCacheBypasses,
    policyTop: compactReplyCachePolicyStats(policyTopLimit),
  };
}

export function getReplyCachePoolSnapshot(configuredTtl: number, policyTopLimit: number = 8, now: number = Date.now()): ReplyCachePoolSnapshot {
  const entries = [...replyCache.values()];
  const fresh = entries.filter((entry) => entry.expiresAt > now);
  const expired = entries.length - fresh.length;
  const ttlSeconds = fresh
    .map((entry) => Math.max(0, Math.ceil((entry.expiresAt - now) / 1000)))
    .sort((a, b) => a - b);
  return {
    configuredTtl,
    maxEntries: replyCacheMaxEntries,
    entries: replyCache.size,
    fresh: fresh.length,
    expired,
    inFlight: replyInFlight.size,
    hits: replyCacheHits,
    misses: replyCacheMisses,
    bypasses: replyCacheBypasses,
    policyTop: compactReplyCachePolicyStats(policyTopLimit),
    ttlSeconds,
  };
}

export function pruneExpiredReplyCache(now: number = Date.now()): {
  before: number;
  fresh: number;
  expired: number;
  removed: number;
  after: number;
  inFlight: number;
} {
  const before = replyCache.size;
  let fresh = 0;
  let expired = 0;
  for (const [, cached] of replyCache) {
    if (cached.expiresAt > now) fresh++;
    else expired++;
  }
  pruneReplyCache(replyCacheMaxEntries, now);
  return {
    before,
    fresh,
    expired,
    removed: before - replyCache.size,
    after: replyCache.size,
    inFlight: replyInFlight.size,
  };
}

export function resetReplyCacheRuntime(): void {
  replyCache.clear();
  replyInFlight.clear();
  replyCacheHits = 0;
  replyCacheMisses = 0;
  replyCacheBypasses = 0;
  replyCacheMaxEntries = 300;
  replyCacheBypassMessages.clear();
  replyCachePolicyMessages.clear();
  replyCachePolicyCounts.clear();
}
