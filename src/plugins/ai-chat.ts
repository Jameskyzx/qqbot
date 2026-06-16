import { Plugin, PluginContext, AIConfig, MessageEvent, MessageSegment } from '../types';
import { Bot } from '../bot';
import { hasUsableApiKey } from '../config';
import { cleanSearchCache, configureSearchCache, webSearch } from './web-search';
import { cleanVoiceCache, generateVoice, getVoiceStats, installVoiceSample, removeVoiceSample } from './tts';
import { cleanSttCache, getSttStats, transcribeRecords } from './stt';
import { cleanupCache as cleanImageCache, configureImageCache, getCacheStats as getImageCacheStats, getImageDataUrl, inspectImageCacheSources } from './image-cache';
import { configureGates, getGateStats, resetGates, withGate } from './concurrency';
import { createLogger } from '../logger';
import { detectFuzzyCommand, detectCsTopicQuery } from './fuzzy-command';
import {
  DIRECT_AI_COMMANDS,
  DIRECT_MEDIA_COMMANDS,
  DIRECT_SEARCH_COMMANDS,
  DIRECT_VISION_COMMANDS,
  extractCsMatchDetailId,
  isStableCsTacticalQuery,
  shouldReply,
  shouldSearch,
} from './ai-trigger-policy';
import {
  extractEvidenceLines,
  extractRealtimeFreshnessLines,
  summarizeRealtimeEvidence,
} from './ai-evidence';
import { buildApiMessages } from './ai-message-builders';
import {
  classifyAudioSource,
  classifyImageSource,
  compactTraceList,
  compactVisionCacheInspect,
  buildVisionStatusDiagnosis,
  describeDataUrl,
  formatRecordTrace,
  formatSttStatusLastTrace as formatSttStatusLastTracePanel,
  formatVisionOnlyTrace as formatVisionOnlyTracePanel,
  formatVisionCacheEvidence,
  formatVisionRecentList,
  formatVisionStatusLastTrace as formatVisionStatusLastTracePanel,
  formatVisionTrace,
  imageSegmentCount,
  looksLikeVisibleVisionDescription,
  summarizeAudioSourceKinds,
  summarizeImageSourceKinds,
} from './ai-media-trace';
import {
  buildEvidenceLedger,
  cloneReplyTrace,
  formatReplyRecentList,
  formatReplyTrace,
  formatTraceTime,
  formatVoiceRecentList,
  formatVoiceTrace,
  type ReplyTrace,
  type VoiceTrace,
} from './ai-trace-format';
import {
  countMediaRunsForDay,
  formatMediaDailyPanel,
  formatMediaLatestVoiceTrace,
  formatMediaStatusPanel,
  formatTodayMediaRuns,
  getShanghaiDayParts,
} from './ai-media-status';
import {
  buildMediaWarmupCandidates,
  type MediaWarmupCandidateSnapshot,
  type WarmupCandidate,
} from './ai-media-warmup';
import {
  formatMediaCacheWarm,
  formatMediaPreflight,
  formatVisionCacheWarm,
  formatVisionPreflight,
} from './ai-media-preflight';
import {
  formatStyleQualityPreflight as formatStyleQualityPreflightPanel,
  parseStyleCheckArgs as parseStyleCheckCommandArgs,
} from './ai-style-preflight';
import { formatSttEndToEndTest } from './ai-stt-end-to-end';
import { resolveVisionDataUrls as resolveVisionDataUrlsWithResolver } from './ai-vision-data-url-resolver';
import {
  buildVoicePreflightAnalysis,
  formatSttCachePreflight,
  formatVoiceCachePreflight,
  formatVoicePreflight,
  formatVoiceStatusPanel as formatVoiceStatusPanelFromDiagnostics,
  hasVoiceIdentityBoundaryRisk,
  VOICE_CLONE_BOUNDARY_LINE,
  type VoicePreflightAnalysis,
} from './ai-voice-diagnostics';
import { formatVoiceCacheWarm } from './ai-voice-cache-warm';
import {
  extractMediaCheckSources,
  extractVisionCheckSources,
  traceWarmupSources,
} from './ai-media-sources';
export {
  formatReplyCachePoolStatus,
  formatReplyCachePreflight,
  pruneExpiredReplyCacheForMaintenance,
} from './ai-reply-cache-admin';
import {
  clearReplyDedupeSession,
  clearReplyDedupeState,
  dedupeSessionOpener,
  isRecentReplyDuplicate,
  pruneReplyDedupeSessions,
  recordRecentReply,
} from './ai-reply-dedupe';
import {
  configureReplyCache,
  deleteCachedReply,
  getCachedReply,
  getInFlightReply,
  getReplyCacheStats,
  inspectReplyCacheKey,
  isReplyReusableForCache,
  makeReplyCacheKey,
  normalizeCacheText,
  pruneReplyCache,
  recordReplyCacheMiss,
  recordReplyCachePolicy,
  replyCacheKeyPrefix,
  resetReplyCacheRuntime,
  setCachedReply,
  setInFlightReply,
  setReplyCacheEntryForTests,
  type InFlightReplyResult,
} from './ai-reply-cache-runtime';
import {
  buildApiNotReadyChatReply,
  buildForcedApiFailureReply,
  buildInactiveActivationRetryMessages,
  looksLikeInactiveActivationReply,
} from './ai-reply-fallback';
import {
  formatKnowledgeFreshnessIssueList,
  formatKnowledgeFreshnessTraceItems,
  formatKnowledgeLaneSummary,
} from './ai-knowledge-route';
import {
  buildKnowledgeRoutePreview,
  formatKnowledgeRoutePreview,
} from './ai-knowledge-route-runtime';
import { runKnowledgeRefresh } from './ai-knowledge-refresh-runtime';
import {
  formatKnowledgeCandidateAdvice,
  formatKnowledgeFreshnessReport,
  formatKnowledgeInboxReport,
  formatKnowledgeResults,
  formatKnowledgeSourcesReport,
  formatKnowledgeSourceTrustPreview,
  formatQuoteKnowledgePreflight,
  formatQuoteReply,
} from './ai-knowledge-diagnostics';
import { fetchPlayerProfile, fetchTeamProfile } from './hltv-api';
import { prewarmPlayerImages } from './fun';
import {
  directTtsCommands,
  extractVerbatimVoiceText,
  isExplicitVoiceReplyRequest,
  splitVoiceTextForTts,
  stripVoiceReplyInstruction,
} from './voice-intent';
import {
  commitKnowledgeCandidate,
  dropKnowledgeCandidate,
  getKnowledgeCandidate,
  getKnowledgeKeywords,
  getKnowledgeStats,
  importKnowledgeUrlCandidate,
  KnowledgeFreshnessIssue,
  auditKnowledge,
  describeKnowledgeCandidateQuality,
  getLastKnowledgeAudit,
  getRandomKnowledgeLine,
  isKnowledgeAutoEnabled,
  isKnowledgeTopic,
  listKnowledgeBatches,
  listKnowledgeCandidates,
  pruneKnowledgeAutoLog,
  previewInboxCandidates,
  previewKnowledgeCandidate,
  rollbackKnowledgeBatch,
  searchKnowledge,
  setKnowledgeAutoEnabled,
} from './knowledge-base';
import { closeKnowledgeDb } from './knowledge-db';
import { flushNow } from './context-store';
import { getEmbeddingStats, type MemorySearchResult } from './embedding-store';
import { ChatMessage, MessageContent, LLMCaller, callLLM as defaultCallLLM } from './llm-api';
import { ContextManager, SessionContext } from './ai-context';
import {
  extractImageUrls,
  extractRecordUrls,
  firstMediaString,
  uniqueNonEmpty,
  isDirectMediaSource,
  resolveOneBotImageSources,
  resolveOneBotRecordSources,
  voiceRecordSegment,
  isAtBot,
} from './media-utils';
import {
  postProcessReply,
  clampVoiceText,
  previewText,
  formatTime,
  parseFaceMarkers,
  hasRealityBoundaryClaim,
  hasUnsupportedOriginalQuoteClaim,
} from './reply-postprocess';
import {
  guardMultimodalPerceptionClaims,
  guardReplyFacts,
  localizeKnowledgeRiskKind,
  uncoveredReplyFactKinds,
  type EvidenceLedgerGuardContext,
  type FactGuardResult,
} from './ai-reply-guard';
import {
  assessReplyQuality,
  buildReplyQualityRepairMessages,
  ReplyQualityCheck,
  shouldBypassAtMentionFactFallback,
} from './ai-reply-quality';
import {
  ReplyCachePolicy,
  StyleSceneDecision,
  buildReplyCachePolicy,
  buildStyleSceneDecision,
  formatReplyCachePolicy,
  formatStyleScenePrompt,
} from './ai-style-scene';
import {
  buildSystemPrompt,
  buildTargetText,
} from './ai-prompt-builders';
import {
  buildConversationGovernanceDecision,
  formatConversationGovernancePrompt,
  formatConversationGovernanceTrace,
} from './ai-conversation-governance';
import { calculateHumanReplyDelayMs } from './ai-human-delay';
import {
  buildFocusedHistory,
  filterMemoryTruthRisk,
  formatMemoryAge,
  normalizeMemoryDuplicateText,
} from './ai-memory-utils';
import {
  clearAiSessionMemory as clearAiSessionMemoryRuntime,
  dropAiSessionMemoryByQuery as dropAiSessionMemoryByQueryRuntime,
  dropAiSessionMemoryByUser as dropAiSessionMemoryByUserRuntime,
  getMemoryDiagnostics as getMemoryDiagnosticsRuntime,
  getRecentSessionMemory as getRecentSessionMemoryRuntime,
  inspectAiSessionMemoryByUser as inspectAiSessionMemoryByUserRuntime,
  searchSessionMemory as searchSessionMemoryRuntime,
  trimAiSessionMemory as trimAiSessionMemoryRuntime,
  type MemoryRuntime,
} from './ai-memory-runtime';
import { parseStickerMarkers } from './sticker-pack';
import { buildThanks as buildGiftThanks, formatGiftThanksPreview, formatGiftThanksRecent, formatGiftThanksStatus, formatGiftThanksTrace, getGiftThanksStats, warmGiftThanksVoice } from './gift-thanks';
import { buildUserProfileRuntimeHint, handleUserProfileCommand } from './user-profile';
import * as fs from 'fs';

const logger = createLogger('AIChat');

// ============ 类型 ============
// ChatMessage / MessageContent / LLMCaller 已从 ./llm-api 导入
// SessionContext / ContextManager 已从 ./ai-context 导入

interface ReplyJob {
  generation: number;
  sessionId: string;
  chatType: 'group' | 'private';
  chatId: number;
  groupId?: number;
  userId: number;
  selfId: number;
  messageId: number;
  senderName: string;
  rawText: string;
  effectiveText: string;
  imageUrls: string[];
  imageInputCount: number;
  recordUrls: string[];
  hasImages: boolean;
  hasRecords: boolean;
  forceVoice: boolean;
  command: string | null;
  isAtBot: boolean;
  isReplyToBot: boolean;
  repliedMessageId?: number;
  triggerReason: string;
  forced: boolean;
  groupChatBusy: boolean;
  createdAt: number;
  contextSummary: string;
  contextMessages: ChatMessage[];
}

function markMemoryMutated(sessionId: string): void {
  clearReplyDedupeSession(sessionId);
  lastReplyAt.delete(sessionId);
}

// ============ 上下文管理器 已迁移到 ./ai-context.ts ============

// ============ 工具函数 ============
// extractImageUrls / extractRecordUrls / uniqueNonEmpty / isDirectMediaSource
// firstMediaString / resolveOneBotImageSources / resolveOneBotRecordSources
// voiceRecordSegment / isAtBot 已迁移到 ./media-utils

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    timer.unref();
  });
}

async function applyHumanReplyDelay(config: AIConfig, job: ReplyJob, text: string): Promise<number> {
  const ms = calculateHumanReplyDelayMs(config, job, text);
  if (ms <= 0) return 0;
  humanReplyDelayCount++;
  humanReplyDelayTotalMs += ms;
  lastHumanReplyDelayMs = ms;
  patchReplyTrace(job.messageId, { humanDelayMs: ms });
  await delay(ms);
  return ms;
}

let llmCaller: LLMCaller = defaultCallLLM;

async function callLLMWithRetry(
  config: AIConfig,
  messages: ChatMessage[],
  useVision: boolean = false,
  maxAttempts: number = 3,
  shouldCancel?: () => boolean,
): Promise<string> {
  const caller = llmCaller;
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (shouldCancel?.()) throw new Error('AI runtime stale');
    try {
      const result = await caller(config, messages, useVision);
      if (shouldCancel?.()) throw new Error('AI runtime stale');
      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (shouldCancel?.()) throw new Error('AI runtime stale');
      if (attempt < maxAttempts - 1) {
        await delay(1000 * (attempt + 1));
        if (shouldCancel?.()) throw new Error('AI runtime stale');
      }
    }
  }
  throw lastError;
}

function callLLMWithRetryForJob(
  job: ReplyJob,
  config: AIConfig,
  messages: ChatMessage[],
  useVision: boolean = false,
  maxAttempts: number = 3,
): Promise<string> {
  return callLLMWithRetry(config, messages, useVision, maxAttempts, () => isReplyJobStale(job));
}

// ============ 上下文压缩 ============
async function summarizeMessages(config: AIConfig, oldMessages: ChatMessage[]): Promise<string> {
  const lines = oldMessages.map(m => {
    const text = typeof m.content === 'string' ? m.content : '';
    return m.role === 'user' ? text : `[我回复] ${text}`;
  });
  const conversation = lines.join('\n');

  const prompt: ChatMessage[] = [
    { role: 'system', content: '把下面这段QQ群对话压缩成一段不超过300字的摘要。保留主要话题、关键人物、重要观点。直接输出摘要，不加标题。' },
    { role: 'user', content: conversation },
  ];

  try {
    return await defaultCallLLM(config, prompt, false);
  } catch {
    return `[较早的对话片段，共${oldMessages.length}条]`;
  }
}

export function __setLLMCallerForTests(caller?: LLMCaller): void {
  aiRuntimeGeneration++;
  llmCaller = caller || defaultCallLLM;
}

export function __setReplyCacheEntryForTests(key: string, value: string, ttlMs: number): void {
  setReplyCacheEntryForTests(key, value, ttlMs);
}

function formatVisionOnlyTrace(trace: ReplyTrace | null): string {
  return formatVisionOnlyTracePanel(trace, formatTraceTime);
}

function formatVisionStatusLastTrace(trace: ReplyTrace | null): string {
  return formatVisionStatusLastTracePanel(trace, formatTraceTime);
}

function formatVisionRecent(limit = 8): string {
  return formatVisionRecentList(recentVisionTraces, recentVisionTraces.length, MAX_VISION_TRACES, limit);
}

function formatSttStatusLastTrace(trace: ReplyTrace | null): string {
  return formatSttStatusLastTracePanel(trace, formatTraceTime);
}

async function formatVisionStatusPanel(ctx: PluginContext, config: AIConfig, apiReady: boolean): Promise<string> {
  const stats = getImageCacheStats();
  // 如果消息附带图片，顺便测试 get_image 解析。
  let attachedInfo = '';
  const attachedImages = await resolveOneBotImageSources(ctx, ctx.event.message);
  if (attachedImages.length > 0) {
    const lines = attachedImages.slice(0, 2).map((source, index) => {
      const kind = classifyImageSource(source);
      return `  [${index}] ${kind}: ${source.slice(0, 80)}${source.length > 80 ? '...' : ''}`;
    });
    attachedInfo = '\n附带图片源:\n' + lines.join('\n');
  }
  const diagnosis = buildVisionStatusDiagnosis(config, stats, apiReady, attachedImages.length);
  return [
    '识图状态',
    ...diagnosis,
    `开关: ${config.enable_vision ? 'on' : 'off'}`,
    `模型: ${config.vision_model || config.model || '未配置'}`,
    `payload: ${config.vision_payload_mode || 'auto'} (会按模型兼容格式发送image_url/input_image/base64)`,
    `单次图片: ${config.vision_max_images || 2}`,
    `缓存: ${stats.count}/${stats.maxFiles}张 ${stats.sizeMB}/${stats.maxSizeMB}MB 命中${stats.hits}/${stats.misses} 失败${stats.downloadFailures} 飞行${stats.inFlight}`,
    `单图上限: ${stats.maxFileMB}MB 跳转${stats.maxRedirects} 清理${stats.cleanupIntervalMinutes}m`,
    `最近记录: ${recentVisionTraces.length}/${MAX_VISION_TRACES}，看 /vision recent`,
    formatVisionStatusLastTrace(lastReplyTrace),
    ...(stats.lastError ? [`最近错误: ${stats.lastError}`] : []),
    attachedInfo,
    '/vision recent [条数]',
    '/vision check <图片URL或附图>',
    '/vision warm <图片URL或附图>',
    '/vision test <图片URL>',
    '提示: /vision check 只读；/vision warm 只下载进缓存；/vision test 端到端调模型',
  ].filter(Boolean).join('\n');
}

function latestRecordReplyTrace(): ReplyTrace | null {
  return recentReplyTraces.find((trace) => trace.hasRecords || trace.recordInputCount || trace.sttError) || null;
}

function countTodayMediaRuns(dateKey: string) {
  return countMediaRunsForDay(dateKey, recentVisionTraces, recentReplyTraces, recentVoiceTraces);
}

function formatLatestRecordSummary(trace: ReplyTrace | null): string {
  return trace ? `${formatRecordTrace(trace)} / ${formatTraceTime(trace.timestamp)}` : '暂无真实听写 trace';
}

function formatMediaDaily(config: AIConfig, apiReady: boolean, date: Date = new Date()): string {
  const parts = getShanghaiDayParts(date);
  const latestRecord = latestRecordReplyTrace();
  return formatMediaDailyPanel({
    config,
    apiReady,
    parts,
    imageStats: getImageCacheStats(),
    voiceStats: getVoiceStats(config),
    sttStats: getSttStats(config),
    latestVisionLine: formatVisionStatusLastTrace(recentVisionTraces[0] || null),
    latestRecordSummary: formatLatestRecordSummary(latestRecord),
    latestVoiceLine: formatMediaLatestVoiceTrace(recentVoiceTraces[0] || lastVoiceTrace),
    todayRuns: countTodayMediaRuns(parts.dateKey),
  });
}

function formatMediaStatus(config: AIConfig, apiReady: boolean): string {
  const imageStats = getImageCacheStats();
  const voiceStats = getVoiceStats(config);
  const sttStats = getSttStats(config);
  const giftStats = getGiftThanksStats();
  const latestRecord = latestRecordReplyTrace();
  return formatMediaStatusPanel({
    config,
    apiReady,
    imageStats,
    voiceStats,
    sttStats,
    giftStats,
    latestVisionLine: formatVisionStatusLastTrace(recentVisionTraces[0] || null),
    latestRecordSummary: formatLatestRecordSummary(latestRecord),
    latestVoiceLine: formatMediaLatestVoiceTrace(recentVoiceTraces[0] || lastVoiceTrace),
    traceCounts: {
      vision: recentVisionTraces.length,
      maxVision: MAX_VISION_TRACES,
      voice: recentVoiceTraces.length,
      maxVoice: MAX_VOICE_TRACES,
      reply: recentReplyTraces.length,
      maxReply: MAX_REPLY_TRACES,
    },
  });
}

function formatMediaRecent(limit = 3): string {
  const safeLimit = Math.max(1, Math.min(Math.floor(limit) || 3, 5));
  return [
    `多模态最近记录 ${safeLimit}`,
    '模式: 只读汇总真实链路；check/cache/warm 等预检命令不会写入这里。',
    '--- 识图 ---',
    formatVisionRecent(safeLimit),
    '--- 语音 ---',
    formatVoiceRecent(safeLimit),
    '--- 礼物 ---',
    formatGiftThanksRecent(safeLimit),
    '边界: 这里汇总的是最近真实处理结果；没出现在记录里的输入不能当作已看/已听/已感谢。',
  ].join('\n');
}

