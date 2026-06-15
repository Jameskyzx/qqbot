import type { AIConfig } from '../types';
import { getVoiceStats } from './tts';
import {
  compactTraceList,
  formatRecordTrace,
  formatVisionCacheEvidence,
  formatVisionTrace,
} from './ai-media-trace';

export interface ReplyTrace {
  timestamp: number;
  chatType: 'group' | 'private';
  chatId: number;
  groupId?: number;
  userId: number;
  messageId: number;
  senderName: string;
  triggerReason: string;
  forced: boolean;
  command?: string | null;
  rawTextPreview: string;
  effectiveTextPreview: string;
  hasImages: boolean;
  imageInputCount?: number;
  imageSourceKinds?: string[];
  imageSources?: string[];
  hasRecords: boolean;
  recordInputCount?: number;
  recordSourceKinds?: string[];
  recordSources?: string[];
  recordTranscripts: number;
  sttLimit?: number;
  sttTruncated?: boolean;
  queueAgeMs: number;
  contextMessagesSent?: number;
  contextFocused?: boolean;
  memoryHits?: number;
  memoryFiltered?: number;
  memoryFilterReasons?: string[];
  memoryPreview?: string[];
  searchUsed: boolean;
  searchChars: number;
  searchEvidence?: string[];
  knowledgeInjected: boolean;
  knowledgeChars: number;
  knowledgeTopic: boolean;
  knowledgeTitles: string[];
  knowledgeLanes?: string[];
  knowledgeFreshnessIssues?: string[];
  userProfileInjected?: boolean;
  userProfileChars?: number;
  governanceDecision?: string;
  governanceHints?: string[];
  styleScene?: string;
  styleSceneAction?: string;
  styleSceneSignals?: string[];
  styleSceneNeedsRealtime?: boolean;
  qualityIssues?: string[];
  qualityFinalOk?: boolean;
  evidenceSummary?: string[];
  evidenceLedger?: string[];
  realtimeFreshness?: string[];
  realtimeStaleEvidence?: boolean;
  realtimeIntent?: boolean;
  realtimeDataAvailable?: boolean;
  factGuard?: string;
  openerBefore?: string;
  openerAfter?: string;
  openerDeduped?: boolean;
  humanDelayMs?: number;
  sttError?: string;
  visionError?: string;
  searchError?: string;
  hltvUsed?: boolean;
  hltvChars?: number;
  hltvError?: string;
  visionPayload: boolean;
  visionImages?: number;
  visionLimit?: number;
  visionTruncated?: boolean;
  visionDataInfo?: string[];
  visionCacheBefore?: string[];
  visionCacheAfter?: string[];
  voiceRequested: boolean;
  voiceMode: 'none' | 'direct-verbatim' | 'ai-voice' | 'passive-voice';
  voiceParts: number;
  sent: 'queued' | 'text' | 'voice' | 'voice+text-fallback' | 'fallback' | 'skipped';
  cacheHit: boolean;
  cachePolicy?: string;
  cacheDecision?: string;
  cacheKeyPrefix?: string;
  cacheTtlSeconds?: number;
  replyLength: number;
  outputRepair?: string;
  freshnessRepair?: string;
  error?: string;
}

export interface VoiceTrace {
  timestamp: number;
  mode: 'direct-verbatim' | 'ai-voice' | 'passive-voice';
  chatType: 'group' | 'private';
  chatId: number;
  groupId?: number;
  userId: number;
  messageId: number;
  requestedTextPreview: string;
  spokenTextPreview: string;
  spokenTextWarm?: string;
  parts: number;
  sentParts: number;
  provider: string;
  sendMode: string;
  lastTtsMode?: string;
  error?: string;
}

export function formatTraceTime(timestamp: number): string {
  return timestamp
    ? new Date(timestamp).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
    : '无';
}

