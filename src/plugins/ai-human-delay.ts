import type { AIConfig } from '../types';
import * as crypto from 'crypto';

export interface HumanReplyDelayJob {
  sessionId: string;
  messageId: number;
  userId: number;
  createdAt: number;
  forced: boolean;
  hasImages: boolean;
  hasRecords: boolean;
  forceVoice: boolean;
}

export type HumanReplyDelayBypassReason =
  | 'disabled'
  | 'blank'
  | 'stale'
  | 'media'
  | 'voice'
  | 'zero-range';

export interface HumanReplyDelayDecision {
  ms: number;
  min: number;
  max: number;
  reason?: HumanReplyDelayBypassReason;
  jitter?: number;
  lengthBias?: number;
}

export interface HumanReplyDelayOptions {
  nowMs?: number;
  staleAfterMs?: number;
}

function finiteNumber(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? Number(value) : fallback;
}

export function getHumanReplyDelayRange(config: AIConfig, forced: boolean): { min: number; max: number } {
  const minRaw = forced
    ? finiteNumber(config.human_reply_delay_forced_min_ms, 120)
    : finiteNumber(config.human_reply_delay_min_ms, 250);
  const maxRaw = forced
    ? finiteNumber(config.human_reply_delay_forced_max_ms, 650)
    : finiteNumber(config.human_reply_delay_max_ms, 1400);
  const minFloor = Math.floor(minRaw);
  const maxFloor = Math.floor(maxRaw);
  const min = Math.max(0, Math.min(minFloor, maxFloor));
  const max = Math.max(min, Math.max(minFloor, maxFloor));
  return { min, max };
}

export function hashHumanDelaySeed(job: HumanReplyDelayJob, text: string): number {
  const digest = crypto
    .createHash('sha1')
    .update([
      job.sessionId,
      job.messageId,
      job.userId,
      job.createdAt,
      text.slice(0, 80),
    ].join(':'))
    .digest();
  return digest.readUInt32BE(0);
}

export function decideHumanReplyDelay(
  config: AIConfig,
  job: HumanReplyDelayJob,
  text: string,
  options: HumanReplyDelayOptions = {},
): HumanReplyDelayDecision {
  const { min, max } = getHumanReplyDelayRange(config, job.forced);
  if (config.human_reply_delay_enabled === false) return { ms: 0, min, max, reason: 'disabled' };
  if (!text.trim()) return { ms: 0, min, max, reason: 'blank' };

  const nowMs = options.nowMs ?? Date.now();
  const staleAfterMs = options.staleAfterMs ?? 2500;
  if (nowMs - job.createdAt > staleAfterMs) return { ms: 0, min, max, reason: 'stale' };
  if (job.hasImages || job.hasRecords) return { ms: 0, min, max, reason: 'media' };
  if (job.forceVoice) return { ms: 0, min, max, reason: 'voice' };
  if (max <= 0) return { ms: 0, min, max, reason: 'zero-range' };

  const span = max - min + 1;
  const lengthBias = Math.min(Math.floor(span * 0.35), Math.max(0, text.length - 24) * 7);
  const jitter = hashHumanDelaySeed(job, text) % span;
  return {
    ms: Math.min(max, min + jitter + lengthBias),
    min,
    max,
    jitter,
    lengthBias,
  };
}

export function calculateHumanReplyDelayMs(
  config: AIConfig,
  job: HumanReplyDelayJob,
  text: string,
  options: HumanReplyDelayOptions = {},
): number {
  return decideHumanReplyDelay(config, job, text, options).ms;
}