export function getMediaObservabilitySnapshot(): {
  visionTraces: number;
  maxVisionTraces: number;
  voiceTraces: number;
  maxVoiceTraces: number;
  replyTraces: number;
  maxReplyTraces: number;
  giftTraces: number;
  todayRuns: string;
  lastVisionSummary: string;
  lastRecordSummary: string;
  lastVoiceSummary: string;
  lastGiftSummary: string;
  boundary: string;
  hint: string;
} {
  const todayRuns = formatTodayMediaRuns(countTodayMediaRuns(getShanghaiDayParts().dateKey));
  const latestVision = recentVisionTraces[0] || null;
  const latestRecord = latestRecordReplyTrace();
  const latestVoice = recentVoiceTraces[0] || lastVoiceTrace;
  const giftStats = getGiftThanksStats();
  const lastGift = giftStats.lastGiftTrace;
  const lastVisionSummary = latestVision
    ? `mid=${latestVision.messageId} ${formatVisionTrace(latestVision)} / ${formatTraceTime(latestVision.timestamp)}`
    : '无真实图片回复 trace';
  const lastRecordSummary = latestRecord
    ? `mid=${latestRecord.messageId} ${formatRecordTrace(latestRecord)} / ${formatTraceTime(latestRecord.timestamp)}`
    : '无真实听写 trace';
  const lastVoiceSummary = latestVoice
    ? `mid=${latestVoice.messageId} ${latestVoice.mode} parts=${latestVoice.sentParts}/${latestVoice.parts} tts=${latestVoice.provider}/${latestVoice.sendMode}${latestVoice.error ? ` error=${latestVoice.error.slice(0, 60)}` : ''} / ${formatTraceTime(latestVoice.timestamp)}`
    : '无真实语音发送 trace';
  const lastGiftSummary = lastGift
    ? `#${lastGift.id} ${lastGift.action}/${lastGift.reason} voice=${lastGift.voiceAction}/${lastGift.voiceReason || '-'} / ${formatTraceTime(lastGift.timestamp)}`
    : '无真实礼物事件';
  return {
    visionTraces: recentVisionTraces.length,
    maxVisionTraces: MAX_VISION_TRACES,
    voiceTraces: recentVoiceTraces.length,
    maxVoiceTraces: MAX_VOICE_TRACES,
    replyTraces: recentReplyTraces.length,
    maxReplyTraces: MAX_REPLY_TRACES,
    giftTraces: giftStats.recentTraces,
    todayRuns,
    lastVisionSummary,
    lastRecordSummary,
    lastVoiceSummary,
    lastGiftSummary,
    boundary: '没有进入真实链路的图片/语音不能当作已看/已听；克隆/授权样本不能说成现实主播本人语音；礼物感谢是拟态模板。',
    hint: '/media status 看完整聚合，/media recent 3 看最近真实链路。',
  };
}

export type { MediaWarmupCandidateSnapshot, WarmupCandidate };
export { formatVoiceCacheWarm };

export function getMediaWarmupCandidates(config: AIConfig, limit = 5): MediaWarmupCandidateSnapshot {
  return buildMediaWarmupCandidates(config, {
    visionTraces: recentVisionTraces,
    replyTraces: recentReplyTraces,
    voiceTraces: recentVoiceTraces,
  }, limit);
}

function formatVoiceStatusPanel(config: AIConfig, apiReady: boolean): string {
  return formatVoiceStatusPanelFromDiagnostics(config, apiReady, {
    recentVoiceCount: recentVoiceTraces.length,
    maxVoiceTraces: MAX_VOICE_TRACES,
    sttStatusLastTrace: formatSttStatusLastTrace(lastReplyTrace),
  });
}