export function buildEvidenceLedger(trace: ReplyTrace): string[] {
  const ledger: string[] = [];
  if (trace.realtimeIntent) {
    if (trace.realtimeDataAvailable) {
      ledger.push('当前事实=fresh优先');
    } else if (trace.realtimeStaleEvidence) {
      ledger.push('当前事实=仅stale线索');
    } else {
      ledger.push('当前事实=缺fresh证据');
    }
  } else if (trace.searchUsed || trace.hltvUsed) {
    ledger.push(`事实参考=${trace.hltvUsed ? 'HLTV/CS' : '搜索'}非实时问法`);
  } else {
    ledger.push('事实参考=未联网');
  }

  if (trace.realtimeFreshness?.length) {
    const freshCount = trace.realtimeFreshness.filter((line) => /\bfresh\b/i.test(line)).length;
    const staleCount = trace.realtimeFreshness.filter((line) => /\bstale\b|过期|不能当实时结论/i.test(line)).length;
    ledger.push(`实时证据=fresh${freshCount}/stale${staleCount}`);
  }

  if (trace.knowledgeInjected) {
    ledger.push(trace.knowledgeFreshnessIssues?.length
      ? `知识=${trace.knowledgeChars}字/时效风险${trace.knowledgeFreshnessIssues.length}`
      : `知识=${trace.knowledgeChars}字`);
  } else if (trace.knowledgeTopic) {
    ledger.push('知识=话题命中但未注入');
  }

  if (trace.memoryHits || trace.memoryFiltered) {
    ledger.push(`RAG=注入${trace.memoryHits || 0}/过滤${trace.memoryFiltered || 0}`);
  }

  if (trace.userProfileInjected) {
    ledger.push(`画像=个性化${trace.userProfileChars || 0}字/非事实`);
  }

  if (trace.governanceDecision) {
    ledger.push(`策略=${trace.governanceDecision.slice(0, 36)}`);
  }

  if (trace.hasImages) {
    ledger.push(trace.visionPayload
      ? `识图=已传图${trace.visionImages || 0}/${trace.imageInputCount || trace.visionImages || 0}${trace.visionTruncated ? '/截断' : ''}`
      : `识图=未传图${trace.visionError ? `/${trace.visionError.slice(0, 24)}` : ''}`);
  }

  if (trace.hasRecords) {
    ledger.push(trace.recordTranscripts > 0
      ? `听写=${trace.recordTranscripts}/${trace.recordInputCount || trace.recordTranscripts}${trace.sttTruncated ? '/截断' : ''}`
      : `听写=无转写${trace.sttError ? `/${trace.sttError.slice(0, 24)}` : ''}`);
  }

  if (trace.factGuard) ledger.push(`事实修正=${trace.factGuard.slice(0, 36)}`);
  if (trace.freshnessRepair) ledger.push(`新鲜度修正=${trace.freshnessRepair.slice(0, 36)}`);

  return ledger.slice(0, 10);
}

export function getTraceEvidenceLedger(trace: ReplyTrace): string[] {
  return trace.evidenceLedger && trace.evidenceLedger.length > 0
    ? trace.evidenceLedger
    : buildEvidenceLedger(trace);
}

export function formatReplyTraceCacheDecision(trace: ReplyTrace, maxLength = 140): string {
  const fallback = trace.cacheHit ? 'hit' : (trace.cachePolicy || 'miss');
  const decision = trace.cacheDecision || fallback;
  if (decision.length <= maxLength) return decision;
  return `${decision.slice(0, Math.max(20, maxLength - 1))}...`;
}

