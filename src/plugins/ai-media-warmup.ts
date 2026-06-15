import type { AIConfig } from '../types';
import { inspectImageCacheSources } from './image-cache';
import type { ReplyTrace, VoiceTrace } from './ai-trace-format';
import { previewText } from './reply-postprocess';
import { inspectSttCacheSources } from './stt';
import { inspectVoiceCache } from './tts';

export interface WarmupCandidate {
  value: string;
  preview: string;
  status: string;
  reason: string;
  command: string;
  trace: string;
}

export interface MediaWarmupCandidateSnapshot {
  images: WarmupCandidate[];
  records: WarmupCandidate[];
  voiceTexts: WarmupCandidate[];
  traceCounts: {
    vision: number;
    records: number;
    voice: number;
  };
}

export interface MediaWarmupTraceInput {
  visionTraces: ReplyTrace[];
  replyTraces: ReplyTrace[];
  voiceTraces: VoiceTrace[];
  nowMs?: number;
}

export function commandTextCandidate(text: string): string {
  return (text || '').replace(/\s+/g, ' ').trim().slice(0, 220);
}

export function uniqueWarmupCandidates<T extends { value: string }>(items: T[], limit: number): T[] {
  const seen = new Set<string>();
  const output: T[] = [];
  for (const item of items) {
    const key = item.value.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    output.push(item);
    if (output.length >= limit) break;
  }
  return output;
}

export function warmupTraceLabel(
  timestamp: number,
  messageId: number,
  chatType: string,
  chatId: number,
  nowMs: number = Date.now(),
): string {
  const ageSeconds = Math.max(0, Math.round((nowMs - timestamp) / 1000));
  return `mid=${messageId} ${chatType}=${chatId} age=${ageSeconds}s`;
}

export function buildMediaWarmupCandidates(
  config: AIConfig,
  traces: MediaWarmupTraceInput,
  limit = 5,
): MediaWarmupCandidateSnapshot {
  const safeLimit = Math.max(1, Math.min(Math.floor(limit) || 5, 10));
  const nowMs = traces.nowMs;
  const images = uniqueWarmupCandidates(traces.visionTraces.flatMap((trace) => {
    return (trace.imageSources || []).map((source) => {
      const inspected = inspectImageCacheSources([source], 1)[0];
      return {
        value: source,
        preview: previewText(source, 120),
        status: inspected?.status || 'unknown',
        reason: inspected?.reason || '无图片缓存检查结果',
        command: `/maint warm vision ${source}`,
        trace: warmupTraceLabel(trace.timestamp, trace.messageId, trace.chatType, trace.chatId, nowMs),
      };
    });
  }), safeLimit);

  const records = uniqueWarmupCandidates(traces.replyTraces.flatMap((trace) => {
    return (trace.recordSources || []).map((source) => {
      const inspected = inspectSttCacheSources(config, [source], 1)[0];
      return {
        value: source,
        preview: previewText(source, 120),
        status: inspected?.status || 'unknown',
        reason: inspected?.reason || '无听写缓存检查结果',
        command: `/voice stt ${source}`,
        trace: warmupTraceLabel(trace.timestamp, trace.messageId, trace.chatType, trace.chatId, nowMs),
      };
    });
  }), safeLimit);

  const voiceTexts = uniqueWarmupCandidates(traces.voiceTraces.map((trace) => {
    const text = commandTextCandidate(trace.spokenTextWarm || trace.spokenTextPreview);
    const inspected = text ? inspectVoiceCache(config, [text]).parts[0] : undefined;
    return {
      value: text,
      preview: previewText(text, 120),
      status: inspected?.status || 'invalid',
      reason: inspected?.reason || '没有可预热的短语音文本',
      command: text ? `/maint warm voice ${text}` : '/maint warm voice <常用短句>',
      trace: warmupTraceLabel(trace.timestamp, trace.messageId, trace.chatType, trace.chatId, nowMs),
    };
  }).filter((item) => item.value.length >= 2), safeLimit);

  return {
    images,
    records,
    voiceTexts,
    traceCounts: {
      vision: traces.visionTraces.length,
      records: traces.replyTraces.filter((trace) => (trace.recordSources || []).length > 0).length,
      voice: traces.voiceTraces.length,
    },
  };
}