async function resolveVisionDataUrls(
  ctx: PluginContext,
  job: ReplyJob,
  limit: number,
): Promise<{ dataUrls: string[]; error: string }> {
  const dataUrls: string[] = [];
  const seen = new Set<string>();
  let lastError = '';

  const pushIfDataUrl = (value: string): boolean => {
    if (dataUrls.length >= limit) return true;
    const cleaned = value.trim();
    if (!cleaned) return false;
    if (cleaned.startsWith('data:image/')) {
      if (!seen.has(cleaned)) {
        seen.add(cleaned);
        dataUrls.push(cleaned);
      }
      return true;
    }
    if (cleaned.startsWith('base64://')) {
      const dataUrl = `data:image/jpeg;base64,${cleaned.slice('base64://'.length).replace(/\s+/g, '')}`;
      if (!seen.has(dataUrl)) {
        seen.add(dataUrl);
        dataUrls.push(dataUrl);
      }
      return true;
    }
    const compact = cleaned.replace(/\s+/g, '');
    if (compact.length > 100 && /^[A-Za-z0-9+/_=-]+$/.test(compact)) {
      const dataUrl = `data:image/jpeg;base64,${compact}`;
      if (!seen.has(dataUrl)) {
        seen.add(dataUrl);
        dataUrls.push(dataUrl);
      }
      return true;
    }
    return false;
  };

  const loadSources = async (sources: string[], stage: string): Promise<void> => {
    for (const url of uniqueNonEmpty(sources)) {
      if (dataUrls.length >= limit) break;
      try {
        const d = await withGate('vision', () => getImageDataUrl(url), job.forced);
        if (d) pushIfDataUrl(d);
      } catch (err) {
        lastError = `${stage}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 140);
      }
    }
  };

  await loadSources(job.imageUrls, 'message');
  if (dataUrls.length >= limit) return { dataUrls: dataUrls.slice(0, limit), error: '' };

  try {
    const msgRes = await ctx.bot.callApiAsync('get_msg', { message_id: job.messageId }, 6000);
    const msgData = (msgRes as any)?.data || msgRes;
    const msgSegs = Array.isArray(msgData?.message) ? msgData.message : [];
    if (msgSegs.length > 0) {
      const reresolved = await resolveOneBotImageSources(ctx, msgSegs);
      await loadSources(reresolved, 'get_msg');
    }
  } catch (err) {
    lastError = `get_msg: ${err instanceof Error ? err.message : String(err)}`.slice(0, 140);
  }
  if (dataUrls.length >= limit) return { dataUrls: dataUrls.slice(0, limit), error: '' };

  const rawFiles = uniqueNonEmpty(ctx.event.message
    .filter((seg) => seg.type === 'image')
    .map((seg) => seg.type === 'image' ? (seg.data.file || seg.data.url || '') : ''));
  for (const rawFile of rawFiles.slice(0, limit)) {
    if (dataUrls.length >= limit) break;
    try {
      const r = await ctx.bot.callApiAsync('get_image', { file: rawFile }, 8000);
      const d = (r as any)?.data || r;
      if (pushIfDataUrl(String(d?.base64 || d?.b64 || d?.base64_file || d?.file_base64 || ''))) continue;
      const best = firstMediaString(d, 'image/jpeg');
      if (best) await loadSources([best], 'get_image');
    } catch (err) {
      lastError = `get_image: ${err instanceof Error ? err.message : String(err)}`.slice(0, 140);
    }

    try {
      const r = await ctx.bot.callApiAsync('get_file', { file_id: rawFile, file: rawFile }, 8000);
      const d = (r as any)?.data || r;
      if (pushIfDataUrl(String(d?.base64 || d?.b64 || d?.file_base64 || ''))) continue;
      const best = firstMediaString(d, 'image/jpeg');
      if (best) await loadSources([best], 'get_file');
    } catch (err) {
      lastError = lastError || `get_file: ${err instanceof Error ? err.message : String(err)}`.slice(0, 140);
    }
  }

  const imageStats = getImageCacheStats();
  return {
    dataUrls: dataUrls.slice(0, limit),
    error: lastError || imageStats.lastError || '',
  };
}

// ============ 后处理 已迁移到 ./reply-postprocess ============

function makeStyleCheckJob(text: string, forceVoice: boolean = false): ReplyJob {
  const now = Date.now();
  return {
    generation: aiRuntimeGeneration,
    sessionId: 'style_check',
    chatType: 'group',
    chatId: 0,
    groupId: 0,
    userId: 0,
    selfId: 0,
    messageId: 0,
    senderName: 'style-check',
    rawText: text,
    effectiveText: text,
    imageUrls: [],
    imageInputCount: 0,
    recordUrls: [],
    hasImages: false,
    hasRecords: false,
    forceVoice,
    command: 'style',
    isAtBot: false,
    isReplyToBot: false,
    triggerReason: 'style-check',
    forced: true,
    groupChatBusy: false,
    createdAt: now,
    contextSummary: '',
    contextMessages: [],
  };
}

function formatStyleQualityPreflight(
  rawText: string,
  options: { hasRealtimeData?: boolean; forceVoice?: boolean; config?: AIConfig; apiReady?: boolean; evidenceText?: string } = {},
): string {
  return formatStyleQualityPreflightPanel(rawText, {
    ...options,
    guardReplyFacts: (text, hasCurrentRealtimeData, realtimeFreshness, realtimeStaleEvidence) => (
      guardReplyFacts(text, hasCurrentRealtimeData, [], [], realtimeFreshness, { realtimeStaleEvidence })
    ),
    uncoveredFactKinds: (text, realtimeFreshness) => uncoveredReplyFactKinds(text, [], realtimeFreshness),
    localizeFactKind: localizeKnowledgeRiskKind,
    buildVoicePreflightAnalysis,
  });
}

function formatStyleQualityStatus(): string {
  const stats = getAiChatStats();
  return [
    '风格质量状态',
    `场景: ${stats.styleSceneTraceCount}条 最近${stats.lastStyleScene || '无'}${stats.lastStyleSceneAction ? ` / ${stats.lastStyleSceneAction.slice(0, 52)}` : ''}`,
    `Top: ${stats.styleSceneTop.join(' / ') || '无'}`,
    `质量风险: ${stats.qualityIssueTraceCount}${stats.lastQualityIssues.length ? ` 最近=${stats.lastQualityIssues.join('/')}` : ' 最近=无'}`,
    `事实边界: ${stats.lastFactGuard || '无'}`,
    `开头去重: ${stats.lastOpenerDeduped ? '最近触发过' : '最近未触发'}`,
    `真人停顿: ${stats.humanReplyDelayCount}次 avg=${stats.humanReplyDelayAvgMs}ms 最近=${stats.lastHumanReplyDelayMs}ms`,
    '/style check <文本> || <证据/缓存行> 可预检模板味、原话误称、假来源、实时断言、语音分段风险和 /cs verify / warm 补证命令',
  ].join('\n');
}

function parseStyleCheckArgs(args: string[]): { text: string; evidenceText: string; hasRealtimeData: boolean; forceVoice: boolean } {
  return parseStyleCheckCommandArgs(args);
}

function handlePresetCommand(
  ctx: { args: string[]; reply: (msg: string) => void; bot: Bot },
  config: AIConfig
): boolean {
  const presetName = ctx.args[0];
  if (!presetName) {
    ctx.reply('/preset <名称>\n/presets 看列表');
    return true;
  }
  if (!config.presets[presetName]) {
    ctx.reply('没这个');
    return true;
  }
  config.active_preset = presetName;
  ctx.reply(`切到${config.presets[presetName].name}了`);
  return true;
}

function isAdmin(ctx: PluginContext): boolean {
  return ctx.bot.getConfig().admin_qq.includes(ctx.event.user_id);
}

function guardReplyFactsForJob(
  job: ReplyJob,
  text: string,
  hasCurrentRealtimeData: boolean,
  knowledgeFreshnessIssues: KnowledgeFreshnessIssue[],
  hltvLabels: string[],
  realtimeFreshness: string[],
  guardContext?: EvidenceLedgerGuardContext,
): FactGuardResult {
  if (shouldBypassAtMentionFactFallback(job)) {
    return { text, reason: '' };
  }
  return guardReplyFacts(text, hasCurrentRealtimeData, knowledgeFreshnessIssues, hltvLabels, realtimeFreshness, guardContext);
}

function guardMultimodalPerceptionForJob(
  job: ReplyJob,
  text: string,
  options: {
    usesVisionPayload: boolean;
    visionImages: number;
    recordTranscripts: string[];
    sttTruncated: boolean;
  },
): FactGuardResult {
  const guarded = guardMultimodalPerceptionClaims(text, {
    hasImages: job.hasImages,
    imageInputCount: job.imageInputCount || job.imageUrls.length,
    visionPayload: options.usesVisionPayload,
    visionImages: options.visionImages,
    hasRecords: job.hasRecords,
    recordInputCount: job.recordUrls.length,
    recordTranscripts: options.recordTranscripts.length,
    sttTruncated: options.sttTruncated,
  });
  if (guarded.reason) {
    patchReplyTrace(job.messageId, {
      factGuard: guarded.reason,
      qualityIssues: guarded.issues,
      qualityFinalOk: false,
    });
  }
  return { text: guarded.text, reason: guarded.reason };
}

async function handleKnowledgeCommand(ctx: PluginContext, config: AIConfig): Promise<boolean> {
  if (ctx.command !== 'kb') return false;

  const action = (ctx.args[0] || '').toLowerCase();
  const rest = ctx.args.slice(1).join(' ').trim();

  if (!action || action === 'help') {
    ctx.reply([
      '/kb search <关键词>',
      '/kb route <消息>  预检AI会注入哪些风格/话题知识和命中诊断',
      '/kb trust <链接或域名>  预检来源评级/写库边界',
      '/kb sources [条数|all]  只读体检刷新状态/来源可信度/自动写库前置',
      '/kb stale [条数|all]  只读体检主库时效事实边界缺口',
      '/kb inbox [条数|all]  管理员，只读体检 knowledge/inbox 本地素材风险',
      '/kb stats',
      '/kb preview <关键词>  管理员',
      '/kb import-url <链接>  管理员',
      '/kb refresh [--aggressive] [关键词]  管理员',
      '/kb audit  管理员',
      '/kb auto <on|off|run>  管理员',
      '/kb batches  管理员',
      '/kb rollback <batchId>  管理员',
      '/kb show <候选ID>  管理员',
      '/kb drop <候选ID>  管理员',
      '/kb commit <候选ID>  管理员',
      '/kb ingest  管理员',
      '/kb list  管理员',
    ].join('\n'));
    return true;
  }

  if (action === 'search') {
    if (!rest) {
      ctx.reply('/kb search <关键词>');
      return true;
    }
    ctx.reply(formatKnowledgeResults(searchKnowledge(rest, 5, 260)));
    return true;
  }

  if (action === 'route' || action === 'why' || action === 'inject' || action === '路由') {
    if (!rest) {
      ctx.reply('/kb route <要预检的消息>');
      return true;
    }
    ctx.reply(formatKnowledgeRoutePreview(config, rest));
    return true;
  }

  if (['trust', 'source', 'check-source', 'source-check', '来源', '评级'].includes(action)) {
    if (!rest) {
      ctx.reply('/kb trust <链接或域名>');
      return true;
    }
    ctx.reply(formatKnowledgeSourceTrustPreview(rest));
    return true;
  }

  if (['sources', 'source-status', 'source-state', '来源状态', '源状态', '源'].includes(action)) {
    ctx.reply(formatKnowledgeSourcesReport(config, rest));
    return true;
  }

  if (['stale', 'freshness', 'fresh', 'timecheck', '时效', '新鲜度', '旧事实'].includes(action)) {
    ctx.reply(formatKnowledgeFreshnessReport(rest));
    return true;
  }

  if (action === 'stats') {
    const stats = getKnowledgeStats();
    ctx.reply([
      `知识库: ${stats.sections}块 ${stats.chars}字`,
      `索引词: ${stats.keywords}`,
      `检索命中: ${stats.searchHits}/${stats.searchMisses}`,
      `注入命中: ${stats.selectHits}/${stats.selectMisses}`,
      `候选: ${stats.candidates}`,
      `自动: ${stats.autoEnabled ? 'on' : 'off'} 最近${formatTime(stats.lastAutoRefreshAt)}`,
      `自动写入: ${stats.autoCommitted} 质量闸保护 审计问题: ${stats.auditIssues}`,
      `来源状态: ${stats.sourceStates} 个`,
      `候选来源: trusted ${stats.trustedSourceCandidates} / unknown ${stats.unknownSourceCandidates} / risky ${stats.riskySourceCandidates}`,
    ].join('\n'));
    return true;
  }

  if (!['preview', 'import-url', 'url', 'refresh', 'audit', 'auto', 'batches', 'rollback', 'show', 'drop', 'commit', 'ingest', 'inbox', 'list'].includes(action)) {
    ctx.reply('先看 /kb help，别硬猜命令。');
    return true;
  }

  if (!isAdmin(ctx)) {
    ctx.replyAt('这个得管理员来，知识库不能谁来都往里灌。');
    return true;
  }

  if (config.knowledge_update_mode === 'static' && action !== 'list' && action !== 'inbox') {
    ctx.reply('知识库现在是 static 模式，只能查不能写候选。');
    return true;
  }

  if (action === 'list') {
    const candidates = listKnowledgeCandidates();
    if (candidates.length === 0) {
      ctx.reply('现在没有待提交候选。');
      return true;
    }
    ctx.reply(candidates
      .slice(0, 8)
      .map((item) => `${item.id} | ${item.title} | ${item.sourceType}/${item.confidence}/${item.risk} | 来源${item.sourceTrust}${item.sourceHosts.length ? `(${item.sourceHosts.join(',')})` : ''} | 质量闸${describeKnowledgeCandidateQuality(item)} | ${formatKnowledgeCandidateAdvice(item, 120)} | ${item.source}`)
      .join('\n'));
    return true;
  }

  if (action === 'inbox') {
    ctx.reply(formatKnowledgeInboxReport(rest));
    return true;
  }

  if (action === 'batches') {
    const batches = listKnowledgeBatches(8);
    if (batches.length === 0) {
      ctx.reply('还没有自动写入批次。');
      return true;
    }
    ctx.reply(batches.map((batch) => [
      batch.batchId,
      formatTime(batch.createdAt),
      `entries ${batch.entries}`,
      `committed ${batch.committed}`,
      `rollback ${batch.rolledBack}`,
      'main-only',
    ].join(' | ')).join('\n'));
    return true;
  }

  if (action === 'rollback') {
    if (!rest) {
      ctx.reply('/kb rollback <batchId>');
      return true;
    }
    const result = rollbackKnowledgeBatch(rest);
    ctx.reply(`回滚完成: 删除块 ${result.removedBlocks}，更新日志 ${result.updatedEntries}`);
    return true;
  }

  if (action === 'audit') {
    const report = auditKnowledge();
    const hard = report.issues.filter((item) => item.level === 'hard').length;
    const risk = report.issues.filter((item) => item.level === 'risk').length;
    const info = report.issues.filter((item) => item.level === 'info').length;
    ctx.reply([
      `知识库审计: ${report.sections}块 ${report.chars}字`,
      `问题: hard ${hard} / risk ${risk} / info ${info}`,
      '写入策略: 主库分层，风险内容标为待核验',
      ...report.issues.slice(0, 8).map((item) => `${item.level}: ${item.title}${item.detail ? `；${item.detail.slice(0, 90)}` : ''}`),
    ].join('\n'));
    return true;
  }

  if (action === 'auto') {
    const mode = rest.toLowerCase();
    if (!mode) {
      const stats = getKnowledgeStats();
      const audit = getLastKnowledgeAudit();
      ctx.reply([
        `自动更新: ${isKnowledgeAutoEnabled() ? 'on' : 'off'}`,
        `最近刷新: ${stats.lastAutoRefreshAt ? new Date(stats.lastAutoRefreshAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '无'}`,
        `自动写入: ${stats.autoCommitted}`,
        '写入策略: 只自动写入有来源且通过质量闸的候选，风险内容留给人工确认',
        `候选来源: trusted ${stats.trustedSourceCandidates} / unknown ${stats.unknownSourceCandidates} / risky ${stats.riskySourceCandidates}`,
        `审计问题: ${audit?.issues.length || 0}`,
        '/kb auto on|off|run',
      ].join('\n'));
      return true;
    }
    if (mode === 'on') {
      setKnowledgeAutoEnabled(true);
      ctx.reply('知识库自动更新打开了。');
      return true;
    }
    if (mode === 'off') {
      setKnowledgeAutoEnabled(false);
      ctx.reply('知识库自动更新关了。');
      return true;
    }
    if (mode === 'run') {
      const result = await runKnowledgeRefresh(config, '', true);
      ctx.reply(result);
      return true;
    }
    ctx.reply('/kb auto on|off|run');
    return true;
  }

  if (action === 'show') {
    if (!rest) {
      ctx.reply('/kb show <候选ID>');
      return true;
    }
    const candidate = getKnowledgeCandidate(rest);
    ctx.reply(candidate ? [
      `${candidate.id} | ${candidate.title}`,
      `来源: ${candidate.source}`,
      `类型: ${candidate.sourceType} / 置信度: ${candidate.confidence} / 风险: ${candidate.risk} / 状态: ${candidate.status}`,
      `来源评级: ${candidate.sourceTrust}${candidate.sourceHosts.length > 0 ? ` (${candidate.sourceHosts.join(', ')})` : ''}`,
      `自动质量闸: ${describeKnowledgeCandidateQuality(candidate)}`,
      `行动建议: ${formatKnowledgeCandidateAdvice(candidate)}`,
      `证据: ${candidate.evidenceUrls.length > 0 ? candidate.evidenceUrls.join(' ') : '暂无'}`,
      candidate.markdown.slice(0, 1800),
    ].join('\n') : '没这个候选ID，/kb list 看一下。');
    return true;
  }

  if (action === 'drop') {
    if (!rest) {
      ctx.reply('/kb drop <候选ID>');
      return true;
    }
    const candidate = dropKnowledgeCandidate(rest);
    ctx.reply(candidate ? `丢掉候选了: ${candidate.title}` : '没这个候选ID，/kb list 看一下。');
    return true;
  }

  if (action === 'preview') {
    if (!rest) {
      ctx.reply('/kb preview <关键词>');
      return true;
    }
    const result = await webSearch(
      rest,
      Math.max(config.search_timeout_ms || 1500, 1500),
      config.search_cache_seconds ?? 300,
      config.search_negative_cache_seconds ?? 60,
    );
    if (!result) {
      ctx.reply('没搜到准信，先别写库。');
      return true;
    }
    const candidate = previewKnowledgeCandidate(rest, result, `web:${rest}`);
    ctx.reply([
      `候选 ${candidate.id}`,
      `类型: ${candidate.sourceType} / 置信度: ${candidate.confidence} / 风险: ${candidate.risk}`,
      `来源评级: ${candidate.sourceTrust}${candidate.sourceHosts.length > 0 ? ` (${candidate.sourceHosts.join(', ')})` : ''}`,
      `自动质量闸: ${describeKnowledgeCandidateQuality(candidate)}`,
      `行动建议: ${formatKnowledgeCandidateAdvice(candidate)}`,
      candidate.markdown.slice(0, 700),
      '确认没问题再 /kb commit ' + candidate.id,
    ].join('\n'));
    return true;
  }

  if (action === 'import-url' || action === 'url') {
    if (!rest) {
      ctx.reply('/kb import-url <链接>\n只抓标题、来源和短摘要，生成候选，不自动写库。');
      return true;
    }
    try {
      const candidate = await importKnowledgeUrlCandidate(
        rest.split(/\s+/)[0],
        Math.max(config.knowledge_source_timeout_ms || config.search_timeout_ms || 1800, 1500),
      );
      ctx.reply([
        `URL候选 ${candidate.id}`,
        `标题: ${candidate.title}`,
        `类型: ${candidate.sourceType} / 置信度: ${candidate.confidence} / 风险: ${candidate.risk}`,
        `来源评级: ${candidate.sourceTrust}${candidate.sourceHosts.length > 0 ? ` (${candidate.sourceHosts.join(', ')})` : ''}`,
        `自动质量闸: ${describeKnowledgeCandidateQuality(candidate)}`,
        `行动建议: ${formatKnowledgeCandidateAdvice(candidate)}`,
        `证据: ${candidate.evidenceUrls.join(' ') || '暂无'}`,
        candidate.markdown.slice(0, 850),
        '确认没问题再 /kb commit ' + candidate.id,
      ].join('\n'));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      ctx.reply(`URL导入失败: ${message.slice(0, 120)}\n别硬写库，换个可公开访问的网页。`);
    }
    return true;
  }

  if (action === 'refresh') {
    const aggressive = rest.split(/\s+/).includes('--aggressive');
    const query = rest.replace(/(^|\s)--aggressive(\s|$)/g, ' ').trim();
    ctx.reply(await runKnowledgeRefresh(config, query, false, aggressive));
    return true;
  }

  if (action === 'ingest') {
    const mode = rest.toLowerCase() === 'full' ? 'full' : 'summary';
    const candidates = previewInboxCandidates(mode);
    if (candidates.length === 0) {
      ctx.reply('knowledge/inbox 里没看到 md/txt 素材。');
      return true;
    }
    ctx.reply([
      `从 inbox 生成 ${candidates.length} 个候选(${mode}):`,
      ...candidates.slice(0, 8).map((item) => `${item.id} | ${item.title} | 来源${item.sourceTrust} | 质量闸${describeKnowledgeCandidateQuality(item)} | ${formatKnowledgeCandidateAdvice(item, 120)}`),
      '看完再 /kb commit <候选ID>',
    ].join('\n'));
    return true;
  }

  if (action === 'commit') {
    if (!rest) {
      ctx.reply('/kb commit <候选ID>');
      return true;
    }
    const candidate = commitKnowledgeCandidate(rest);
    ctx.reply(candidate ? `写进知识库了: ${candidate.title}` : '没这个候选ID，/kb list 看一下。');
    return true;
  }

  return true;
}

async function liveKnowledgeLookup(config: AIConfig, kind: 'player' | 'team', query: string): Promise<string> {
  const local = searchKnowledge(`${query} ${kind === 'player' ? '选手 player' : '队伍 team'}`, 3, 220);
  const structured = kind === 'player'
    ? await fetchPlayerProfile(query)
    : await fetchTeamProfile(query);
  const searchQuery = `${query} HLTV Liquipedia CS2`;
  const live = structured ? '' : await webSearch(
    searchQuery,
    Math.max(config.search_timeout_ms || 1500, 1200),
    config.search_cache_seconds ?? 300,
    config.search_negative_cache_seconds ?? 60,
  );
  const localText = local.length > 0 ? formatKnowledgeResults(local, 520) : '本地倾向还没写厚。';
  const liveText = structured || (live ? live.slice(0, 520) : '没搜到准信，别硬编。');
  return [
    kind === 'player' ? '选手这块我按本地倾向加实时数据说。' : '队伍这块我按本地倾向加实时数据说。',
    localText,
    `实时参考:\n${liveText}`,
  ].join('\n');
}

async function handleLocalKnowledgeCommand(ctx: PluginContext, config: AIConfig): Promise<boolean> {
  if (ctx.command === 'quote') {
    const sub = (ctx.args[0] || '').toLowerCase();
    if (sub === 'check' || sub === 'status' || sub === 'preview' || sub === '预检' || sub === '检查') {
      ctx.reply(formatQuoteKnowledgePreflight(ctx.args.slice(1).join(' ').trim()));
      return true;
    }
    const query = ctx.args.join(' ').trim();
    const line = getRandomKnowledgeLine('quote', query);
    ctx.reply(formatQuoteReply(query, line));
    return true;
  }

  if (ctx.command === 'player') {
    const query = ctx.args.join(' ').trim();
    if (!query) {
      ctx.reply('/player <选手名>');
      return true;
    }
    if (/最新|现在|排名|阵容|转会|加入|离队|近期|今天/.test(query)) {
      ctx.reply(await liveKnowledgeLookup(config, 'player', query));
      return true;
    }
    const results = searchKnowledge(`${query} 选手 player`, 3, 260);
    const line = getRandomKnowledgeLine('player', query);
    ctx.reply(results.length > 0 ? formatKnowledgeResults(results, 700) : (line || '这选手资料库里还没写，先 /kb preview 补一下。'));
    return true;
  }

  if (ctx.command === 'team') {
    const query = ctx.args.join(' ').trim();
    if (!query) {
      ctx.reply('/team <队伍名>');
      return true;
    }
    if (/最新|现在|排名|阵容|转会|加入|离队|近期|今天/.test(query)) {
      ctx.reply(await liveKnowledgeLookup(config, 'team', query));
      return true;
    }
    const results = searchKnowledge(`${query} 队伍 team`, 3, 260);
    const line = getRandomKnowledgeLine('team', query);
    ctx.reply(results.length > 0 ? formatKnowledgeResults(results, 700) : (line || '这队伍资料库里还没写，先 /kb preview 补一下。'));
    return true;
  }

  if (ctx.command === 'gift') {
    const sub = (ctx.args[0] || '').toLowerCase();
    if (sub === 'status') {
      ctx.reply(formatGiftThanksStatus());
      return true;
    }
    if (sub === 'trace') {
      ctx.reply(formatGiftThanksTrace());
      return true;
    }
    if (sub === 'recent' || sub === 'history' || sub === 'list' || sub === '最近' || sub === '记录') {
      const limit = Math.max(1, Math.min(parseInt(ctx.args[1] || '8', 10) || 8, 20));
      ctx.reply(formatGiftThanksRecent(limit));
      return true;
    }
    const warmMode = sub === 'warm' || sub === 'prewarm' || sub === '预热' || sub === '暖缓存';
    const checkMode = sub === 'check' || sub === 'cache' || sub === 'test' || sub === 'preview' || sub === '预检' || sub === '测试' || sub === '缓存';
    const args = checkMode || warmMode ? ctx.args.slice(1) : [...ctx.args];
    let count = 1;
    const last = args[args.length - 1] || '';
    const countMatch = last.match(/^(?:x|×)?(\d{1,4})$/i) || last.match(/^(.{1,24})[x×](\d{1,4})$/i);
    if (countMatch) {
      count = Number(countMatch[countMatch.length - 1]) || 1;
      if (countMatch.length === 3 && countMatch[1]) args[args.length - 1] = countMatch[1];
      else args.pop();
    }
    const gift = args.join(' ').trim() || '礼物';
    if (warmMode) {
      if (!isAdmin(ctx)) {
        ctx.replyAt('礼物语音预热会真实跑 TTS，这个得管理员来。');
        return true;
      }
      const provider = config.tts_provider || 'api';
      const localReady = !!(config.tts_local_command || '').trim() && (provider === 'local' || provider === 'auto');
      const ttsNeedsApi = provider === 'api' || (provider === 'auto' && !localReady);
      if (ttsNeedsApi && !hasUsableApiKey(config.api_key)) {
        ctx.reply([
          '礼物语音预热',
          `礼物: ${gift}x${count}`,
          '预热动作: skipped/api-not-ready',
          '原因: 当前 TTS 需要 API 后端，但 api_key 不可用；先配置本地 TTS 或真实 API key。',
        ].join('\n'));
        return true;
      }
      ctx.reply(await warmGiftThanksVoice(config, gift, count, ctx.groupId || 0, {
        generate: (voiceText) => withGate('tts', () => generateVoice(config, voiceText), true),
      }));
      return true;
    }
    ctx.reply(checkMode
      ? formatGiftThanksPreview(config, gift, count, ctx.groupId || 0)
      : buildGiftThanks(gift, count));
    return true;
  }

  return false;
}

// ============ 单例 ============
let contextManager: ContextManager | null = null;
const groupQueues: Map<string, Promise<void>> = new Map();
const groupQueueStats: Map<string, { pending: number; forced: number; oldestCreatedAt: number }> = new Map();
const groupQueueAges: Map<string, number[]> = new Map();
const lastReplyAt: Map<string, number> = new Map();
/** 群最近消息时间戳列表（最多保留最近 60 秒内）- 用于"群聊正在快速对话"的检测 */
const recentGroupMessages: Map<string, number[]> = new Map();
let skippedPassiveReplies = 0;
let deferredCompressions = 0;
let completedCompressions = 0;
let failedCompressions = 0;
let evidenceTraceCount = 0;
let realtimeIntentWithoutDataCount = 0;
let realtimeStaleEvidenceCount = 0;
let factGuardRepairCount = 0;
let qualityRepairCount = 0;
let freshnessRepairCount = 0;
let outputRepairCount = 0;
let styleSceneTraceCount = 0;
let qualityIssueTraceCount = 0;
let humanReplyDelayCount = 0;
let humanReplyDelayTotalMs = 0;
let lastHumanReplyDelayMs = 0;
let lastFactGuard = '';
let lastEvidenceSummary: string[] = [];
let lastEvidenceLedger: string[] = [];
let lastRealtimeFreshness: string[] = [];
let lastStyleScene = '';
let lastStyleSceneAction = '';
let lastQualityIssues: string[] = [];
let lastQualityFinalOk: boolean | undefined;
const evidenceTraceMessages = new Set<number>();
const realtimeMissingMessages = new Set<number>();
const realtimeStaleMessages = new Set<number>();
const factGuardMessages = new Set<number>();
const freshnessRepairMessages = new Set<number>();
const styleSceneMessages = new Set<number>();
const qualityIssueMessages = new Set<number>();
const styleSceneCounts: Map<string, number> = new Map();
const recentStyleScenes: string[] = [];
const MAX_REPLY_TRACES = 20;
const recentReplyTraces: ReplyTrace[] = [];
const MAX_VISION_TRACES = 20;
const recentVisionTraces: ReplyTrace[] = [];
const MAX_VOICE_TRACES = 20;
const recentVoiceTraces: VoiceTrace[] = [];
let lastReplyTrace: ReplyTrace | null = null;
let lastVoiceTrace: VoiceTrace | null = null;
let aiRuntimeGeneration = 1;
let knowledgeAutoTimer: NodeJS.Timeout | null = null;
let knowledgeAutoRunning = false;
let knowledgeAutoConfig: AIConfig | null = null;
let knowledgeAutoIntervalMinutes = 0;
let maintenanceTimer: NodeJS.Timeout | null = null;
const compressionInFlight: Set<string> = new Set();

function getContextManager(config: AIConfig): ContextManager {
  configureReplyCache(config.ai_reply_cache_max_entries);
  if (!contextManager) {
    contextManager = new ContextManager(
      config.max_context_messages ?? 50,
      config.context_expire_minutes ?? 120
    );
  }
  contextManager.configure({
    maxMessages: config.max_context_messages ?? 50,
    expireMinutes: config.context_expire_minutes ?? 120,
    enableMemoryRetrieval: config.enable_memory_retrieval !== false,
    memoryTopK: config.memory_top_k ?? 3,
    memoryMinSimilarity: config.memory_min_similarity ?? 0.15,
    memoryInjectMaxChars: config.memory_inject_max_chars ?? 700,
    memoryMaxMessagesPerSession: config.memory_max_messages_per_session ?? 500,
    memoryMaxSessionsInMemory: config.memory_max_sessions_in_memory ?? 50,
  });
  return contextManager;
}

const memoryRuntime: MemoryRuntime = {
  getContextManager,
  onMemoryMutated: markMemoryMutated,
};

// formatTime, previewText 已迁移到 ./reply-postprocess；trace格式化在 ./ai-trace-format

function compactStyleSceneStats(maxItems: number = 5): string[] {
  return [...styleSceneCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'))
    .slice(0, maxItems)
    .map(([scene, count]) => `${scene}${count}`);
}

function formatReplyRecent(limit = 8): string {
  return formatReplyRecentList(recentReplyTraces, recentReplyTraces.length, MAX_REPLY_TRACES, limit);
}

function formatVoiceRecent(limit = 8): string {
  return formatVoiceRecentList(recentVoiceTraces, recentVoiceTraces.length, MAX_VOICE_TRACES, limit);
}

function rememberReplyTrace(trace: ReplyTrace): void {
  const snapshot = cloneReplyTrace(trace);
  const index = recentReplyTraces.findIndex((item) => (
    item.messageId === trace.messageId
    && item.chatType === trace.chatType
    && item.chatId === trace.chatId
  ));
  if (index >= 0) {
    recentReplyTraces[index] = snapshot;
  } else {
    recentReplyTraces.unshift(snapshot);
  }
  if (recentReplyTraces.length > MAX_REPLY_TRACES) recentReplyTraces.length = MAX_REPLY_TRACES;
}

function shouldRememberVisionTrace(trace: ReplyTrace): boolean {
  return trace.hasImages || trace.visionPayload || !!trace.visionError;
}

function rememberVisionTrace(trace: ReplyTrace): void {
  if (!shouldRememberVisionTrace(trace)) return;
  const snapshot = cloneReplyTrace(trace);
  const index = recentVisionTraces.findIndex((item) => (
    item.messageId === trace.messageId
    && item.chatType === trace.chatType
    && item.chatId === trace.chatId
  ));
  if (index >= 0) {
    recentVisionTraces[index] = snapshot;
  } else {
    recentVisionTraces.unshift(snapshot);
  }
  if (recentVisionTraces.length > MAX_VISION_TRACES) recentVisionTraces.length = MAX_VISION_TRACES;
}

function rememberVoiceTrace(trace: VoiceTrace | null): void {
  if (!trace) return;
  const snapshot = { ...trace };
  const index = recentVoiceTraces.findIndex((item) => (
    item.messageId === trace.messageId
    && item.chatType === trace.chatType
    && item.chatId === trace.chatId
  ));
  if (index >= 0) {
    recentVoiceTraces[index] = snapshot;
  } else {
    recentVoiceTraces.unshift(snapshot);
  }
  if (recentVoiceTraces.length > MAX_VOICE_TRACES) recentVoiceTraces.length = MAX_VOICE_TRACES;
}

function setReplyTrace(trace: ReplyTrace): void {
  lastReplyTrace = trace;
  rememberReplyTrace(trace);
  rememberVisionTrace(trace);
}

function rememberTraceMessage(seen: Set<number>, messageId: number, max = 1000): boolean {
  if (seen.has(messageId)) return false;
  seen.add(messageId);
  while (seen.size > max) {
    const first = seen.values().next().value;
    if (first === undefined) break;
    seen.delete(first);
  }
  return true;
}

function patchReplyTrace(messageId: number, patch: Partial<ReplyTrace>): void {
  if (!lastReplyTrace || lastReplyTrace.messageId !== messageId) return;
  const hasEvidencePatch =
    Array.isArray(patch.evidenceSummary)
    || Array.isArray(patch.searchEvidence)
    || typeof patch.realtimeIntent === 'boolean'
    || typeof patch.realtimeDataAvailable === 'boolean';
  if (hasEvidencePatch && rememberTraceMessage(evidenceTraceMessages, messageId)) {
    evidenceTraceCount++;
  }
  if (patch.evidenceSummary && patch.evidenceSummary.length > 0) {
    lastEvidenceSummary = patch.evidenceSummary.slice(0, 8);
  }
  const shouldRefreshEvidenceLedger = hasEvidencePatch
    || Array.isArray(patch.knowledgeFreshnessIssues)
    || Array.isArray(patch.memoryFilterReasons)
    || typeof patch.memoryHits === 'number'
    || typeof patch.memoryFiltered === 'number'
    || typeof patch.userProfileInjected === 'boolean'
    || typeof patch.visionPayload === 'boolean'
    || typeof patch.recordTranscripts === 'number'
    || typeof patch.factGuard === 'string'
    || typeof patch.freshnessRepair === 'string';
  if (patch.realtimeFreshness && patch.realtimeFreshness.length > 0) {
    lastRealtimeFreshness = patch.realtimeFreshness.slice(0, 8);
  }
  if (patch.realtimeStaleEvidence === true && rememberTraceMessage(realtimeStaleMessages, messageId)) {
    realtimeStaleEvidenceCount++;
  }
  if (patch.styleScene && rememberTraceMessage(styleSceneMessages, messageId)) {
    styleSceneTraceCount++;
    lastStyleScene = patch.styleScene;
    lastStyleSceneAction = patch.styleSceneAction || '';
    styleSceneCounts.set(patch.styleScene, (styleSceneCounts.get(patch.styleScene) || 0) + 1);
    recentStyleScenes.push(patch.styleScene);
    while (recentStyleScenes.length > 20) recentStyleScenes.shift();
  } else if (patch.styleScene) {
    lastStyleScene = patch.styleScene;
    lastStyleSceneAction = patch.styleSceneAction || lastStyleSceneAction;
  }
  if (typeof patch.qualityFinalOk === 'boolean') {
    lastQualityFinalOk = patch.qualityFinalOk;
  }
  if (patch.qualityIssues && patch.qualityIssues.length > 0) {
    lastQualityIssues = patch.qualityIssues.slice(0, 8);
    if (rememberTraceMessage(qualityIssueMessages, messageId)) {
      qualityIssueTraceCount++;
    }
  }
  if (patch.realtimeIntent === true && patch.realtimeDataAvailable === false && rememberTraceMessage(realtimeMissingMessages, messageId)) {
    realtimeIntentWithoutDataCount++;
  }
  if (patch.factGuard && rememberTraceMessage(factGuardMessages, messageId)) {
    factGuardRepairCount++;
    lastFactGuard = patch.factGuard;
  }
  if (patch.outputRepair) {
    outputRepairCount++;
    if (/quality/i.test(patch.outputRepair)) qualityRepairCount++;
  }
  if (patch.freshnessRepair && rememberTraceMessage(freshnessRepairMessages, messageId)) {
    freshnessRepairCount++;
  }
  if (patch.cachePolicy) recordReplyCachePolicy(messageId, patch.cachePolicy);
  const freshnessRepair = patch.freshnessRepair && lastReplyTrace.freshnessRepair
    ? `${lastReplyTrace.freshnessRepair}; ${patch.freshnessRepair}`
    : patch.freshnessRepair || lastReplyTrace.freshnessRepair;
  lastReplyTrace = { ...lastReplyTrace, ...patch, freshnessRepair, timestamp: Date.now() };
  if (shouldRefreshEvidenceLedger) {
    lastReplyTrace.evidenceLedger = buildEvidenceLedger(lastReplyTrace);
    lastEvidenceLedger = lastReplyTrace.evidenceLedger.slice(0, 8);
  }
  rememberReplyTrace(lastReplyTrace);
  rememberVisionTrace(lastReplyTrace);
}

function appendReplyCacheDecision(messageId: number, part: string, key?: string): void {
  if (!part || !lastReplyTrace || lastReplyTrace.messageId !== messageId) return;
  const compactPart = part.replace(/\s+/g, ' ').trim().slice(0, 120);
  if (!compactPart) return;
  const previous = lastReplyTrace.cacheDecision
    ? lastReplyTrace.cacheDecision.split('; ').filter(Boolean)
    : [];
  if (previous[previous.length - 1] !== compactPart) {
    previous.push(compactPart);
  }
  const cacheKeyPrefix = key ? replyCacheKeyPrefix(key) : lastReplyTrace.cacheKeyPrefix;
  patchReplyTrace(messageId, {
    cacheDecision: previous.slice(-6).join('; '),
    cacheKeyPrefix,
  });
}

function getAiRuntimeGeneration(): number {
  return aiRuntimeGeneration;
}

function isRuntimeGenerationStale(generation: number): boolean {
  return generation !== aiRuntimeGeneration;
}

function isReplyJobStale(job: ReplyJob): boolean {
  return isRuntimeGenerationStale(job.generation);
}

function markReplyJobStale(job: ReplyJob, stage: string): void {
  patchReplyTrace(job.messageId, {
    sent: 'skipped',
    error: `stale runtime after ${stage}`,
  });
}

function shouldAbortStaleReplyJob(job: ReplyJob, stage: string): boolean {
  if (!isReplyJobStale(job)) return false;
  markReplyJobStale(job, stage);
  return true;
}

function makeDirectVoiceReplyTrace(
  ctx: PluginContext,
  text: string,
  parts: number,
  sent: ReplyTrace['sent'] = 'queued',
  error?: string,
): ReplyTrace {
  return {
    timestamp: Date.now(),
    chatType: ctx.chatType,
    chatId: ctx.chatId,
    groupId: ctx.groupId,
    userId: ctx.event.user_id,
    messageId: ctx.event.message_id,
    senderName: ctx.event.sender.card || ctx.event.sender.nickname,
    triggerReason: '直接语音照读',
    forced: true,
    command: ctx.command,
    rawTextPreview: previewText(ctx.rawText),
    effectiveTextPreview: previewText(text),
    hasImages: ctx.event.message.some((seg) => seg.type === 'image'),
    imageSources: traceWarmupSources(extractImageUrls(ctx.event.message)),
    hasRecords: ctx.event.message.some((seg) => seg.type === 'record'),
    recordInputCount: extractRecordUrls(ctx.event.message).length,
    recordSourceKinds: summarizeImageSourceKinds(extractRecordUrls(ctx.event.message)),
    recordSources: traceWarmupSources(extractRecordUrls(ctx.event.message)),
    recordTranscripts: 0,
    queueAgeMs: 0,
    searchUsed: false,
    searchChars: 0,
    searchEvidence: [],
    knowledgeInjected: false,
    knowledgeChars: 0,
    knowledgeTopic: false,
    knowledgeTitles: [],
    evidenceSummary: ['direct voice'],
    realtimeIntent: false,
    realtimeDataAvailable: false,
    visionPayload: false,
    voiceRequested: true,
    voiceMode: 'direct-verbatim',
    voiceParts: parts,
    sent,
    cacheHit: false,
    replyLength: text.length,
    error,
  };
}

function ensureKnowledgeAutoTimer(config: AIConfig): void {
  configureGates({
    ai: config.ai_global_concurrency,
    search: config.search_global_concurrency,
    vision: config.vision_global_concurrency,
    tts: config.tts_global_concurrency,
    stt: config.stt_global_concurrency,
    passiveQueueMax: config.gate_passive_queue_max,
  });
  configureSearchCache(config);
  configureImageCache(config);
  knowledgeAutoConfig = config;
  const intervalMinutes = Math.max(30, config.knowledge_auto_interval_minutes || 180);
  if (knowledgeAutoTimer && intervalMinutes === knowledgeAutoIntervalMinutes) return;
  if (knowledgeAutoTimer) {
    clearInterval(knowledgeAutoTimer);
    knowledgeAutoTimer = null;
  }
  knowledgeAutoIntervalMinutes = intervalMinutes;
  knowledgeAutoTimer = setInterval(() => {
    const activeConfig = knowledgeAutoConfig;
    if (!activeConfig || activeConfig.knowledge_auto_update === false || !isKnowledgeAutoEnabled()) return;
    if (knowledgeAutoRunning) return;
    knowledgeAutoRunning = true;
    runKnowledgeRefresh(activeConfig, '', true)
      .then((summary) => logger.info(`[KnowledgeAuto]\n${summary}`))
      .catch((err) => logger.error('[KnowledgeAuto] 刷新失败:', err))
      .finally(() => {
        knowledgeAutoRunning = false;
      });
  }, intervalMinutes * 60 * 1000);
  knowledgeAutoTimer.unref();
}

function ensureMaintenanceTimer(): void {
  if (maintenanceTimer) return;
  maintenanceTimer = setInterval(() => {
    try {
      cleanReplyCache();
      cleanSearchCache();
      cleanImageCache();
      cleanVoiceCache(knowledgeAutoConfig || undefined);
      cleanSttCache(knowledgeAutoConfig || undefined);
      auditKnowledge();
      pruneKnowledgeAutoLog(knowledgeAutoConfig?.knowledge_auto_log_retention_days || 14);
    } catch (err) {
      logger.error('[Maintenance] 轻量自检失败:', err);
    }
  }, 60 * 60 * 1000);
  maintenanceTimer.unref();
}

export function startAiChatBackgroundTasks(config: AIConfig): void {
  ensureKnowledgeAutoTimer(config);
  ensureMaintenanceTimer();

  // 启动后延迟 90 秒做一次知识库刷新，确保 bot 拿到的数据相对新
  // (避免和 NapCat 重连竞争资源，所以延迟 90s)
  if (config.knowledge_auto_update !== false && isKnowledgeAutoEnabled()) {
    setTimeout(() => {
      if (knowledgeAutoRunning) return;
      knowledgeAutoRunning = true;
      runKnowledgeRefresh(config, '', true)
        .then((summary) => logger.info(`[KnowledgeAuto] 启动后首次刷新\n${summary}`))
        .catch((err) => logger.error('[KnowledgeAuto] 启动刷新失败:', err))
        .finally(() => {
          knowledgeAutoRunning = false;
        });
    }, 90 * 1000).unref();
  }

  // 启动后延迟 5 分钟开始预热选手图缓存。串行 8 秒间隔，避免限流。
  // 仅在缓存少于 10 张图时才跑，否则每次重启都重新拉浪费资源。
  setTimeout(() => {
    try {
      const stats = getImageCacheStats();
      if (stats.count >= 10) {
        logger.info(`[Prewarm] 已有 ${stats.count} 张缓存图，跳过预热`);
        return;
      }
      logger.info(`[Prewarm] 启动预热选手图(每张8秒间隔，全部完成约7分钟)...`);
      prewarmPlayerImages()
        .then((r) => logger.info(`[Prewarm] 完成 成功${r.success} 失败${r.failed}`))
        .catch((err) => logger.error('[Prewarm] 异常:', err));
    } catch (err) {
      logger.error('[Prewarm] 启动失败:', err);
    }
  }, 5 * 60 * 1000).unref();
}

async function sendVerbatimVoice(ctx: PluginContext, config: AIConfig, text: string, fallbackMessageId?: number, fallbackUserId?: number): Promise<boolean> {
  const generation = getAiRuntimeGeneration();
  const voiceTexts = splitVoiceTextForTts(text, config.tts_max_chars || 120);
  if (voiceTexts.length === 0) return false;
  setReplyTrace(makeDirectVoiceReplyTrace(ctx, text, voiceTexts.length));
  const voiceStatsBefore = getVoiceStats(config);
  lastVoiceTrace = {
    timestamp: Date.now(),
    mode: 'direct-verbatim',
    chatType: ctx.chatType,
    chatId: ctx.chatId,
    groupId: ctx.groupId,
    userId: ctx.event.user_id,
    messageId: ctx.event.message_id,
    requestedTextPreview: previewText(text),
    spokenTextPreview: previewText(voiceTexts.join(' / ')),
    spokenTextWarm: voiceTexts.join(' / ').slice(0, 240),
    parts: voiceTexts.length,
    sentParts: 0,
    provider: voiceStatsBefore.provider,
    sendMode: voiceStatsBefore.sendMode,
    lastTtsMode: voiceStatsBefore.lastMode,
  };
  rememberVoiceTrace(lastVoiceTrace);
  if (!config.enable_tts) {
    const message = '语音没开，这句没法念';
    if (fallbackMessageId && fallbackUserId) ctx.replyQuoteTo(fallbackMessageId, fallbackUserId, message);
    else ctx.reply(message);
    const error = 'enable_tts=false';
    patchReplyTrace(ctx.event.message_id, { sent: 'fallback', error });
    lastVoiceTrace = { ...lastVoiceTrace, timestamp: Date.now(), error };
    rememberVoiceTrace(lastVoiceTrace);
    return true;
  }
  const ttsNeedsApi = (config.tts_provider || 'api') === 'api' || ((config.tts_provider || 'api') === 'auto' && !(config.tts_local_command || '').trim());
  if (ttsNeedsApi && !hasUsableApiKey(config.api_key)) {
    const message = '嗓子这边没接上，这句先发文字吧';
    if (fallbackMessageId && fallbackUserId) ctx.replyQuoteTo(fallbackMessageId, fallbackUserId, message);
    else ctx.reply(message);
    const error = 'api key missing';
    patchReplyTrace(ctx.event.message_id, { sent: 'fallback', error });
    lastVoiceTrace = { ...lastVoiceTrace, timestamp: Date.now(), error };
    rememberVoiceTrace(lastVoiceTrace);
    return true;
  }
  let sentAny = false;
  let sentParts = 0;
  let caughtError = '';
  try {
    for (const voiceText of voiceTexts) {
      const voicePath = await withGate('tts', () => generateVoice(config, voiceText), true);
      if (isRuntimeGenerationStale(generation)) {
        patchReplyTrace(ctx.event.message_id, { sent: 'skipped', error: 'stale runtime after direct tts' });
        lastVoiceTrace = { ...lastVoiceTrace, timestamp: Date.now(), error: 'stale runtime after direct tts' };
        rememberVoiceTrace(lastVoiceTrace);
        return true;
      }
      if (voicePath) {
        ctx.reply([voiceRecordSegment(config, voicePath)]);
        sentAny = true;
        sentParts++;
      }
    }
  } catch (err) {
    caughtError = err instanceof Error ? err.message : String(err);
  }
  const voiceStatsAfter = getVoiceStats(config);
  lastVoiceTrace = {
    ...lastVoiceTrace,
    timestamp: Date.now(),
    sentParts,
    provider: voiceStatsAfter.provider,
    sendMode: voiceStatsAfter.sendMode,
    lastTtsMode: voiceStatsAfter.lastMode,
    error: caughtError || voiceStatsAfter.lastError || undefined,
  };
  rememberVoiceTrace(lastVoiceTrace);
  if (sentAny) {
    patchReplyTrace(ctx.event.message_id, { sent: 'voice', voiceParts: sentParts, error: caughtError || undefined });
    return true;
  }
  if (isRuntimeGenerationStale(generation)) {
    patchReplyTrace(ctx.event.message_id, { sent: 'skipped', error: 'stale runtime after direct voice fallback' });
    return true;
  }
  const message = `语音生成失败 ${voiceTexts[0]}`;
  if (fallbackMessageId && fallbackUserId) ctx.replyQuoteTo(fallbackMessageId, fallbackUserId, message);
  else ctx.reply(message);
  patchReplyTrace(ctx.event.message_id, { sent: 'voice+text-fallback', error: caughtError || voiceStatsAfter.lastError || 'tts failed' });
  return true;
}

/** 记录群消息时间，返回该群是否处于"快速对话中"状态 */
function recordAndCheckBusy(sessionId: string, isPrivate: boolean): boolean {
  if (isPrivate) return false;
  const now = Date.now();
  const window = 30_000; // 30秒窗口
  const threshold = 3;   // 阈值：30秒内 >= 3 条人工消息 = 忙

  const list = recentGroupMessages.get(sessionId) || [];
  // 清理超出窗口的
  while (list.length > 0 && now - list[0] > window) {
    list.shift();
  }
  list.push(now);
  // 防止内存爆涨
  if (list.length > 50) list.splice(0, list.length - 50);
  recentGroupMessages.set(sessionId, list);
  return list.length >= threshold;
}

function getQueueStats(sessionId: string): { pending: number; forced: number; oldestCreatedAt: number } {
  return groupQueueStats.get(sessionId) || { pending: 0, forced: 0, oldestCreatedAt: 0 };
}

function cleanReplyCache(): void {
  const now = Date.now();
  pruneReplyCache();
  // 清理一小时前的lastReplyAt
  const oneHourAgo = now - 3600 * 1000;
  for (const [key, ts] of lastReplyAt) {
    if (ts < oneHourAgo) lastReplyAt.delete(key);
  }
  // 清理 recentGroupMessages 中过期/空的会话
  for (const [key, list] of recentGroupMessages) {
    while (list.length > 0 && now - list[0] > 60_000) list.shift();
    if (list.length === 0) recentGroupMessages.delete(key);
  }
  pruneReplyDedupeSessions(200);
  // 清理 groupQueueAges 太多
  if (groupQueueAges.size > 200) {
    const keys = [...groupQueueAges.keys()].slice(0, groupQueueAges.size - 200);
    for (const key of keys) groupQueueAges.delete(key);
  }
}

async function enqueueGroupTask(job: ReplyJob, task: () => Promise<void>): Promise<void> {
  const sessionId = job.sessionId;
  const stats = getQueueStats(sessionId);
  const ages = groupQueueAges.get(sessionId) || [];
  ages.push(job.createdAt);
  groupQueueAges.set(sessionId, ages);
  groupQueueStats.set(sessionId, {
    pending: stats.pending + 1,
    forced: stats.forced + (job.forced ? 1 : 0),
    oldestCreatedAt: stats.oldestCreatedAt ? Math.min(stats.oldestCreatedAt, job.createdAt) : job.createdAt,
  });

  const previous = groupQueues.get(sessionId) || Promise.resolve();
  const current = previous.catch(() => {}).then(async () => {
    if (shouldAbortStaleReplyJob(job, 'queue start')) return;
    await task();
  });
  groupQueues.set(sessionId, current);
  try {
    await current;
  } finally {
    const nextStats = getQueueStats(sessionId);
    const pending = Math.max(0, nextStats.pending - 1);
    const forced = Math.max(0, nextStats.forced - (job.forced ? 1 : 0));
    const ages = groupQueueAges.get(sessionId) || [];
    if (ages.length > 0) ages.shift();
    const oldestCreatedAt = ages[0] || 0;
    if (pending === 0 && forced === 0) {
      groupQueueStats.delete(sessionId);
      groupQueueAges.delete(sessionId);
    } else {
      groupQueueStats.set(sessionId, { pending, forced, oldestCreatedAt });
      groupQueueAges.set(sessionId, ages);
    }
    if (groupQueues.get(sessionId) === current) {
      groupQueues.delete(sessionId);
    }
  }
}

export function shutdownAiChat(): void {
  aiRuntimeGeneration++;
  if (knowledgeAutoTimer) {
    clearInterval(knowledgeAutoTimer);
    knowledgeAutoTimer = null;
    knowledgeAutoIntervalMinutes = 0;
  }
  if (maintenanceTimer) {
    clearInterval(maintenanceTimer);
    maintenanceTimer = null;
  }
  if (contextManager) {
    contextManager.shutdown();
  } else {
    flushNow();
  }
  groupQueues.clear();
  groupQueueStats.clear();
  groupQueueAges.clear();
  lastReplyAt.clear();
  recentGroupMessages.clear();
  clearReplyDedupeState();
  resetReplyCacheRuntime();
  compressionInFlight.clear();
  evidenceTraceCount = 0;
  realtimeIntentWithoutDataCount = 0;
  realtimeStaleEvidenceCount = 0;
  factGuardRepairCount = 0;
  qualityRepairCount = 0;
  freshnessRepairCount = 0;
  outputRepairCount = 0;
  styleSceneTraceCount = 0;
  qualityIssueTraceCount = 0;
  lastFactGuard = '';
  lastEvidenceSummary = [];
  lastEvidenceLedger = [];
  lastRealtimeFreshness = [];
  lastStyleScene = '';
  lastStyleSceneAction = '';
  lastQualityIssues = [];
  lastQualityFinalOk = undefined;
  evidenceTraceMessages.clear();
  realtimeMissingMessages.clear();
  realtimeStaleMessages.clear();
  factGuardMessages.clear();
  freshnessRepairMessages.clear();
  styleSceneMessages.clear();
  qualityIssueMessages.clear();
  styleSceneCounts.clear();
  recentStyleScenes.length = 0;
  recentReplyTraces.length = 0;
  recentVisionTraces.length = 0;
  recentVoiceTraces.length = 0;
  resetGates();
  closeKnowledgeDb();
}

export function getAiChatStats(): {
  sessions: number;
  queuedGroups: number;
  pendingJobs: number;
  forcedJobs: number;
  oldestQueueAgeMs: number;
  skippedPassiveReplies: number;
  replyCacheEntries: number;
  replyCacheMaxEntries: number;
  replyInFlight: number;
  replyCacheHits: number;
  replyCacheMisses: number;
  replyCacheBypasses: number;
  replyCachePolicyTop: string[];
  evidenceTraceCount: number;
  realtimeIntentWithoutDataCount: number;
  realtimeStaleEvidenceCount: number;
  factGuardRepairCount: number;
  qualityRepairCount: number;
  freshnessRepairCount: number;
  outputRepairCount: number;
  humanReplyDelayCount: number;
  humanReplyDelayAvgMs: number;
  lastHumanReplyDelayMs: number;
  styleSceneTraceCount: number;
  styleSceneTop: string[];
  recentStyleScenes: string[];
  lastStyleScene: string;
  lastStyleSceneAction: string;
  qualityIssueTraceCount: number;
  lastQualityIssues: string[];
  lastQualityFinalOk?: boolean;
  lastFactGuard: string;
  lastEvidenceSummary: string[];
  lastEvidenceLedger: string[];
  lastRealtimeFreshness: string[];
  gates: ReturnType<typeof getGateStats>;
  deferredCompressions: number;
  completedCompressions: number;
  failedCompressions: number;
  lastKnowledgeTitles: string[];
  lastOpenerDeduped: boolean;
  knowledgeAutoIntervalMinutes: number;
  knowledgeAutoRunning: boolean;
  memoryEnabled: boolean;
  memory: ReturnType<typeof getEmbeddingStats>;
} {
  let pendingJobs = 0;
  let forcedJobs = 0;
  let oldest = 0;
  for (const stats of groupQueueStats.values()) {
    pendingJobs += stats.pending;
    forcedJobs += stats.forced;
    if (stats.oldestCreatedAt && (!oldest || stats.oldestCreatedAt < oldest)) oldest = stats.oldestCreatedAt;
  }
  const replyCacheStats = getReplyCacheStats(6);
  return {
    sessions: contextManager ? contextManager.getSessionCount() : 0,
    queuedGroups: groupQueues.size,
    pendingJobs,
    forcedJobs,
    oldestQueueAgeMs: oldest ? Date.now() - oldest : 0,
    skippedPassiveReplies,
    replyCacheEntries: replyCacheStats.entries,
    replyCacheMaxEntries: replyCacheStats.maxEntries,
    replyInFlight: replyCacheStats.inFlight,
    replyCacheHits: replyCacheStats.hits,
    replyCacheMisses: replyCacheStats.misses,
    replyCacheBypasses: replyCacheStats.bypasses,
    replyCachePolicyTop: replyCacheStats.policyTop,
    evidenceTraceCount,
    realtimeIntentWithoutDataCount,
    realtimeStaleEvidenceCount,
    factGuardRepairCount,
    qualityRepairCount,
    freshnessRepairCount,
    outputRepairCount,
    humanReplyDelayCount,
    humanReplyDelayAvgMs: humanReplyDelayCount > 0 ? Math.round(humanReplyDelayTotalMs / humanReplyDelayCount) : 0,
    lastHumanReplyDelayMs,
    styleSceneTraceCount,
    styleSceneTop: compactStyleSceneStats(6),
    recentStyleScenes: [...recentStyleScenes],
    lastStyleScene,
    lastStyleSceneAction,
    qualityIssueTraceCount,
    lastQualityIssues: [...lastQualityIssues],
    lastQualityFinalOk,
    lastFactGuard,
    lastEvidenceSummary: [...lastEvidenceSummary],
    lastEvidenceLedger: [...lastEvidenceLedger],
    lastRealtimeFreshness: [...lastRealtimeFreshness],
    gates: getGateStats(),
    deferredCompressions,
    completedCompressions,
    failedCompressions,
    lastKnowledgeTitles: lastReplyTrace?.knowledgeTitles || [],
    lastOpenerDeduped: lastReplyTrace?.openerDeduped === true,
    knowledgeAutoIntervalMinutes,
    knowledgeAutoRunning,
    memoryEnabled: contextManager ? contextManager.isMemoryEnabled() : knowledgeAutoConfig?.enable_memory_retrieval !== false,
    memory: getEmbeddingStats(),
  };
}

export function getMemoryDiagnostics(config: AIConfig, sessionId: string): {
  enabled: boolean;
  session: ReturnType<ContextManager['getSessionMeta']>;
  embeddings: ReturnType<typeof getEmbeddingStats>;
  injectMaxChars: number;
} {
  return getMemoryDiagnosticsRuntime(memoryRuntime, config, sessionId);
}

export function searchSessionMemory(
  config: AIConfig,
  sessionId: string,
  query: string,
  topK?: number,
): MemorySearchResult[] {
  return searchSessionMemoryRuntime(memoryRuntime, config, sessionId, query, topK);
}

export function getRecentSessionMemory(
  config: AIConfig,
  sessionId: string,
  limit: number = 8,
): {
  context: Array<{ role: string; text: string }>;
  indexed: Array<{ role: 'user' | 'assistant'; text: string; ts: number }>;
} {
  return getRecentSessionMemoryRuntime(memoryRuntime, config, sessionId, limit);
}

export function clearAiSessionMemory(sessionId: string): void {
  clearAiSessionMemoryRuntime(sessionId, contextManager, markMemoryMutated);
}

export function trimAiSessionMemory(
  config: AIConfig,
  sessionId: string,
  keepMessages: number,
): {
  contextBefore: number;
  contextAfter: number;
  summaryBeforeChars: number;
  summaryAfterChars: number;
  indexBefore: number;
  indexAfter: number;
} {
  return trimAiSessionMemoryRuntime(memoryRuntime, config, sessionId, keepMessages);
}

export function dropAiSessionMemoryByQuery(
  config: AIConfig,
  sessionId: string,
  query: string,
): {
  contextBefore: number;
  contextAfter: number;
  contextRemoved: number;
  summaryBeforeChars: number;
  summaryAfterChars: number;
  summaryDropped: boolean;
  indexBefore: number;
  indexAfter: number;
  indexRemoved: number;
  samples: Array<{ role: string; text: string; ts?: number }>;
} {
  return dropAiSessionMemoryByQueryRuntime(memoryRuntime, config, sessionId, query);
}

export function inspectAiSessionMemoryByUser(
  config: AIConfig,
  sessionId: string,
  userId: number,
): {
  contextTotal: number;
  contextMatched: number;
  summaryChars: number;
  indexTotal: number;
  indexMatched: number;
  samples: Array<{ role: string; text: string; ts?: number }>;
} {
  return inspectAiSessionMemoryByUserRuntime(memoryRuntime, config, sessionId, userId);
}

export function dropAiSessionMemoryByUser(
  config: AIConfig,
  sessionId: string,
  userId: number,
): {
  contextBefore: number;
  contextAfter: number;
  contextRemoved: number;
  summaryBeforeChars: number;
  summaryAfterChars: number;
  summaryDropped: boolean;
  indexBefore: number;
  indexAfter: number;
  indexRemoved: number;
  samples: Array<{ role: string; text: string; ts?: number }>;
} {
  return dropAiSessionMemoryByUserRuntime(memoryRuntime, config, sessionId, userId);
}

export const aiChatPlugin: Plugin = {
  name: 'ai-chat',
  description: '智能对话 - 玩机器核心',

  handler: async (ctx) => {
    const config = ctx.bot.getConfig().ai;
    if (!config) return false;
    const apiReady = hasUsableApiKey(config.api_key) && !!config.api_url && !!config.model;

    ensureKnowledgeAutoTimer(config);
    ensureMaintenanceTimer();
    const cm = getContextManager(config);
    const sessionId = ctx.isPrivate
      ? `private_${ctx.event.user_id}`
      : `group_${ctx.groupId}`;

    // ===== 中文模糊命令分发 - 仅当不是显式 /xxx 命令时 =====
    const fuzzyCmd = ctx.command ? null : detectFuzzyCommand(ctx.rawText.trim());
    const hasImageAttachment = ctx.event.message.some((seg) => seg.type === 'image');

    if (fuzzyCmd === 'media_status') {
      ctx.reply(formatMediaStatus(config, apiReady));
      return true;
    }

    if (fuzzyCmd === 'media_daily') {
      ctx.reply(formatMediaDaily(config, apiReady));
      return true;
    }

    if (fuzzyCmd === 'vision_status') {
      ctx.reply(await formatVisionStatusPanel(ctx, config, apiReady));
      return true;
    }

    if (fuzzyCmd === 'voice_status') {
      ctx.reply(formatVoiceStatusPanel(config, apiReady));
      return true;
    }

    if (fuzzyCmd === 'vision') {
      if (!hasImageAttachment) {
        ctx.reply('把图发来，我给你看。');
        return true;
      }
    }

    // ===== Voice Clone 模糊触发 =====
    if (fuzzyCmd === 'voice_clone' || fuzzyCmd === 'voice_clone_status' || fuzzyCmd === 'voice_clone_reset') {
      // 状态查询
      if (fuzzyCmd === 'voice_clone_status') {
        const stats = getVoiceStats(config);
        if (stats.cloneReady) {
          ctx.replyAt([
            '🎤 Voice Clone 已学好',
            `样本大小: ${stats.sampleSizeMB}MB`,
            VOICE_CLONE_BOUNDARY_LINE,
            '想换 → 直接发语音 + 学一下我的声音',
            '想清空 → 不用我的声音了 (需 admin)',
          ].join('\n'));
        } else {
          ctx.replyAt([
            '🎤 还没学过声音',
            `状态: ${stats.sampleReason || '未配置'}`,
            VOICE_CLONE_BOUNDARY_LINE,
            '发一段10-30秒的语音 + "学一下我的声音" 即可训练',
          ].join('\n'));
        }
        return true;
      }

      // 重置
      if (fuzzyCmd === 'voice_clone_reset') {
        if (!isAdmin(ctx)) {
          ctx.replyAt('⛔ 这操作只 admin 能用');
          return true;
        }
        const ok = removeVoiceSample(config);
        ctx.replyAt(ok ? '✅ 已清空 voice sample，回到默认 TTS' : '清空失败，可能没有样本');
        return true;
      }

      // 训练
      const recordSources = await resolveOneBotRecordSources(ctx, config, ctx.event.message);
      if (recordSources.length === 0) {
        ctx.replyAt([
          '🎤 想让我学你的声音？',
          '发一段10-30秒的清晰语音，然后说 "学一下我的声音"',
          '建议是干净的人声，背景别太吵',
          VOICE_CLONE_BOUNDARY_LINE,
        ].join('\n'));
        return true;
      }
      ctx.replyAt('🎤 在下载学习中，稍等...');
      const result = await installVoiceSample(config, recordSources[0]);
      if (result.ok) {
        const sizeMB = ((result.size || 0) / 1024 / 1024).toFixed(2);
        ctx.replyAt([
          `✅ 学好了 你的声音 ${sizeMB}MB`,
          `格式: ${result.mime}`,
          VOICE_CLONE_BOUNDARY_LINE,
          '试试 /voice test 兄弟们好',
          '想换样本就再发一遍 + "学一下我的声音"',
        ].join('\n'));
      } else {
        ctx.replyAt(`❌ 学习失败: ${result.reason || '未知'}`);
      }
      return true;
    }

    // ===== 管理命令 =====
    if (ctx.command === 'reset' || ctx.command === 'clear') {
      clearAiSessionMemory(sessionId);
      ctx.reply('行 清了');
      return true;
    }
    if (ctx.command === 'preset') {
      return handlePresetCommand(ctx, config);
    }
    if (ctx.command === 'presets') {
      const list = Object.entries(config.presets)
        .map(([k, p]) => `${k === config.active_preset ? '>' : ' '} ${k} - ${p.description}`)
        .join('\n');
      ctx.reply(`预设:\n${list}\n\n/preset <名称> 切换`);
      return true;
    }
    if (await handleKnowledgeCommand(ctx, config)) {
      return true;
    }
    if (await handleLocalKnowledgeCommand(ctx, config)) {
      return true;
    }
    if (ctx.command === 'profile' || ctx.command === 'userprofile' || ctx.command === '画像' || ctx.command === '偏好') {
      ctx.reply(handleUserProfileCommand(ctx));
      return true;
    }
    if (ctx.command === 'trace') {
      const action = (ctx.args[0] || 'last').toLowerCase();
      if (action === 'last' || action === 'status') {
        ctx.reply(formatReplyTrace(lastReplyTrace));
        return true;
      }
      if (action === 'recent' || action === 'history' || action === 'list' || action === '最近' || action === '记录') {
        const limit = Number.parseInt(ctx.args[1] || '', 10);
        ctx.reply(formatReplyRecent(limit));
        return true;
      }
      ctx.reply('/trace last\n/trace recent [条数]');
      return true;
    }

    if (ctx.command === 'style' || ctx.command === 'human') {
      const action = (ctx.args[0] || 'status').toLowerCase();
      if (action === 'status' || action === 'last') {
        ctx.reply(formatStyleQualityStatus());
        return true;
      }
      if (action === 'check' || action === 'test' || action === '预检' || action === '检查') {
        const parsed = parseStyleCheckArgs(ctx.args);
        ctx.reply(formatStyleQualityPreflight(parsed.text, {
          hasRealtimeData: parsed.hasRealtimeData,
          forceVoice: parsed.forceVoice,
          evidenceText: parsed.evidenceText,
          config,
          apiReady,
        }));
        return true;
      }
      ctx.reply('/style status\n/style check <文本> [--realtime] [--voice]\n/style check <文本> || <证据/缓存行>');
      return true;
    }

    if (ctx.command && DIRECT_MEDIA_COMMANDS.has(ctx.command)) {
      const rawSubCommand = ctx.args[0] || '';
      const subCommand = rawSubCommand.toLowerCase();
      if (!subCommand || subCommand === 'status' || subCommand === '状态' || subCommand === 'overview' || subCommand === '概览') {
        ctx.reply(formatMediaStatus(config, apiReady));
        return true;
      }
      if (subCommand === 'daily' || subCommand === 'today' || subCommand === 'day' || subCommand === '每日' || subCommand === '今日' || subCommand === '日签') {
        ctx.reply(formatMediaDaily(config, apiReady));
        return true;
      }
      if (subCommand === 'recent' || subCommand === 'history' || subCommand === 'list' || subCommand === '最近' || subCommand === '记录') {
        const limit = Number.parseInt(ctx.args[1] || '', 10);
        ctx.reply(formatMediaRecent(limit));
        return true;
      }
      if (subCommand === 'warm' || subCommand === 'prewarm' || subCommand === 'cache-warm' || subCommand === '预热' || subCommand === '暖缓存') {
        const resolvedImages = await resolveOneBotImageSources(ctx, ctx.event.message);
        const resolvedRecords = await resolveOneBotRecordSources(ctx, config, ctx.event.message);
        const parsed = extractMediaCheckSources(ctx.args.slice(1).join(' ').trim());
        ctx.reply(await formatMediaCacheWarm(
          config,
          uniqueNonEmpty([...parsed.images, ...resolvedImages]),
          uniqueNonEmpty([...parsed.records, ...resolvedRecords]),
          apiReady,
          (source) => withGate('vision', () => getImageDataUrl(source), true),
        ));
        return true;
      }
      if (subCommand === 'check' || subCommand === 'preview' || subCommand === 'dry-run' || subCommand === '预检' || subCommand === '检查') {
        const resolvedImages = await resolveOneBotImageSources(ctx, ctx.event.message);
        const resolvedRecords = await resolveOneBotRecordSources(ctx, config, ctx.event.message);
        const parsed = extractMediaCheckSources(ctx.args.slice(1).join(' ').trim());
        ctx.reply(formatMediaPreflight(
          config,
          uniqueNonEmpty([...parsed.images, ...resolvedImages]),
          uniqueNonEmpty([...parsed.records, ...resolvedRecords]),
          apiReady,
        ));
        return true;
      }
      const directSources = extractMediaCheckSources(ctx.args.join(' ').trim());
      if (directSources.images.length > 0 || directSources.records.length > 0) {
        const resolvedImages = await resolveOneBotImageSources(ctx, ctx.event.message);
        const resolvedRecords = await resolveOneBotRecordSources(ctx, config, ctx.event.message);
        ctx.reply(formatMediaPreflight(
          config,
          uniqueNonEmpty([...directSources.images, ...resolvedImages]),
          uniqueNonEmpty([...directSources.records, ...resolvedRecords]),
          apiReady,
        ));
        return true;
      }
      ctx.reply('/media status\n/media daily\n/media recent [条数]\n/media check <图片URL/语音URL或附图附语音>\n/media warm <图片URL/语音URL或附图附语音>\ncheck/daily只读；warm会预热图片缓存，语音只做STT缓存预检。');
      return true;
    }

    // ===== 识图/图片缓存诊断 =====
    if (ctx.command && DIRECT_VISION_COMMANDS.has(ctx.command)) {
      const subCommand = (ctx.args[0] || '').toLowerCase();
      if (subCommand === 'last') {
        ctx.reply(formatVisionOnlyTrace(lastReplyTrace));
        return true;
      }
      if (subCommand === 'recent' || subCommand === 'history' || subCommand === 'list' || subCommand === '最近' || subCommand === '记录') {
        const limit = Number.parseInt(ctx.args[1] || '', 10);
        ctx.reply(formatVisionRecent(limit));
        return true;
      }
      if (!subCommand || subCommand === 'status' || subCommand === '状态' || subCommand === '诊断' || subCommand === '体检') {
        ctx.reply(await formatVisionStatusPanel(ctx, config, apiReady));
        return true;
      }
      if (subCommand === 'check' || subCommand === 'preview' || subCommand === 'dry-run' || subCommand === '预检' || subCommand === '检查') {
        const resolvedImages = await resolveOneBotImageSources(ctx, ctx.event.message);
        const textSources = extractVisionCheckSources(ctx.args.slice(1).join(' ').trim());
        const sources = uniqueNonEmpty([...textSources, ...resolvedImages]);
        ctx.reply(formatVisionPreflight(config, sources, apiReady));
        return true;
      }
      if (subCommand === 'warm' || subCommand === 'prewarm' || subCommand === 'cache-warm' || subCommand === '预热' || subCommand === '暖缓存') {
        const resolvedImages = await resolveOneBotImageSources(ctx, ctx.event.message);
        const textSources = extractVisionCheckSources(ctx.args.slice(1).join(' ').trim());
        const sources = uniqueNonEmpty([...textSources, ...resolvedImages]);
        ctx.reply(await formatVisionCacheWarm(config, sources, (source) => withGate('vision', () => getImageDataUrl(source), true)));
        return true;
      }
      if (subCommand === 'test') {
        const resolvedImages = await resolveOneBotImageSources(ctx, ctx.event.message);
        const url = ctx.args.slice(1).join(' ').trim() || resolvedImages[0] || '';
        if (!url) {
          ctx.reply('/vision test <图片URL>\n也可以把图片和 /vision test 发在同一条消息里');
          return true;
        }
        if (!config.enable_vision) {
          ctx.reply('识图没开，先把 enable_vision 打开。');
          return true;
        }
        if (!apiReady) {
          ctx.reply('对话接口没配，识图链路现在打不出去。');
          return true;
        }
        const sourceKind = classifyImageSource(url);
        const cacheBefore = inspectImageCacheSources([url], 1)[0];
        const dataUrl = await withGate('vision', () => getImageDataUrl(url));
        const nextStats = getImageCacheStats();
        const cacheAfterDownload = inspectImageCacheSources([url], 1)[0];
        if (!dataUrl) {
          ctx.reply([
            '识图链路测试失败',
            `图片源: ${sourceKind}`,
            cacheBefore ? `缓存前: ${cacheBefore.status} ${cacheBefore.reason.slice(0, 80)}` : '缓存前: 无',
            cacheAfterDownload ? `缓存后: ${cacheAfterDownload.status} ${cacheAfterDownload.reason.slice(0, 80)}` : '缓存后: 无',
            `下载: FAIL ${nextStats.lastError || 'unknown'}`,
            '边界: 下载失败时模型实际看不到图片，不能描述图片细节。',
          ].join('\n'));
          return true;
        }
        const dataInfo = describeDataUrl(dataUrl);
        try {
          const result = await withGate('vision', () => callLLMWithRetry(config, [
            { role: 'system', content: '你是识图链路测试器。只用一句中文描述图片里最明显的可见内容，句末加句号；看不清就明确说看不清，不要编造。' },
            {
              role: 'user',
              content: [
                { type: 'text', text: '请确认你能看到这张图，并描述最明显的可见内容。' },
                { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } },
              ],
            },
          ], true, 1));
          const cleaned = postProcessReply(result).slice(0, 220);
          ctx.reply([
            '识图链路测试',
            `图片源: ${sourceKind}`,
            `下载: OK ${dataInfo}`,
            cacheBefore ? `缓存前: ${cacheBefore.status} ${cacheBefore.reason.slice(0, 80)}` : '缓存前: 无',
            cacheAfterDownload ? `缓存后: ${cacheAfterDownload.status} ${cacheAfterDownload.reason.slice(0, 80)}` : '缓存后: 无',
            `模型: ${config.vision_model || config.model || '未配置'}`,
            `payload: ${config.vision_payload_mode || 'auto'}`,
            '调用: OK',
            `判定: ${looksLikeVisibleVisionDescription(cleaned) ? '模型返回了可见描述' : '模型返回偏空/像没看图，需要检查模型是否支持视觉'}`,
            `描述: ${cleaned || '空'}`,
            '边界: 缓存 hit 只代表图片文件可复用；下载 OK 且调用 OK 才代表本次模型拿到了图片输入。',
          ].join('\n'));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          ctx.reply([
            '识图链路测试失败',
            `图片源: ${sourceKind}`,
            `下载: OK ${dataInfo}`,
            cacheBefore ? `缓存前: ${cacheBefore.status} ${cacheBefore.reason.slice(0, 80)}` : '缓存前: 无',
            cacheAfterDownload ? `缓存后: ${cacheAfterDownload.status} ${cacheAfterDownload.reason.slice(0, 80)}` : '缓存后: 无',
            `模型: ${config.vision_model || config.model || '未配置'}`,
            `payload: ${config.vision_payload_mode || 'auto'}`,
            `调用: FAIL ${message.slice(0, 160)}`,
            '边界: 图片已下载不等于模型看懂；模型调用失败时不能把缓存命中说成已识图。',
          ].join('\n'));
        }
        return true;
      }
      ctx.reply('/vision status\n/vision recent [条数]\n/vision check <图片URL或附图>\n/vision warm <图片URL或附图>\n/vision last\n/vision test <图片URL>');
      return true;
    }

    // ===== 直接语音命令 =====
    if (ctx.command && directTtsCommands.has(ctx.command)) {
      const subCommand = (ctx.args[0] || '').toLowerCase();
      if (subCommand === 'last') {
        ctx.reply(formatVoiceTrace(lastVoiceTrace, config));
        return true;
      }
      if (subCommand === 'recent' || subCommand === 'history' || subCommand === 'list' || subCommand === '最近' || subCommand === '记录') {
        const limit = Number.parseInt(ctx.args[1] || '', 10);
        ctx.reply(formatVoiceRecent(limit));
        return true;
      }
      if (subCommand === 'status' || subCommand === '状态' || subCommand === '诊断' || subCommand === '体检') {
        ctx.reply(formatVoiceStatusPanel(config, apiReady));
        return true;
      }

      if (subCommand === 'check' || subCommand === 'preview' || subCommand === 'dry-run' || subCommand === '预检') {
        const text = ctx.args.slice(1).join(' ').trim();
        ctx.reply(formatVoicePreflight(config, text, apiReady));
        return true;
      }

      if (subCommand === 'cache' || subCommand === 'cache-check' || subCommand === '缓存' || subCommand === '命中') {
        const text = ctx.args.slice(1).join(' ').trim();
        ctx.reply(formatVoiceCachePreflight(config, text, apiReady));
        return true;
      }

      if (subCommand === 'sttcache' || subCommand === 'stt-cache' || subCommand === 'listen-cache' || subCommand === 'transcribe-cache' || subCommand === '听写缓存') {
        const resolvedRecords = await resolveOneBotRecordSources(ctx, config, ctx.event.message);
        const parsed = extractMediaCheckSources(ctx.args.slice(1).join(' ').trim());
        ctx.reply(formatSttCachePreflight(config, uniqueNonEmpty([...parsed.records, ...resolvedRecords]), apiReady));
        return true;
      }

      if (subCommand === 'warm' || subCommand === 'prewarm' || subCommand === '预热' || subCommand === '暖缓存') {
        if (!isAdmin(ctx)) {
          ctx.replyAt('语音预热会真实跑 TTS，这个得管理员来。');
          return true;
        }
        const text = ctx.args.slice(1).join(' ').trim();
        ctx.reply(await formatVoiceCacheWarm(config, text, apiReady, (partText) => withGate('tts', () => generateVoice(config, partText), true)));
        return true;
      }

      if (subCommand === 'clean') {
        cleanVoiceCache(config);
        cleanSttCache(config);
        ctx.reply('语音和听写缓存都清了一遍过期文件。');
        return true;
      }

      // ===== /voice clone <音频URL或附件> 自动训练样本 =====
      if (subCommand === 'clone') {
        const sub2 = (ctx.args[1] || '').toLowerCase();
        if (sub2 === 'reset' || sub2 === 'remove' || sub2 === 'clear') {
          // 仅 admin 可清空样本
          if (!isAdmin(ctx)) {
            ctx.replyAt('⛔ 权限不足');
            return true;
          }
          const ok = removeVoiceSample(config);
          ctx.reply(ok ? '已清空 voice sample，回到默认TTS。' : '清空失败，可能没有样本文件。');
          return true;
        }

        if (sub2 === 'status' || sub2 === '') {
          const stats = getVoiceStats(config);
          if (stats.cloneReady) {
            ctx.reply([
              '🎤 Voice Clone 状态',
              `样本: ${stats.samplePath}`,
              `大小: ${stats.sampleSizeMB}MB`,
              `状态: ✅ 可用`,
              VOICE_CLONE_BOUNDARY_LINE,
              '',
              '清空: /voice clone reset (admin)',
              '更新: /voice clone <音频附件> 或 /voice clone <https URL>',
            ].join('\n'));
          } else {
            ctx.reply([
              '🎤 Voice Clone 状态',
              `样本: ${stats.samplePath}`,
              `状态: ❌ ${stats.sampleReason || '不可用'}`,
              VOICE_CLONE_BOUNDARY_LINE,
              '',
              '安装: 直接发语音 + /voice clone',
              '或: /voice clone <https音频URL>',
              '建议时长: 10-30秒',
            ].join('\n'));
          }
          return true;
        }

        // 优先尝试当前消息附带的 record
        const recordSources = await resolveOneBotRecordSources(ctx, config, ctx.event.message);
        let source = ctx.args.slice(1).join(' ').trim();
        if (!source && recordSources.length > 0) source = recordSources[0];

        if (!source) {
          ctx.reply([
            '🎤 安装 Voice Clone 样本',
            '用法 1: 录一段语音 + /voice clone (10-30秒)',
            '用法 2: /voice clone <https音频URL>',
            '用法 3: /voice clone reset (admin清空样本)',
            VOICE_CLONE_BOUNDARY_LINE,
          ].join('\n'));
          return true;
        }

        ctx.reply('正在下载安装语音样本，请稍候...');
        const result = await installVoiceSample(config, source);
        if (result.ok) {
          const sizeMB = ((result.size || 0) / 1024 / 1024).toFixed(2);
          ctx.reply([
            '✅ Voice Clone 样本安装成功',
            `路径: ${result.filepath}`,
            `大小: ${sizeMB}MB`,
            `格式: ${result.mime}`,
            VOICE_CLONE_BOUNDARY_LINE,
            '',
            '试试 /voice test 兄弟们好',
          ].join('\n'));
        } else {
          ctx.reply(`❌ 安装失败: ${result.reason || '未知错误'}`);
        }
        return true;
      }

      if (subCommand === 'stt' || subCommand === 'listen' || subCommand === 'transcribe') {
        const resolvedRecords = await resolveOneBotRecordSources(ctx, config, ctx.event.message);
        const input = ctx.args.slice(1).join(' ').trim() || resolvedRecords[0] || '';
        if (!input) {
          ctx.reply('/voice stt <语音URL>\n也可以把语音和 /voice stt 发在同一条消息里');
          return true;
        }
        if (!config.enable_stt) {
          ctx.reply('听写没开，先把 enable_stt 打开。');
          return true;
        }
        const sttNeedsApi = (config.stt_provider || 'api') === 'api' || ((config.stt_provider || 'api') === 'auto' && !(config.stt_local_command || '').trim());
        if (sttNeedsApi && !apiReady) {
          ctx.reply('对话接口没配，听写链路现在打不出去。');
          return true;
        }
        ctx.reply(await formatSttEndToEndTest(
          config,
          input,
          (source) => withGate('stt', () => transcribeRecords(config, [source])),
        ));
        return true;
      }

      const text = subCommand === 'test'
        ? (ctx.args.slice(1).join(' ').trim() || '这波语音测试一下。')
        : ctx.args.join(' ').trim();
      if (!text) {
        ctx.reply('/voice <内容>\n/voice status\n/voice check <内容>\n/voice cache <内容>\n/voice sttcache <语音URL>\n/voice warm <内容> (admin，不发送)\n/voice last\n/voice recent [条数]\n/voice test [内容]\n/voice stt <语音URL>\n/voice clone [URL或附件] - 安装授权克隆样本，不能冒充现实本人\n/voice clean');
        return true;
      }
      return sendVerbatimVoice(ctx, config, text);
    }

    // ===== 显式联网搜索 =====
    if (ctx.command && DIRECT_SEARCH_COMMANDS.has(ctx.command)) {
      const query = ctx.args.join(' ').trim();
      if (!query) {
        ctx.reply('/search <关键词>');
        return true;
      }
      const result = await webSearch(
        query,
        config.search_timeout_ms || 1500,
        config.search_cache_seconds ?? 300,
        config.search_negative_cache_seconds ?? 60,
      );
      ctx.reply(result ? `搜到点东西:\n${result.slice(0, 500)}` : '没搜到准信');
      return true;
    }

    if (ctx.command && !DIRECT_AI_COMMANDS.has(ctx.command)) {
      return false;
    }

    const earlyRawEffectiveText = ctx.command && DIRECT_AI_COMMANDS.has(ctx.command)
      ? ctx.args.join(' ').trim()
      : ctx.rawText.trim();
    const verbatimVoiceText = isExplicitVoiceReplyRequest(earlyRawEffectiveText, ctx.command)
      ? extractVerbatimVoiceText(earlyRawEffectiveText, ctx.command)
      : '';
    if (verbatimVoiceText) {
      return sendVerbatimVoice(ctx, config, verbatimVoiceText, ctx.event.message_id, ctx.event.user_id);
    }

    if (!apiReady) {
      if (ctx.command && DIRECT_AI_COMMANDS.has(ctx.command)) {
        ctx.reply(buildApiNotReadyChatReply(ctx));
        return true;
      }
      if (ctx.isPrivate || isAtBot(ctx.event) || ctx.isReplyToBot) {
        ctx.replyQuote(buildApiNotReadyChatReply(ctx));
        return true;
      }
      return false;
    }

    // ===== 提取信息 =====
    const senderName = ctx.event.sender.card || ctx.event.sender.nickname;
    const imageUrls = await resolveOneBotImageSources(ctx, ctx.event.message);
    const recordUrls = await resolveOneBotRecordSources(ctx, config, ctx.event.message);
    const rawImageSegments = imageSegmentCount(ctx.event.message);
    const hasImages = imageUrls.length > 0 || rawImageSegments > 0;
    const imageInputCount = Math.max(imageUrls.length, rawImageSegments);
    const imageSourceKinds = summarizeImageSourceKinds(imageUrls);
    const hasRecords = recordUrls.length > 0;
    const recordSourceKinds = summarizeImageSourceKinds(recordUrls);
    const sttLimit = Math.max(1, Math.min(config.stt_max_records || 1, 4));
    const replySeg = ctx.event.message.find((seg) => seg.type === 'reply');
    const repliedMessageId = replySeg && replySeg.type === 'reply'
      ? Number(replySeg.data.id)
      : undefined;
    const atBot = ctx.isAtBot || isAtBot(ctx.event);
    const rawEffectiveText = earlyRawEffectiveText;
    const forceVoice = isExplicitVoiceReplyRequest(rawEffectiveText, ctx.command);
    const strippedVoiceText = forceVoice ? stripVoiceReplyInstruction(rawEffectiveText) : rawEffectiveText;
    const effectiveText = strippedVoiceText || rawEffectiveText;

    if (ctx.command && DIRECT_AI_COMMANDS.has(ctx.command) && !effectiveText && imageUrls.length === 0 && recordUrls.length === 0) {
      ctx.reply('/talk <内容>');
      return true;
    }

    // 记录群消息频率，判断"群里正在快速对话中"
    const groupChatBusy = recordAndCheckBusy(sessionId, ctx.isPrivate);

    // bot 自己刚回过话(30s内)：被动接话进一步降低
    const lastSelfReply = lastReplyAt.get(sessionId) || 0;
    const selfRecentlyReplied = !ctx.isPrivate && Date.now() - lastSelfReply < 30_000;

    const trigger = forceVoice
      ? { reply: true, forced: true }
      : (fuzzyCmd === 'vision' && hasImageAttachment)
        ? { reply: true, forced: true }
      : shouldReply(config, effectiveText, ctx.command, atBot, ctx.isReplyToBot, ctx.isPrivate, groupChatBusy, selfRecentlyReplied);

    const storedBaseText = effectiveText
      ? `[mid=${ctx.event.message_id} uid=${ctx.event.user_id}] ${senderName}: ${effectiveText}`
      : `[mid=${ctx.event.message_id} uid=${ctx.event.user_id}] ${senderName}: ${imageUrls.length > 0 ? '[图片]' : recordUrls.length > 0 ? '[语音]' : '[表情]'}`;

    cm.appendMessage(sessionId, {
      role: 'user',
      content: [
        storedBaseText,
        imageUrls.length > 0 ? `(含${imageUrls.length}张图)` : '',
        recordUrls.length > 0 ? `(含${recordUrls.length}条语音)` : '',
      ].filter(Boolean).join(' '),
    });
    const contextSnapshot = cm.getFullContext(sessionId);
    const snapshotSummary = contextSnapshot.summary;
    const snapshotMessages = [...contextSnapshot.messages];

    if (!trigger.reply) {
      return false;
    }

    const triggerReason = ctx.command && DIRECT_AI_COMMANDS.has(ctx.command)
      ? `命令/${ctx.command}`
      : forceVoice
        ? '明确要求语音回复'
      : ctx.isPrivate
        ? '私聊'
        : ctx.isReplyToBot
        ? '回复bot'
        : atBot
          ? '@bot'
          : '相关话题主动接话';
    const pendingStats = getQueueStats(sessionId);
    const maxGroupQueue = config.max_group_queue ?? 3;
    if (!trigger.forced && pendingStats.pending >= maxGroupQueue) {
      skippedPassiveReplies++;
      return false;
    }

    const cooldownMs = (config.cooldown_seconds || 0) * 1000;
    const now = Date.now();
    const lastReply = lastReplyAt.get(sessionId) || 0;
    if (!trigger.forced && cooldownMs > 0 && now - lastReply < cooldownMs) {
      return false;
    }

    const job: ReplyJob = {
      generation: getAiRuntimeGeneration(),
      sessionId,
      chatType: ctx.chatType,
      chatId: ctx.chatId,
      groupId: ctx.groupId,
      userId: ctx.event.user_id,
      selfId: ctx.event.self_id,
      messageId: ctx.event.message_id,
      senderName,
      rawText: ctx.rawText,
      effectiveText,
      imageUrls: [...imageUrls],
      imageInputCount,
      recordUrls: [...recordUrls],
      hasImages,
      hasRecords,
      forceVoice,
      command: ctx.command,
      isAtBot: atBot,
      isReplyToBot: ctx.isReplyToBot,
      repliedMessageId: Number.isFinite(repliedMessageId) ? repliedMessageId : undefined,
      triggerReason,
      forced: trigger.forced,
      groupChatBusy,
      createdAt: Date.now(),
      contextSummary: snapshotSummary,
      contextMessages: [...snapshotMessages],
    };
    setReplyTrace({
      timestamp: Date.now(),
      chatType: job.chatType,
      chatId: job.chatId,
      groupId: job.groupId,
      userId: job.userId,
      messageId: job.messageId,
      senderName: job.senderName,
      triggerReason: job.triggerReason,
      forced: job.forced,
      command: job.command,
      rawTextPreview: previewText(job.rawText),
      effectiveTextPreview: previewText(job.effectiveText),
      hasImages: job.hasImages,
    imageInputCount,
    imageSourceKinds,
    imageSources: traceWarmupSources(imageUrls),
    hasRecords: job.hasRecords,
    recordInputCount: job.recordUrls.length,
    recordSourceKinds,
    recordSources: traceWarmupSources(recordUrls),
      recordTranscripts: 0,
      sttLimit: job.hasRecords && config.enable_stt ? sttLimit : undefined,
      sttTruncated: job.hasRecords && config.enable_stt && job.recordUrls.length > sttLimit,
      queueAgeMs: 0,
      searchUsed: false,
      searchChars: 0,
      searchEvidence: [],
      knowledgeInjected: false,
      knowledgeChars: 0,
      knowledgeTopic: false,
      knowledgeTitles: [],
      evidenceSummary: [],
      realtimeIntent: false,
      realtimeDataAvailable: false,
      visionPayload: false,
      voiceRequested: job.forceVoice,
      voiceMode: job.forceVoice ? 'ai-voice' : 'none',
      voiceParts: 0,
      sent: 'queued',
      cacheHit: false,
      replyLength: 0,
    });

    void enqueueGroupTask(job, async () => {
      // 构建当前消息（双版本：API版含图，存储版纯文字）
      const queueAgeMs = Date.now() - job.createdAt;
      const skipHeavyEnhancements = job.forced && queueAgeMs > 120_000;
      const skipVoice = job.forced && queueAgeMs > 60_000;
      const sttLimit = Math.max(1, Math.min(config.stt_max_records || 1, 4));
      const sttTruncated = job.hasRecords && config.enable_stt && job.recordUrls.length > sttLimit;
      let recordTranscripts: string[] = [];
      let apiCurrentMessage: ChatMessage;
      let usesVisionPayload = false;
      let visionImagesPassed = 0;

      try {
        if (shouldAbortStaleReplyJob(job, 'task start')) return;
        if (job.hasRecords && config.enable_stt && !skipHeavyEnhancements) {
          try {
            recordTranscripts = await withGate('stt', () => transcribeRecords(config, job.recordUrls), job.forced);
            if (shouldAbortStaleReplyJob(job, 'stt')) return;
          } catch (err) {
            if (shouldAbortStaleReplyJob(job, 'stt error')) return;
            patchReplyTrace(job.messageId, {
              sttError: err instanceof Error ? err.message.slice(0, 120) : String(err).slice(0, 120),
            });
          }
        }
        if (job.hasRecords && config.enable_stt && recordTranscripts.length === 0) {
          const sttStats = getSttStats(config);
          if (sttStats.lastError) patchReplyTrace(job.messageId, { sttError: sttStats.lastError });
        }
        patchReplyTrace(job.messageId, {
          queueAgeMs,
          recordTranscripts: recordTranscripts.length,
          sttLimit: job.hasRecords && config.enable_stt ? sttLimit : undefined,
          sttTruncated,
        });

        const recordTranscriptText = recordTranscripts.join('\n');
        let targetText = buildTargetText(job, recordTranscripts);

        if (job.hasRecords && !config.enable_stt) {
          targetText += '\n注意：当前消息含语音，但听写功能未开启。不要假装听到了语音细节，只能请对方补文字。';
        } else if (job.hasRecords && skipHeavyEnhancements) {
          targetText += '\n注意：当前消息含语音，但队列积压已跳过听写。不要假装听到了语音细节，只能请对方补文字。';
        } else if (sttTruncated) {
          targetText += `\n注意：本条消息含${job.recordUrls.length}条语音，当前最多听写前${sttLimit}条。不要假装听到了其余语音。`;
        }

        if (job.hasImages && !config.enable_vision) {
          targetText += '\n注意：当前消息含图片，但识图功能未开启。不要假装看到了图片细节，只能按文字上下文回应或请对方补充说明。';
        } else if (job.hasImages && skipHeavyEnhancements) {
          targetText += '\n注意：当前消息含图片，但队列积压已跳过识图。不要假装看到了图片细节，只能按文字上下文回应。';
        }

        if (job.hasImages && config.enable_vision && !skipHeavyEnhancements) {
          const limit = Math.max(1, Math.min(config.vision_max_images || 2, 4));
          const totalImages = job.imageInputCount || job.imageUrls.length;
          const visionCacheTargets = uniqueNonEmpty(job.imageUrls).slice(0, limit);
          const visionCacheBefore = compactVisionCacheInspect(inspectImageCacheSources(visionCacheTargets, limit));
          if (visionCacheBefore.length > 0) {
            patchReplyTrace(job.messageId, { visionCacheBefore });
          }
          if (totalImages > limit) {
            targetText += `\n注意：当前消息解析到${totalImages}张图片，本次最多处理前${limit}张；不要描述没有实际传入模型的图片。`;
          }
          const resolvedVision = await resolveVisionDataUrls(ctx, job, limit);
          if (shouldAbortStaleReplyJob(job, 'vision')) return;
          const dataUrls = resolvedVision.dataUrls;
          const visionCacheAfter = compactVisionCacheInspect(inspectImageCacheSources(visionCacheTargets, limit));

          if (dataUrls.length > 0) {
            const parts: MessageContent[] = [{ type: 'text', text: targetText }];
            for (const dataUrl of dataUrls) {
              parts.push({ type: 'image_url', image_url: { url: dataUrl, detail: 'high' } });
            }
            apiCurrentMessage = { role: 'user', content: parts };
            usesVisionPayload = true;
            visionImagesPassed = dataUrls.length;
            patchReplyTrace(job.messageId, {
              visionPayload: true,
              visionImages: dataUrls.length,
              visionLimit: limit,
              visionTruncated: totalImages > dataUrls.length || totalImages > limit,
              visionDataInfo: dataUrls.slice(0, 3).map(describeDataUrl),
              visionCacheAfter: visionCacheAfter.length > 0 ? visionCacheAfter : undefined,
            });
            logger.info(`[Vision] 群${job.chatId} 成功加载${dataUrls.length}/${totalImages || dataUrls.length}张图(high detail)`);
          } else {
            const imageStats = getImageCacheStats();
            const visionError = resolvedVision.error || imageStats.lastError || 'unknown';
            patchReplyTrace(job.messageId, {
              visionError,
              visionImages: 0,
              visionLimit: limit,
              visionCacheAfter: visionCacheAfter.length > 0 ? visionCacheAfter : undefined,
            });
            logger.error(`[Vision] 群${job.chatId} 图片下载失败 url数=${totalImages} 最后错误=${visionError}`);
            targetText += `\n注意：当前消息含${totalImages}张图片，但图片下载失败(${visionError.slice(0, 50)})，模型实际上看不到图。不要编造图片细节，可以让对方重发或补充文字。`;
            apiCurrentMessage = { role: 'user', content: targetText };
          }
        } else {
          apiCurrentMessage = { role: 'user', content: targetText };
        }

        // 检查压缩（异步，不阻塞）
        const gates = getGateStats();
        const shouldDeferCompression = config.context_compression_defer_when_busy !== false && (
          getQueueStats(job.sessionId).pending > 1 ||
          gates.ai.queued > 0 ||
          gates.ai.active >= gates.ai.limit
        );
        if (!compressionInFlight.has(job.sessionId) && cm.needsCompression(job.sessionId)) {
          const oldMessages = cm.getOldMessagesToCompress(job.sessionId);
          if (oldMessages.length > 0) {
            if (shouldDeferCompression) {
              deferredCompressions++;
            } else {
              compressionInFlight.add(job.sessionId);
              withGate('ai', () => summarizeMessages(config, oldMessages), false)
                .then(summary => {
                  if (isReplyJobStale(job)) return;
                  if (summary) {
                    cm.applyCompression(job.sessionId, summary);
                    completedCompressions++;
                    logger.info(`[Context] ${job.chatType}${job.chatId} 压缩${oldMessages.length}条`);
                  }
                })
                .catch(() => {
                  failedCompressions++;
                })
                .finally(() => compressionInFlight.delete(job.sessionId));
            }
          }
        }
        if (shouldAbortStaleReplyJob(job, 'compression schedule')) return;

        // ===== 联网搜索（按需 不阻塞）=====
        let searchInfo = '';
        const searchableText = job.effectiveText || recordTranscriptText;
        if (!skipHeavyEnhancements && shouldSearch(config, searchableText)) {
          try {
            const timeoutMs = config.search_timeout_ms || 4000;
            const searchPromise = webSearch(
              searchableText,
              timeoutMs,
              config.search_cache_seconds ?? 300,
              config.search_negative_cache_seconds ?? 60,
            );
            const timeoutPromise = new Promise<string>((r) => {
              const timer = setTimeout(() => r(''), timeoutMs);
              timer.unref();
            });
            const result = await Promise.race([searchPromise, timeoutPromise]);
            if (shouldAbortStaleReplyJob(job, 'search')) return;
            if (result) searchInfo = result.slice(0, 1000);
          } catch (err) {
            if (shouldAbortStaleReplyJob(job, 'search error')) return;
            patchReplyTrace(job.messageId, {
              searchError: err instanceof Error ? err.message.slice(0, 120) : String(err).slice(0, 120),
            });
          }
        }
        patchReplyTrace(job.messageId, {
          searchUsed: !!searchInfo,
          searchChars: searchInfo.length,
        });

        // ===== CS 实时意图识别 =====
        // 普通聊天只识别“这是时效事实”，不再因为比赛/排名关键词自动抓 HLTV 大包。
        // 需要实时数据时让用户显式走 /cs、/predict、/player 等命令，避免群聊突然变成证据报告。
        let hltvInfo = '';
        let hltvLabels: string[] = [];
        let csRealtimeIntent = false;
        if (searchableText) {
          const csTopic = detectCsTopicQuery(searchableText);
          const explicitMatchIntent = !!extractCsMatchDetailId(searchableText);
          const playerOrTeamRealtimeIntent =
            /\b(zywoo|donk|niko|m0nesy|s1mple|ropz|sh1ro|magixx|jl|b1t|hunter|aleksib|karrigan|device|broky|frozen|apex|mezii|flamez|jimpphat|siuhy|kscerato|yuurih|cadian|navi|vitality|spirit|faze|mouz|g2|falcons|astralis|liquid|furia|heroic|mongolz|tyloo|lynn|cloud9)\b/i.test(searchableText)
            && /(?:现在|最近|今天|当前|最新|状态|表现|怎么样|怎样|表现如何|战绩|阵容|转会)/.test(searchableText);
          csRealtimeIntent = csTopic.needsMatches || csTopic.needsRanking || csTopic.needsResults || explicitMatchIntent || playerOrTeamRealtimeIntent;
        }
        patchReplyTrace(job.messageId, {
          hltvUsed: !!hltvInfo,
          hltvChars: hltvInfo.length,
          realtimeIntent: csRealtimeIntent,
        });


        const knowledgeTopicProbe = [
          job.effectiveText,
          recordTranscriptText,
          searchInfo,
          ...getKnowledgeKeywords().filter((keyword) => searchableText.toLowerCase().includes(keyword.toLowerCase())),
        ].join('\n');
        let hasKnowledgeTopic = isKnowledgeTopic(knowledgeTopicProbe);
        let knowledgeInfo = '';
        let knowledgeSignature = '';
        let knowledgeTitles: string[] = [];
        let knowledgeLanes: string[] = [];
        let knowledgeFreshnessIssues: string[] = [];
        let knowledgeFreshnessRiskIssues: KnowledgeFreshnessIssue[] = [];
        if (config.enable_knowledge !== false) {
          const knowledgeRoute = buildKnowledgeRoutePreview(config, job.effectiveText, {
            triggerReason: job.triggerReason,
            hasImages: job.hasImages,
            hasRecords: job.hasRecords,
            searchInfo,
            recordTranscriptText,
          });
          hasKnowledgeTopic = knowledgeRoute.hasKnowledgeTopic;
          knowledgeInfo = knowledgeRoute.knowledgeInfo;
          knowledgeTitles = knowledgeRoute.titles;
          knowledgeLanes = formatKnowledgeLaneSummary(knowledgeRoute.lanes);
          knowledgeFreshnessRiskIssues = knowledgeRoute.freshnessIssues;
          knowledgeFreshnessIssues = formatKnowledgeFreshnessTraceItems(knowledgeRoute.freshnessIssues);
          knowledgeSignature = knowledgeRoute.signature;
          patchReplyTrace(job.messageId, { knowledgeTitles, knowledgeLanes, knowledgeFreshnessIssues });
        }
        patchReplyTrace(job.messageId, {
          knowledgeInjected: !!knowledgeInfo,
          knowledgeChars: knowledgeInfo.length,
          knowledgeTopic: hasKnowledgeTopic,
        });
        const userProfileInfo = buildUserProfileRuntimeHint(job.chatType, job.chatId, job.userId);
        patchReplyTrace(job.messageId, {
          userProfileInjected: !!userProfileInfo,
          userProfileChars: userProfileInfo.length,
        });

        // ===== 构建发给API的消息 =====
        // 注意：history是除当前消息外的历史（当前已经append了，需要排除最后一条）
        const preliminaryGovernance = config.conversation_governance_enabled !== false
          ? buildConversationGovernanceDecision(config, {
            userId: job.userId,
            repliedMessageId: job.repliedMessageId,
            effectiveText: job.effectiveText,
            hasImages: job.hasImages,
            hasRecords: job.hasRecords,
            contextMessages: job.contextMessages,
            forced: job.forced,
            groupChatBusy: job.groupChatBusy,
            hasCurrentRealtimeData: false,
            recordTranscriptText,
            searchUsed: !!searchInfo,
            knowledgeTopic: hasKnowledgeTopic,
          })
          : null;
        const sendLimit = Math.max(8, preliminaryGovernance?.memory.shortTermMessages ?? config.context_send_messages ?? 25);
        const focusedHistory = buildFocusedHistory(job, sendLimit);
        const history = focusedHistory.history;
        const systemPrompt = buildSystemPrompt(config);

        // 检索相似历史（基于当前消息文本）- 仅当有有意义的查询文本时
        let similarMemories = '';
        let memoryHits = 0;
        let memoryFiltered = 0;
        let memoryFilterReasons: string[] = [];
        let memoryPreview: string[] = [];
        const memoryQuery = job.effectiveText || recordTranscriptText;
        if (config.enable_memory_retrieval !== false && memoryQuery && memoryQuery.length >= 4) {
          try {
            const minSimilarity = config.memory_min_similarity ?? 0.18;
            const topK = preliminaryGovernance?.memory.longTermTopK ?? config.memory_top_k ?? 4;
            const recent = cm.retrieveSimilar(
              job.sessionId,
              memoryQuery,
              Math.max(Math.max(0, topK) + 8, 12),
              minSimilarity,
            );
            // 过滤掉与最近history已经包含的重复
            const recentTextSet = new Set(history
              .slice(-10)
              .map((m) => typeof m.content === 'string' ? normalizeMemoryDuplicateText(m.content) : '')
              .filter(Boolean));
            const eligible = recent
              .filter((r) => r.similarity >= minSimilarity && !recentTextSet.has(normalizeMemoryDuplicateText(r.text)));
            const truthRisk = filterMemoryTruthRisk(memoryQuery, eligible, csRealtimeIntent);
            memoryFiltered = truthRisk.filtered.length;
            memoryFilterReasons = truthRisk.reasons;
            const useful = truthRisk.kept
              .slice(0, Math.max(0, topK));
            if (useful.length > 0 || memoryFiltered > 0) {
              const budget = Math.max(0, preliminaryGovernance?.memory.longTermChars ?? config.memory_inject_max_chars ?? cm.getMemoryInjectMaxChars());
              if (budget > 0) {
                const lines: string[] = [];
                let used = 0;
                let injectedMemoryLines = 0;
                if (memoryFiltered > 0) {
                  const reason = memoryFilterReasons.length ? memoryFilterReasons.join('/') : '旧实时事实';
                  const line = `[RAG过滤] 已跳过${memoryFiltered}条疑似${reason}记忆；当前排名/比分/阵容/转会只按本条实时证据判断，不从历史记忆补。`;
                  lines.push(line);
                  used += line.length;
                }
                for (const r of useful) {
                  const score = r.score !== undefined ? ` score=${r.score}` : '';
                  const age = r.ageSeconds !== undefined ? ` age=${formatMemoryAge(r.ageSeconds)}` : '';
                  const line = `[${r.role} sim=${r.similarity}${score}${age}] ${r.text.replace(/^\[mid=\d+\s+uid=\d+\]\s*/, '').slice(0, 220)}`;
                  if (used + line.length > budget && lines.length > 0) break;
                  lines.push(line);
                  used += line.length;
                  injectedMemoryLines++;
                }
                similarMemories = lines.join('\n').slice(0, budget);
                memoryPreview = useful
                  .slice(0, 3)
                  .map((r) => `${r.role}:${r.score ?? r.similarity}/${r.similarity} ${previewText(r.text.replace(/^\[mid=\d+\s+uid=\d+\]\s*/, ''), 44)}`);
                memoryHits = injectedMemoryLines;
              }
            }
          } catch { /* 失败不阻塞 */ }
        }

        const hasRealtimeData = csRealtimeIntent ? !!hltvInfo : !!searchInfo;
        const evidenceSummary = summarizeRealtimeEvidence(searchInfo, hltvLabels, knowledgeTitles, memoryHits);
        const searchEvidence = extractEvidenceLines(searchInfo, 4);
        const realtimeFreshness = extractRealtimeFreshnessLines(searchInfo, 5);
        const realtimeStaleEvidence = realtimeFreshness.some((line) => /\bstale\b|过期|不能当实时结论/i.test(line))
          || /(?:^|\n)\s*(?:缓存|当前缓存)\s*[:：].*(?:\bstale\b|过期|不能当实时结论)/i.test(searchInfo);
        const hasFreshRealtimeEvidence = realtimeFreshness.some((line) => /\bfresh\b/i.test(line));
        const staleOnlyRealtimeEvidence = csRealtimeIntent && realtimeStaleEvidence && !hasFreshRealtimeEvidence;
        const hasCurrentRealtimeData = hasRealtimeData && !staleOnlyRealtimeEvidence;
        const evidenceGuardContext: EvidenceLedgerGuardContext = {
          realtimeStaleEvidence,
          memoryFiltered,
        };
        const styleScene = buildStyleSceneDecision(job, recordTranscriptText, csRealtimeIntent, hasCurrentRealtimeData);
        const governance = config.conversation_governance_enabled !== false
          ? buildConversationGovernanceDecision(config, {
            userId: job.userId,
            repliedMessageId: job.repliedMessageId,
            effectiveText: job.effectiveText,
            hasImages: job.hasImages,
            hasRecords: job.hasRecords,
            contextMessages: job.contextMessages,
            forced: job.forced,
            groupChatBusy: job.groupChatBusy,
            hasCurrentRealtimeData,
            recordTranscriptText,
            searchUsed: !!searchInfo,
            knowledgeTopic: hasKnowledgeTopic,
          })
          : null;
        const styleSceneInfo = [
          formatStyleScenePrompt(styleScene, hasCurrentRealtimeData, job),
          governance ? formatConversationGovernancePrompt(governance) : '',
        ].filter(Boolean).join('\n\n');
        const apiMessages = buildApiMessages({
          systemPrompt,
          summary: job.contextSummary,
          history,
          currentMessage: apiCurrentMessage,
          searchInfo,
          knowledgeInfo,
          similarMemories,
          styleSceneInfo,
          userProfileInfo,
        });
        patchReplyTrace(job.messageId, {
          contextMessagesSent: history.length,
          contextFocused: focusedHistory.focused,
          memoryHits,
          memoryFiltered,
          memoryFilterReasons,
          memoryPreview,
          realtimeIntent: csRealtimeIntent,
          realtimeDataAvailable: hasCurrentRealtimeData,
          evidenceSummary,
          searchEvidence,
          realtimeFreshness,
          realtimeStaleEvidence,
          governanceDecision: governance ? formatConversationGovernanceTrace(governance) : undefined,
          governanceHints: governance?.hints,
          styleScene: styleScene.scene,
          styleSceneAction: styleScene.action,
          styleSceneSignals: styleScene.signals,
          styleSceneNeedsRealtime: styleScene.needsRealtime,
        });

        // ===== 调用 AI =====
        // 时间/日期类问题永远不缓存（因为答案随时间变化）
        const isTimeSensitive = /(?:今天|今日|现在|当前|此刻|此时|目前|今晚|今早|今夜|刚才|几号|几点|几月|星期|周[一二三四五六日天])/.test(job.effectiveText || '');
        const cachePolicy = buildReplyCachePolicy(config, job, styleScene, searchInfo, isTimeSensitive, hasRealtimeData);
        patchReplyTrace(job.messageId, {
          cachePolicy: formatReplyCachePolicy(cachePolicy),
          cacheTtlSeconds: cachePolicy.enabled ? cachePolicy.ttlSeconds : undefined,
        });
        const replyCacheKey = cachePolicy.enabled ? makeReplyCacheKey(config, job.effectiveText, knowledgeSignature, cachePolicy.scope) : '';
        if (replyCacheKey) {
          patchReplyTrace(job.messageId, { cacheKeyPrefix: replyCacheKeyPrefix(replyCacheKey) });
        } else {
          appendReplyCacheDecision(job.messageId, `bypass ${cachePolicy.reason}`);
        }
        const cacheEntryBefore = replyCacheKey ? inspectReplyCacheKey(replyCacheKey) : undefined;
        let cleaned = replyCacheKey ? getCachedReply(replyCacheKey) : null;
        let cacheHit = !!cleaned;
        if (replyCacheKey) {
          appendReplyCacheDecision(
            job.messageId,
            cleaned
              ? `hit key=${replyCacheKeyPrefix(replyCacheKey)}`
              : cacheEntryBefore?.state === 'expired'
                ? `expired key=${replyCacheKeyPrefix(replyCacheKey)}`
                : `miss key=${replyCacheKeyPrefix(replyCacheKey)}`,
            replyCacheKey,
          );
        }
        if (cleaned && looksLikeInactiveActivationReply(cleaned)) {
          if (replyCacheKey) deleteCachedReply(replyCacheKey);
          cleaned = null;
          cacheHit = false;
          appendReplyCacheDecision(job.messageId, 'discard inactive-activation', replyCacheKey);
          patchReplyTrace(job.messageId, {
            error: 'cached inactive activation reply discarded',
          });
        }
        if (cleaned) {
          const cachedGuard = guardReplyFactsForJob(job, cleaned, hasCurrentRealtimeData, knowledgeFreshnessRiskIssues, hltvLabels, realtimeFreshness, evidenceGuardContext);
          if (cachedGuard.text !== cleaned) {
            if (replyCacheKey) deleteCachedReply(replyCacheKey);
            cleaned = cachedGuard.text;
            cacheHit = false;
            appendReplyCacheDecision(job.messageId, 'discard factguard', replyCacheKey);
            patchReplyTrace(job.messageId, {
              factGuard: cachedGuard.reason,
              freshnessRepair: 'cached reply guarded by knowledge freshness risk',
            });
          }
          const cachedMediaGuard = guardMultimodalPerceptionForJob(job, cleaned, {
            usesVisionPayload,
            visionImages: visionImagesPassed,
            recordTranscripts,
            sttTruncated: sttTruncated === true,
          });
          if (cachedMediaGuard.text !== cleaned) {
            if (replyCacheKey) deleteCachedReply(replyCacheKey);
            cleaned = cachedMediaGuard.text;
            cacheHit = false;
            appendReplyCacheDecision(job.messageId, 'discard multimodal-guard', replyCacheKey);
          }
          const cachedQuality = assessReplyQuality(cleaned, job, hasCurrentRealtimeData);
          if (!cachedQuality.ok) {
            if (replyCacheKey) deleteCachedReply(replyCacheKey);
            cleaned = null;
            cacheHit = false;
            appendReplyCacheDecision(job.messageId, `discard quality:${cachedQuality.issues.join('/')}`, replyCacheKey);
            patchReplyTrace(job.messageId, {
              error: `cached low-quality reply discarded: ${cachedQuality.issues.join('/')}`,
              qualityIssues: cachedQuality.issues,
              qualityFinalOk: false,
            });
          } else {
            patchReplyTrace(job.messageId, { qualityFinalOk: true });
          }
        }
        if (cleaned && isRecentReplyDuplicate(job.sessionId, cleaned)) {
          if (replyCacheKey) deleteCachedReply(replyCacheKey);
          cleaned = null;
          cacheHit = false;
          appendReplyCacheDecision(job.messageId, 'discard duplicate same-session', replyCacheKey);
          patchReplyTrace(job.messageId, {
            freshnessRepair: 'cached duplicate discarded, regenerated',
          });
        }
        const generateReply = async (): Promise<InFlightReplyResult> => {
          const maxAttempts = job.forced ? 5 : 2;
          const reply = await withGate('ai', () => callLLMWithRetryForJob(job, config, apiMessages, usesVisionPayload, maxAttempts), job.forced);
          if (shouldAbortStaleReplyJob(job, 'llm')) return { value: '', reusable: false };
          const rawIdentityBoundaryClaim = hasRealityBoundaryClaim(reply);
          const rawQuoteBoundaryClaim = hasUnsupportedOriginalQuoteClaim(reply);
          let next = postProcessReply(reply);
          const boundaryRepairs = [
            rawIdentityBoundaryClaim && next !== reply ? 'identity boundary enforced' : '',
            rawQuoteBoundaryClaim && next !== reply ? 'original quote boundary enforced' : '',
          ].filter(Boolean);
          if (boundaryRepairs.length > 0) {
            patchReplyTrace(job.messageId, {
              factGuard: boundaryRepairs.join(' / '),
            });
          }
          if (looksLikeInactiveActivationReply(next)) {
            const badReply = next;
            try {
              const retryMessages = buildInactiveActivationRetryMessages(apiMessages, badReply);
              const retryReply = await withGate('ai', () => callLLMWithRetryForJob(job, config, retryMessages, usesVisionPayload, 1), job.forced);
              if (shouldAbortStaleReplyJob(job, 'inactive retry llm')) return { value: '', reusable: false };
              const retryCleaned = postProcessReply(retryReply);
              next = retryCleaned && !looksLikeInactiveActivationReply(retryCleaned) ? retryCleaned : '';
              patchReplyTrace(job.messageId, {
                outputRepair: next ? 'inactive activation reply retried' : 'inactive activation retry still invalid',
              });
            } catch (err) {
              if (shouldAbortStaleReplyJob(job, 'inactive retry error')) return { value: '', reusable: false };
              const retryError = err instanceof Error ? err.message : String(err);
              next = '';
              patchReplyTrace(job.messageId, {
                error: `inactive activation retry failed: ${retryError.slice(0, 120)}`,
              });
            }
          }
          const beforeFactGuard = next;
          const factGuard = guardReplyFactsForJob(job, beforeFactGuard, hasCurrentRealtimeData, knowledgeFreshnessRiskIssues, hltvLabels, realtimeFreshness, evidenceGuardContext);
          next = factGuard.text;
          if (next !== beforeFactGuard) {
            patchReplyTrace(job.messageId, { factGuard: factGuard.reason });
          }
          const mediaGuard = guardMultimodalPerceptionForJob(job, next, {
            usesVisionPayload,
            visionImages: visionImagesPassed,
            recordTranscripts,
            sttTruncated: sttTruncated === true,
          });
          next = mediaGuard.text;
          if (next) {
            const quality = assessReplyQuality(next, job, hasCurrentRealtimeData);
            if (!quality.ok) {
              patchReplyTrace(job.messageId, {
                qualityIssues: quality.issues,
                qualityFinalOk: false,
              });
              try {
                const retryMessages = buildReplyQualityRepairMessages(apiMessages, next, quality, job, hasCurrentRealtimeData);
                const retryReply = await withGate('ai', () => callLLMWithRetryForJob(job, config, retryMessages, usesVisionPayload, 1), job.forced);
                if (shouldAbortStaleReplyJob(job, 'quality repair llm')) return { value: '', reusable: false };
                const retryBeforeGuard = postProcessReply(retryReply);
                const retryFactGuard = guardReplyFactsForJob(job, retryBeforeGuard, hasCurrentRealtimeData, knowledgeFreshnessRiskIssues, hltvLabels, realtimeFreshness, evidenceGuardContext);
                let retryCleaned = retryFactGuard.text;
                if (retryCleaned !== retryBeforeGuard) {
                  patchReplyTrace(job.messageId, { factGuard: `${retryFactGuard.reason} in repair` });
                }
                const retryMediaGuard = guardMultimodalPerceptionForJob(job, retryCleaned, {
                  usesVisionPayload,
                  visionImages: visionImagesPassed,
                  recordTranscripts,
                  sttTruncated: sttTruncated === true,
                });
                retryCleaned = retryMediaGuard.text;
                const retryQuality = assessReplyQuality(retryCleaned, job, hasCurrentRealtimeData);
                if (retryCleaned && retryQuality.ok) {
                  next = retryCleaned;
                  patchReplyTrace(job.messageId, {
                    outputRepair: `quality retry: ${quality.issues.join('/')}`,
                    qualityFinalOk: true,
                  });
                } else {
                  patchReplyTrace(job.messageId, {
                    outputRepair: `quality kept with guard: ${quality.issues.join('/')}`,
                    qualityIssues: retryQuality.issues.length ? retryQuality.issues : quality.issues,
                    qualityFinalOk: false,
                  });
                }
              } catch (err) {
                if (shouldAbortStaleReplyJob(job, 'quality repair error')) return { value: '', reusable: false };
                patchReplyTrace(job.messageId, {
                  outputRepair: `quality repair failed: ${quality.issues.join('/')}`,
                  qualityIssues: quality.issues,
                  qualityFinalOk: false,
                });
              }
            } else {
              patchReplyTrace(job.messageId, { qualityFinalOk: true });
            }
          }
          const finalCacheQuality = next ? assessReplyQuality(next, job, hasCurrentRealtimeData) : { ok: false, issues: ['empty'] };
          const reusable = finalCacheQuality.ok && isReplyReusableForCache(next, job);
          const reuseRejectedReason = reusable
            ? undefined
            : !next
              ? 'empty'
              : !finalCacheQuality.ok
                ? `quality:${finalCacheQuality.issues.join('/')}`
                : 'context-bound';
          if (replyCacheKey && next && reusable) {
            setCachedReply(replyCacheKey, next, cachePolicy.ttlSeconds, config.ai_reply_cache_max_entries);
            appendReplyCacheDecision(job.messageId, `stored ttl=${cachePolicy.ttlSeconds}s`, replyCacheKey);
          } else if (replyCacheKey) {
            appendReplyCacheDecision(job.messageId, `not-stored ${reuseRejectedReason}`, replyCacheKey);
          }
          return { value: next, reusable, reuseRejectedReason };
        };

        if (!cleaned) {
          const pending = replyCacheKey ? getInFlightReply(replyCacheKey) : null;
          if (pending) {
            appendReplyCacheDecision(job.messageId, 'single-flight wait', replyCacheKey);
            const result = await pending;
            if (shouldAbortStaleReplyJob(job, 'reply single-flight')) return;
            if (result.reusable) {
              cleaned = result.value;
              cacheHit = true;
              appendReplyCacheDecision(job.messageId, 'single-flight reused', replyCacheKey);
            } else {
              appendReplyCacheDecision(job.messageId, `single-flight non-reusable:${result.reuseRejectedReason || 'unknown'}`, replyCacheKey);
              cleaned = (await generateReply()).value;
            }
          } else {
            if (replyCacheKey) {
              recordReplyCacheMiss();
              appendReplyCacheDecision(job.messageId, 'generate', replyCacheKey);
            }
            const generated = generateReply();
            if (replyCacheKey) setInFlightReply(replyCacheKey, generated);
            cleaned = (await generated).value;
          }
        }

        if (!cleaned) {
          // 空回复
          // - 普通主动接话: 直接吞掉，下次触发时 AI 自然带上上下文
          // - forced (@bot/回复/私聊/命令): 必须给出回复，用 forcedFallbackReply 兜底
          if (job.forced) {
            const fb = buildForcedApiFailureReply(job, 'AI returned empty', recordTranscripts);
            if (shouldAbortStaleReplyJob(job, 'empty fallback')) return;
            if (fb) {
              const useQuoteFb = config.forced_reply_quote !== false;
              if (useQuoteFb) ctx.replyQuoteTo(job.messageId, job.userId, fb);
              else ctx.reply(fb);
            }
            patchReplyTrace(job.messageId, {
              sent: 'fallback',
              error: 'AI returned empty, used fallback',
              replyLength: fb.length,
            });
          }
          return;
        }
        const openerResult = dedupeSessionOpener(job.sessionId, cleaned);
        cleaned = openerResult.text;

        // 全句去重检查 - 如果跟最近 5 条 bot 回复内容重复，重新生成一次
        if (isRecentReplyDuplicate(job.sessionId, cleaned) && !cacheHit) {
          logger.info(`[AI][${job.chatType}${job.chatId}] 检测到重复回复，重新生成 origin="${cleaned.slice(0, 30)}"`);
          try {
            const retryMessages: ChatMessage[] = [
              ...apiMessages,
              { role: 'assistant', content: cleaned },
              { role: 'user', content: '这条跟你之前说过的太像了，换个角度或换种说法，别重复。' },
            ];
            const retryReply = await withGate('ai', () => callLLMWithRetryForJob(job, config, retryMessages, usesVisionPayload, 1), job.forced);
            if (shouldAbortStaleReplyJob(job, 'duplicate retry llm')) return;
            const retryBeforeGuard = postProcessReply(retryReply);
            const retryFactGuard = guardReplyFactsForJob(job, retryBeforeGuard, hasCurrentRealtimeData, knowledgeFreshnessRiskIssues, hltvLabels, realtimeFreshness, evidenceGuardContext);
            const retryMediaGuard = guardMultimodalPerceptionForJob(job, retryFactGuard.text, {
              usesVisionPayload,
              visionImages: visionImagesPassed,
              recordTranscripts,
              sttTruncated: sttTruncated === true,
            });
            const retryCleaned = retryMediaGuard.text;
            if (retryCleaned !== retryBeforeGuard) {
              const guardReasons = [retryFactGuard.reason, retryMediaGuard.reason].filter(Boolean).join(' / ');
              patchReplyTrace(job.messageId, { factGuard: `${guardReasons} in duplicate repair` });
            }
            if (retryCleaned && !isRecentReplyDuplicate(job.sessionId, retryCleaned)) {
              cleaned = retryCleaned;
              patchReplyTrace(job.messageId, {
                sent: 'queued',
                replyLength: cleaned.length,
                freshnessRepair: 'duplicate reply regenerated',
              });
            }
          } catch { /* 失败就用原文 */ }
        }

        recordRecentReply(job.sessionId, cleaned);

        patchReplyTrace(job.messageId, {
          cacheHit,
          replyLength: cleaned.length,
          openerBefore: openerResult.before,
          openerAfter: openerResult.after,
          openerDeduped: openerResult.deduped,
        });

        if (shouldAbortStaleReplyJob(job, 'before context append')) return;

        // 追加AI回复
        cm.appendMessage(job.sessionId, { role: 'assistant', content: cleaned });

        // 发送
        const quoteStrongTrigger = job.forced && config.forced_reply_quote !== false;
        const quoteMention = config.must_reply_quote && (job.isReplyToBot || job.isAtBot);
        const useQuote = quoteStrongTrigger || quoteMention || Math.random() < 0.18;

        // 明确要求语音时必须尝试TTS；普通主动接话仍按概率，避免语音刷屏。
        let sentVoice = false;
        const maxVoiceChars = config.tts_max_chars || 120;
        const finalText = job.forceVoice ? clampVoiceText(cleaned, maxVoiceChars) : cleaned;
        const voiceAllowed = !skipVoice && config.enable_tts && finalText.length >= 2 && finalText.length <= maxVoiceChars;
        // forceVoice = 用户明确要求语音，必发语音
        // forced = @/reply/私聊/命令，按 tts_probability 概率发语音
        // 普通主动接话，按 tts_probability * 0.5 发（更克制）
        const ttsProbability = config.tts_probability ?? 0.15;
        const passiveVoiceProb = ttsProbability * 0.5;
        const shouldSendVoice = voiceAllowed && (
          job.forceVoice ||
          (job.forced && Math.random() < ttsProbability) ||
          (!job.forced && Math.random() < passiveVoiceProb)
        );
        let delayedBeforeSend = false;
        const waitBeforeSend = async (stage: string, sendText: string): Promise<boolean> => {
          if (delayedBeforeSend) return false;
          delayedBeforeSend = true;
          const delayMs = await applyHumanReplyDelay(config, job, sendText);
          if (delayMs > 0 && shouldAbortStaleReplyJob(job, stage)) {
            return true;
          }
          return false;
        };
        let voiceError = '';
        if (shouldSendVoice) {
          const voiceStatsBefore = getVoiceStats(config);
          lastVoiceTrace = {
            timestamp: Date.now(),
            mode: job.forceVoice ? 'ai-voice' : 'passive-voice',
            chatType: job.chatType,
            chatId: job.chatId,
            groupId: job.groupId,
            userId: job.userId,
            messageId: job.messageId,
            requestedTextPreview: previewText(job.rawText || job.effectiveText),
            spokenTextPreview: previewText(finalText),
            spokenTextWarm: finalText.slice(0, 240),
            parts: 1,
            sentParts: 0,
            provider: voiceStatsBefore.provider,
            sendMode: voiceStatsBefore.sendMode,
            lastTtsMode: voiceStatsBefore.lastMode,
          };
          rememberVoiceTrace(lastVoiceTrace);
          try {
            const voicePath = await withGate('tts', () => generateVoice(config, finalText), job.forced || job.forceVoice);
            if (shouldAbortStaleReplyJob(job, 'reply tts')) {
              voiceError = 'stale runtime after reply tts';
              return;
            }
            if (voicePath) {
              // QQ/NapCat 对 reply + record 组合兼容性差，部分客户端会显示但无法播放。
              // 语音消息保持纯 record；只有文本兜底才引用原消息。
              if (await waitBeforeSend('voice human delay', finalText)) {
                voiceError = 'stale runtime after voice human delay';
                return;
              }
              ctx.reply([voiceRecordSegment(config, voicePath)]);
              sentVoice = true;
            }
          } catch (err) {
            voiceError = err instanceof Error ? err.message : String(err);
          } finally {
            const voiceStatsAfter = getVoiceStats(config);
            lastVoiceTrace = {
              ...lastVoiceTrace,
              timestamp: Date.now(),
              sentParts: sentVoice ? 1 : 0,
              provider: voiceStatsAfter.provider,
              sendMode: voiceStatsAfter.sendMode,
              lastTtsMode: voiceStatsAfter.lastMode,
              error: voiceError || (!sentVoice ? voiceStatsAfter.lastError || 'tts failed' : undefined),
            };
            rememberVoiceTrace(lastVoiceTrace);
          }
        }

        if (!sentVoice) {
          if (shouldAbortStaleReplyJob(job, 'text send')) return;
          if (job.forceVoice) {
            cleaned = `语音这下没生成出来 ${cleaned}`;
          }
          // 解析 [face:N] / 命名表情 / [sticker:N] 标记，转换成 QQ 表情段
          // parseStickerMarkers 是更全面的（含命名表情和本地表情包），parseFaceMarkers 只支持数字
          const faceSegments = parseStickerMarkers(cleaned) || parseFaceMarkers(cleaned);
          if (await waitBeforeSend('text human delay', cleaned)) return;
          if (useQuote) {
            ctx.replyQuoteTo(job.messageId, job.userId, faceSegments || cleaned);
          } else {
            ctx.reply(faceSegments || cleaned);
          }
        }
        patchReplyTrace(job.messageId, {
          voiceRequested: job.forceVoice || shouldSendVoice,
          voiceMode: shouldSendVoice ? (job.forceVoice ? 'ai-voice' : 'passive-voice') : 'none',
          voiceParts: sentVoice ? 1 : 0,
          sent: sentVoice ? 'voice' : (job.forceVoice ? 'voice+text-fallback' : 'text'),
          replyLength: cleaned.length,
          error: voiceError || undefined,
        });
        lastReplyAt.set(job.sessionId, Date.now());
      } catch (err) {
        if (shouldAbortStaleReplyJob(job, 'catch')) return;
        const errMsg = err instanceof Error ? err.message : String(err);
        logger.error(`[AI][${job.chatType}${job.chatId}] 失败:`, errMsg);
        patchReplyTrace(job.messageId, {
          sent: job.forced ? 'fallback' : 'skipped',
          error: errMsg.slice(0, 160),
        });
        if (job.forced) {
          const fb = buildForcedApiFailureReply(job, errMsg, recordTranscripts);
          if (shouldAbortStaleReplyJob(job, 'catch fallback')) return;
          if (fb) ctx.replyQuoteTo(job.messageId, job.userId, fb);
        }
      }
    }).catch((err) => {
      if (shouldAbortStaleReplyJob(job, 'queue catch')) return;
      const errMsg = err instanceof Error ? err.message : String(err);
      logger.error(`[AI][${job.chatType}${job.chatId}] 队列异常:`, errMsg);
      if (job.forced) {
        // 队列层异常 forced 必须给个回复
        try {
          const fb = buildForcedApiFailureReply(job, errMsg, []);
          if (shouldAbortStaleReplyJob(job, 'queue fallback')) return;
          if (fb) ctx.replyQuoteTo(job.messageId, job.userId, fb);
        } catch { /* */ }
      }
    });

    return true;
  },
};