export function formatReplyTrace(trace: ReplyTrace | null): string {
  if (!trace) return '还没有回复 trace。先 @ 一句或跑 /voice test。';
  const evidenceLedger = getTraceEvidenceLedger(trace);
  return [
    '最近回复 trace',
    `时间: ${formatTraceTime(trace.timestamp)}`,
    `会话: ${trace.chatType} ${trace.chatId}${trace.groupId ? ` / group ${trace.groupId}` : ''}`,
    `消息: mid=${trace.messageId} uid=${trace.userId} ${trace.senderName}`,
    `触发: ${trace.triggerReason} forced=${trace.forced}`,
    trace.command ? `命令: /${trace.command}` : '',
    `原文: ${trace.rawTextPreview || '[空/媒体消息]'}`,
    trace.effectiveTextPreview && trace.effectiveTextPreview !== trace.rawTextPreview ? `有效文本: ${trace.effectiveTextPreview}` : '',
    `媒体: 图片${trace.hasImages ? `有${trace.imageInputCount ? `(${trace.imageInputCount})` : ''}${trace.imageSourceKinds?.length ? ` ${trace.imageSourceKinds.join('/')}` : ''}` : '无'} 语音${formatRecordTrace(trace)}`,
    `队列: 等待${Math.round(trace.queueAgeMs / 1000)}s`,
    trace.humanDelayMs ? `真人停顿: ${trace.humanDelayMs}ms` : '',
    trace.contextMessagesSent ? `上下文: ${trace.contextMessagesSent}条${trace.contextFocused ? ' (聚焦)' : ''}${trace.memoryHits ? ` 命中${trace.memoryHits}` : ''}` : '',
    trace.memoryFiltered ? `记忆过滤: ${trace.memoryFiltered}条${trace.memoryFilterReasons?.length ? ` ${compactTraceList(trace.memoryFilterReasons, 4)}` : ''}` : '',
    trace.memoryPreview && trace.memoryPreview.length > 0 ? `记忆: ${trace.memoryPreview.join(' / ')}` : '',
    `增强: 知识${trace.knowledgeInjected ? `${trace.knowledgeChars}字` : '未注入'}${trace.knowledgeTopic ? '/话题命中' : ''} 搜索${trace.searchUsed ? `${trace.searchChars}字` : '未用'} 识图${formatVisionTrace(trace)}`,
    formatVisionCacheEvidence(trace) ? `识图缓存: ${formatVisionCacheEvidence(trace)}` : '',
    `画像: ${trace.userProfileInjected ? `已注入${trace.userProfileChars || 0}字` : '未注入'}`,
    trace.governanceDecision ? `策略: ${trace.governanceDecision}${trace.governanceHints?.length ? ` | ${compactTraceList(trace.governanceHints, 4)}` : ''}` : '',
    evidenceLedger.length ? `证据账本: ${compactTraceList(evidenceLedger, 10)}` : '',
    `证据: 实时意图${trace.realtimeIntent ? '有' : '无'} 实时数据${trace.realtimeDataAvailable ? '有' : '无'}${trace.evidenceSummary?.length ? ` | ${compactTraceList(trace.evidenceSummary)}` : ''}`,
    trace.realtimeFreshness?.length ? `实时新鲜度: ${compactTraceList(trace.realtimeFreshness, 5)}${trace.realtimeStaleEvidence ? ' / 含stale' : ''}` : '',
    trace.searchEvidence?.length ? `搜索证据: ${compactTraceList(trace.searchEvidence, 4)}` : '',
    trace.hltvUsed ? `HLTV实时: 已注入${trace.hltvChars}字` : '',
    trace.hltvError ? `HLTV错误: ${trace.hltvError}` : '',
    trace.knowledgeTitles.length > 0 ? `知识分区: ${trace.knowledgeTitles.join(' / ')}` : (trace.forced ? '知识分区: 无命中，建议 /kb stats' : ''),
    trace.knowledgeLanes?.length ? `知识多路: ${trace.knowledgeLanes.join(' / ')}` : '',
    trace.knowledgeFreshnessIssues?.length ? `知识时效风险: ${compactTraceList(trace.knowledgeFreshnessIssues, 4)}` : '',
    trace.styleScene ? `风格场景: ${trace.styleScene}${trace.styleSceneNeedsRealtime ? '/需实时' : ''}${trace.styleSceneSignals?.length ? ` | ${compactTraceList(trace.styleSceneSignals, 5)}` : ''}${trace.styleSceneAction ? ` | ${trace.styleSceneAction}` : ''}` : '',
    trace.qualityIssues?.length ? `质量风险: ${compactTraceList(trace.qualityIssues, 5)}${trace.qualityFinalOk ? ' / 已修复' : ''}` : (trace.qualityFinalOk ? '质量风险: 无' : ''),
    trace.openerBefore ? `开头: ${trace.openerBefore} -> ${trace.openerAfter || '[空]'}${trace.openerDeduped ? ' 已去重' : ''}` : '',
    trace.sttError ? `听写错误: ${trace.sttError}` : '',
    trace.visionError ? `识图错误: ${trace.visionError}` : '',
    trace.searchError ? `搜索错误: ${trace.searchError}` : '',
    `语音: ${trace.voiceMode} requested=${trace.voiceRequested} parts=${trace.voiceParts}`,
    trace.cachePolicy ? `缓存策略: ${trace.cachePolicy}${trace.cacheTtlSeconds ? ` ttl=${trace.cacheTtlSeconds}s` : ''}` : '',
    `缓存判定: ${formatReplyTraceCacheDecision(trace)}${trace.cacheKeyPrefix && !trace.cacheDecision?.includes('key=') ? ` key=${trace.cacheKeyPrefix}` : ''}`,
    `发送: ${trace.sent} cacheHit=${trace.cacheHit} replyLen=${trace.replyLength}`,
    trace.outputRepair ? `修复: ${trace.outputRepair}` : '',
    trace.freshnessRepair ? `新鲜度: ${trace.freshnessRepair}` : '',
    trace.factGuard ? `事实边界: ${trace.factGuard}` : '',
    trace.error ? `错误: ${trace.error}` : '',
  ].filter(Boolean).join('\n');
}

export function formatReplyRecentList(
  traces: ReplyTrace[],
  totalCount: number,
  maxTraces: number,
  limit = 8,
): string {
  const safeLimit = Math.max(1, Math.min(Math.floor(limit) || 8, maxTraces));
  const selected = traces.slice(0, safeLimit);
  if (selected.length === 0) {
    return [
      '回复最近 trace',
      '最近: 无 AI/语音回复 trace',
      '说明: 只读最近真实回复链路；用于回看触发、发送、缓存、知识、实时证据、识图和语音。',
    ].join('\n');
  }
  return [
    `回复最近 trace ${selected.length}/${totalCount}`,
    ...selected.map((trace, index) => {
      const time = new Date(trace.timestamp).toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai' });
      const knowledge = trace.knowledgeInjected ? `${trace.knowledgeChars}字` : '无';
      const cache = formatReplyTraceCacheDecision(trace, 180);
      const quality = trace.qualityIssues?.length ? ` quality=${compactTraceList(trace.qualityIssues, 2)}` : (trace.qualityFinalOk ? ' quality=ok' : '');
      const realtime = trace.realtimeIntent ? ` realtime=${trace.realtimeDataAvailable ? 'data' : 'missing'}` : '';
      const ledger = compactTraceList(getTraceEvidenceLedger(trace), 2);
      const ledgerText = ledger ? ` ledger=${ledger}` : '';
      const memFilter = trace.memoryFiltered ? ` memFilter=${trace.memoryFiltered}` : '';
      const kbRisk = trace.knowledgeFreshnessIssues?.length ? ` kbRisk=${compactTraceList(trace.knowledgeFreshnessIssues, 1)}` : '';
      const guard = trace.factGuard ? ` guard=${trace.factGuard.slice(0, 60)}` : '';
      const visionCache = formatVisionCacheEvidence(trace, 1);
      const humanDelay = trace.humanDelayMs ? ` delay=${trace.humanDelayMs}ms` : '';
      const error = trace.error ? ` error=${trace.error.slice(0, 80)}` : '';
      const text = trace.rawTextPreview ? ` | ${trace.rawTextPreview}` : '';
      return `${index + 1}. ${time} mid=${trace.messageId} uid=${trace.userId} ${trace.chatType}=${trace.chatId} trigger=${trace.triggerReason} sent=${trace.sent}${humanDelay} cache=${cache} 知识=${knowledge} 识图=${formatVisionTrace(trace)}${visionCache ? ` visionCache=${visionCache}` : ''} 语音=${trace.voiceMode}/${trace.voiceParts}${realtime}${ledgerText}${memFilter}${kbRisk}${quality}${guard}${error}${text}`;
    }),
    '边界: 这里只有链路摘要；要看完整字段用 /trace last，实时事实仍以 fresh 证据为准。',
  ].join('\n');
}

export function formatVoiceTrace(trace: VoiceTrace | null, config?: AIConfig): string {
  const stats = getVoiceStats(config);
  if (!trace) {
    return [
      '最近语音 trace',
      '还没有语音发送记录。',
      `当前TTS: ${stats.provider}${stats.localReady ? '/local' : ''} send=${stats.sendMode} 克隆${stats.cloneEnabled ? (stats.cloneReady ? 'ready' : 'missing') : 'off'}`,
      ...(stats.lastMode ? [`最近TTS模式: ${stats.lastMode}`] : []),
      ...(stats.lastError ? [`最近错误: ${stats.lastError}`] : []),
    ].join('\n');
  }
  return [
    '最近语音 trace',
    `时间: ${formatTraceTime(trace.timestamp)}`,
    `会话: ${trace.chatType} ${trace.chatId}${trace.groupId ? ` / group ${trace.groupId}` : ''}`,
    `消息: mid=${trace.messageId} uid=${trace.userId}`,
    `模式: ${trace.mode}`,
    `请求文本: ${trace.requestedTextPreview || '[空]'}`,
    `实际念出: ${trace.spokenTextPreview || '[空]'}`,
    `分段: ${trace.sentParts}/${trace.parts}`,
    `TTS: ${trace.provider} send=${trace.sendMode}${trace.lastTtsMode ? ` mode=${trace.lastTtsMode}` : ''}`,
    trace.error ? `错误: ${trace.error}` : '',
    ...(stats.lastError && stats.lastError !== trace.error ? [`当前最近错误: ${stats.lastError}`] : []),
  ].filter(Boolean).join('\n');
}

export function formatVoiceRecentList(
  traces: VoiceTrace[],
  totalCount: number,
  maxTraces: number,
  limit = 8,
): string {
  const safeLimit = Math.max(1, Math.min(Math.floor(limit) || 8, maxTraces));
  const selected = traces.slice(0, safeLimit);
  if (selected.length === 0) {
    return [
      '语音最近记录',
      '最近: 无真实语音发送 trace',
      '说明: 只记录直读、AI转语音和被动语音的真实发送尝试；/voice check/cache/warm/stt 是诊断命令，不写入这里。',
    ].join('\n');
  }
  return [
    `语音最近记录 ${selected.length}/${totalCount}`,
    ...selected.map((trace, index) => {
      const time = new Date(trace.timestamp).toLocaleTimeString('zh-CN', { timeZone: 'Asia/Shanghai' });
      const error = trace.error ? ` error=${trace.error.slice(0, 80)}` : '';
      const mode = trace.lastTtsMode ? ` mode=${trace.lastTtsMode}` : '';
      const spoken = trace.spokenTextPreview ? ` | ${trace.spokenTextPreview}` : '';
      return `${index + 1}. ${time} mid=${trace.messageId} uid=${trace.userId} ${trace.chatType}=${trace.chatId} ${trace.mode} parts=${trace.sentParts}/${trace.parts} tts=${trace.provider}/${trace.sendMode}${mode}${error}${spoken}`;
    }),
    '边界: 这里只读最近语音链路，方便排查直读/AI转语音、分段、TTS后端、发送兜底和失败原因。',
  ].join('\n');
}

export function cloneReplyTrace(trace: ReplyTrace): ReplyTrace {
  return {
    ...trace,
    imageSourceKinds: trace.imageSourceKinds ? [...trace.imageSourceKinds] : undefined,
    imageSources: trace.imageSources ? [...trace.imageSources] : undefined,
    recordSourceKinds: trace.recordSourceKinds ? [...trace.recordSourceKinds] : undefined,
    recordSources: trace.recordSources ? [...trace.recordSources] : undefined,
    memoryFilterReasons: trace.memoryFilterReasons ? [...trace.memoryFilterReasons] : undefined,
    memoryPreview: trace.memoryPreview ? [...trace.memoryPreview] : undefined,
    searchEvidence: trace.searchEvidence ? [...trace.searchEvidence] : undefined,
    knowledgeTitles: [...trace.knowledgeTitles],
    knowledgeLanes: trace.knowledgeLanes ? [...trace.knowledgeLanes] : undefined,
    knowledgeFreshnessIssues: trace.knowledgeFreshnessIssues ? [...trace.knowledgeFreshnessIssues] : undefined,
    governanceHints: trace.governanceHints ? [...trace.governanceHints] : undefined,
    styleSceneSignals: trace.styleSceneSignals ? [...trace.styleSceneSignals] : undefined,
    qualityIssues: trace.qualityIssues ? [...trace.qualityIssues] : undefined,
    evidenceSummary: trace.evidenceSummary ? [...trace.evidenceSummary] : undefined,
    evidenceLedger: trace.evidenceLedger ? [...trace.evidenceLedger] : undefined,
    realtimeFreshness: trace.realtimeFreshness ? [...trace.realtimeFreshness] : undefined,
    visionDataInfo: trace.visionDataInfo ? [...trace.visionDataInfo] : undefined,
    visionCacheBefore: trace.visionCacheBefore ? [...trace.visionCacheBefore] : undefined,
    visionCacheAfter: trace.visionCacheAfter ? [...trace.visionCacheAfter] : undefined,
  };
}
