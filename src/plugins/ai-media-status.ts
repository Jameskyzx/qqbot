import type { AIConfig } from '../types';
import { formatTraceTime, type ReplyTrace, type VoiceTrace } from './ai-trace-format';

export interface MediaRunCounts {
  visionAttempts: number;
  visionPassed: number;
  sttAttempts: number;
  sttPassed: number;
  voiceAttempts: number;
  voicePassed: number;
}

export interface MediaDayParts {
  dateKey: string;
  label: string;
  period: string;
}

export interface ImageStatsSnapshot {
  count: number;
  maxFiles: number;
  sizeMB: number;
  maxSizeMB: number;
  hits: number;
  misses: number;
  downloadFailures: number;
  inFlight: number;
  lastError?: string;
}

export interface VoiceStatsSnapshot {
  provider: string;
  localReady: boolean;
  sendMode: string;
  cloneEnabled: boolean;
  cloneReady: boolean;
  sampleReason?: string;
  sampleSizeMB: number;
  cacheFiles: number;
  maxCacheFiles: number;
  sizeMB: number;
  maxCacheMB: number;
  hits: number;
  misses: number;
  inFlight: number;
  inFlightHits: number;
  lastError?: string;
}

export interface SttStatsSnapshot {
  provider: string;
  localReady: boolean;
  cacheFiles: number;
  maxCacheFiles: number;
  sizeMB: number;
  maxCacheMB: number;
  hits: number;
  misses: number;
  inFlight: number;
  transcriptMisses: number;
  lastError?: string;
}

export interface GiftTraceSnapshot {
  groupId?: number;
  senderId?: number;
  gift?: string;
  count?: number;
  action: string;
  reason: string;
  voiceAction: string;
  voiceReason?: string;
}

export interface GiftStatsSnapshot {
  recentTraces: number;
  totalGiftNotices: number;
  sentThanks: number;
  throttledThanks: number;
  ignoredThanks: number;
  giftVoiceAttempts: number;
  giftVoiceSent: number;
  lastGiftTrace: GiftTraceSnapshot | null;
}

export interface MediaDailySnapshot {
  config: AIConfig;
  apiReady: boolean;
  parts: MediaDayParts;
  imageStats: ImageStatsSnapshot;
  voiceStats: VoiceStatsSnapshot;
  sttStats: SttStatsSnapshot;
  latestVisionLine: string;
  latestRecordSummary: string;
  latestVoiceLine: string;
  todayRuns: MediaRunCounts;
}

export interface MediaStatusSnapshot {
  config: AIConfig;
  apiReady: boolean;
  imageStats: ImageStatsSnapshot;
  voiceStats: VoiceStatsSnapshot;
  sttStats: SttStatsSnapshot;
  giftStats: GiftStatsSnapshot;
  latestVisionLine: string;
  latestRecordSummary: string;
  latestVoiceLine: string;
  traceCounts: {
    vision: number;
    maxVision: number;
    voice: number;
    maxVoice: number;
    reply: number;
    maxReply: number;
  };
}

export function getShanghaiDayParts(date: Date = new Date()): MediaDayParts {
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value || '';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const parsedHour = Number.parseInt(get('hour'), 10);
  const hour = Number.isFinite(parsedHour) ? parsedHour % 24 : 0;
  const minute = get('minute') || '00';
  const period = hour < 6
    ? '凌晨'
    : hour < 12
      ? '上午'
      : hour < 14
        ? '中午'
        : hour < 18
          ? '下午'
          : hour < 23
            ? '晚上'
            : '深夜';
  return {
    dateKey: `${year}-${month}-${day}`,
    label: `${year}-${month}-${day} ${get('weekday') || ''} ${String(hour).padStart(2, '0')}:${minute}`,
    period,
  };
}

export function isProviderReady(provider: string, localReady: boolean, apiReady: boolean): boolean {
  if (provider === 'local') return localReady;
  if (provider === 'auto') return localReady || apiReady;
  return apiReady;
}

export function countMediaRunsForDay(
  dateKey: string,
  visionTraces: ReplyTrace[],
  replyTraces: ReplyTrace[],
  voiceTraces: VoiceTrace[],
): MediaRunCounts {
  const sameShanghaiDate = (timestamp: number) => (
    !!timestamp && getShanghaiDayParts(new Date(timestamp)).dateKey === dateKey
  );
  const todayVision = visionTraces.filter((trace) => sameShanghaiDate(trace.timestamp));
  const todayRecords = replyTraces.filter((trace) => (
    sameShanghaiDate(trace.timestamp)
    && (trace.hasRecords || !!trace.recordInputCount || !!trace.sttError)
  ));
  const todayVoices = voiceTraces.filter((trace) => sameShanghaiDate(trace.timestamp));
  return {
    visionAttempts: todayVision.filter((trace) => trace.hasImages || trace.visionPayload || !!trace.visionError).length,
    visionPassed: todayVision.filter((trace) => trace.visionPayload && (trace.visionImages || 0) > 0 && !trace.visionError).length,
    sttAttempts: todayRecords.length,
    sttPassed: todayRecords.filter((trace) => (trace.recordTranscripts || 0) > 0 && !trace.sttError).length,
    voiceAttempts: todayVoices.length,
    voicePassed: todayVoices.filter((trace) => (trace.sentParts || 0) > 0 && !trace.error).length,
  };
}

export function formatTodayMediaRuns(runs: MediaRunCounts): string {
  return [
    `识图${runs.visionPassed}/${runs.visionAttempts}`,
    `听写${runs.sttPassed}/${runs.sttAttempts}`,
    `发语音${runs.voicePassed}/${runs.voiceAttempts}`,
  ].join('；');
}

export function formatMediaLatestVoiceTrace(trace: VoiceTrace | null): string {
  if (!trace) return '最近语音: 无真实语音发送 trace';
  const age = formatTraceTime(trace.timestamp);
  const error = trace.error ? ` error=${trace.error.slice(0, 80)}` : '';
  return `最近语音: ${trace.mode} mid=${trace.messageId} parts=${trace.sentParts}/${trace.parts} tts=${trace.provider}/${trace.sendMode}${error} / ${age}`;
}

function stableHashIndex(input: string, mod: number): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % Math.max(1, mod);
}

function pickDailyMediaLine(items: string[], seed: string): string {
  return items[stableHashIndex(seed, items.length)] || items[0] || '';
}

function formatMediaDailyChecklist(
  runs: MediaRunCounts,
  visionReady: boolean,
  sttReady: boolean,
  ttsReady: boolean,
): string {
  const item = (label: string, ready: boolean, passed: number, action: string): string => {
    if (!ready) return `${label}不可用`;
    if (passed > 0) return `${label}已实跑`;
    return `${label}待真测(${action})`;
  };
  return [
    item('识图', visionReady, runs.visionPassed, '/vision test'),
    item('听写', sttReady, runs.sttPassed, '/voice stt'),
    item('发语音', ttsReady, runs.voicePassed, '/voice test'),
  ].join('；');
}

function summarizeMediaDailyProgress(
  runs: MediaRunCounts,
  visionReady: boolean,
  sttReady: boolean,
  ttsReady: boolean,
): { progress: string; priority: string } {
  const items = [
    { label: '识图', ready: visionReady, passed: runs.visionPassed > 0, action: '/vision test <图片URL>' },
    { label: '听写', ready: sttReady, passed: runs.sttPassed > 0, action: '/voice stt <语音URL>' },
    { label: '发语音', ready: ttsReady, passed: runs.voicePassed > 0, action: '/voice test 今天语音链路短测一下' },
  ];
  const readyItems = items.filter((item) => item.ready);
  const doneItems = readyItems.filter((item) => item.passed);
  const missingItems = readyItems.filter((item) => !item.passed);
  const unavailable = items.filter((item) => !item.ready).map((item) => item.label);
  if (readyItems.length === 0) {
    return {
      progress: '0/0；三条链路都不可用，先看 /media status',
      priority: '/media status 查开关、模型和后端',
    };
  }
  const percent = Math.round((doneItems.length / readyItems.length) * 100);
  return {
    progress: `${doneItems.length}/${readyItems.length} (${percent}%)${unavailable.length ? `；不可用: ${unavailable.join('/')}` : ''}`,
    priority: missingItems.length
      ? `${missingItems[0].label}: ${missingItems[0].action}`
      : '三件套今天都有成功 trace；后面看 /media recent 3 排失败或截断',
  };
}

export function formatMediaDailyPanel(snapshot: MediaDailySnapshot): string {
  const { config, apiReady, parts, imageStats, voiceStats, sttStats, todayRuns } = snapshot;
  const visionReady = !!config.enable_vision && !!(config.vision_model || config.model) && apiReady;
  const sttReady = !!config.enable_stt && isProviderReady(sttStats.provider, sttStats.localReady, apiReady);
  const ttsReady = !!config.enable_tts && isProviderReady(voiceStats.provider, voiceStats.localReady, apiReady);
  const seed = `${parts.dateKey}:${config.vision_model || config.model || ''}:${sttStats.provider}:${voiceStats.provider}`;
  const risks: string[] = [];
  const next: string[] = [];

  if (!config.enable_vision) {
    risks.push('识图off');
    next.push('需要看图就打开 enable_vision');
  } else if (!apiReady) {
    risks.push('识图API不可用');
    next.push('/vision status 查模型和接口');
  }
  if (!config.enable_stt) {
    risks.push('听写off');
    next.push('需要听语音就打开 enable_stt');
  } else if (!sttReady) {
    risks.push('听写后端不可用');
    next.push('/voice status 查 STT 后端');
  }
  if (!config.enable_tts) {
    risks.push('TTS off');
    next.push('需要发语音就打开 enable_tts');
  } else if (!ttsReady) {
    risks.push('TTS后端不可用');
    next.push('/voice status 查 TTS 后端');
  }
  if (voiceStats.cloneEnabled && !voiceStats.cloneReady) {
    risks.push(`克隆样本不可用(${voiceStats.sampleReason || 'missing'})`);
    next.push('/voice clone status 看授权样本');
  }
  if (imageStats.lastError) {
    risks.push(`最近图片错误:${imageStats.lastError.slice(0, 48)}`);
    next.push('/vision test <图片URL>');
  }
  if (sttStats.lastError) {
    risks.push(`最近听写错误:${sttStats.lastError.slice(0, 48)}`);
    next.push('/voice stt <语音URL>');
  }
  if (voiceStats.lastError) {
    risks.push(`最近TTS错误:${voiceStats.lastError.slice(0, 48)}`);
    next.push('/voice check <短句>');
  }
  if (visionReady && todayRuns.visionPassed === 0) {
    next.push('/vision test <图片URL> 真测今天看图链路');
  }
  if (sttReady && todayRuns.sttPassed === 0) {
    next.push('/voice stt <语音URL> 真测今天听写链路');
  }
  if (ttsReady && todayRuns.voicePassed === 0) {
    next.push('/voice test 今天语音链路短测一下');
  }

  const opener = pickDailyMediaLine([
    '今天多模态别玩玄学，能看就看清楚，听不清就别硬装。',
    '先把链路摸一下，别等群友发图了再现场拆炸弹。',
    '今天看图先讲可见信息，语音先看听写，别上来就编剧情。',
    '多模态这东西最怕嘴硬，缓存是缓存，真看过才算看过。',
    '今天也别把语音念成小作文，短句有力就行。',
  ], `${seed}:opener`);
  const task = !visionReady
    ? '今日小任务: 跑 /vision status，再用 /vision check <图片URL> 做只读预检。'
    : !sttReady
      ? '今日小任务: 跑 /voice status，再用 /voice sttcache <语音URL> 看听写缓存。'
      : !ttsReady
        ? '今日小任务: 跑 /voice check 这波语音链路测试一下，先确认文本分段和边界。'
        : `今日小任务: ${pickDailyMediaLine([
          '发一张截图问“帮我看图”，确认回复先说可见内容再短评。',
          '拿一条常用语音跑 /voice sttcache，看缓存和听写上限有没有踩线。',
          '用 /voice check 预检一句短吐槽，别让 TTS 念成长报告。',
          '看 /media recent 3，确认最近真实链路里有没有失败或截断。',
          '把常用图片先 /vision warm，后面再 /vision test 验证模型真看到了。',
        ], `${seed}:task`)}`;

  const health = [
    `识图${visionReady ? '可用' : '要查'}`,
    `听写${sttReady ? '可用' : '要查'}`,
    `发语音${ttsReady ? '可用' : '要查'}`,
  ].join(' / ');
  const missingRuns = [
    visionReady && todayRuns.visionPassed === 0 ? '今天还没有真实识图成功 trace' : '',
    sttReady && todayRuns.sttPassed === 0 ? '今天还没有真实听写成功 trace' : '',
    ttsReady && todayRuns.voicePassed === 0 ? '今天还没有真实发语音成功 trace' : '',
  ].filter(Boolean);
  const dailyProgress = summarizeMediaDailyProgress(todayRuns, visionReady, sttReady, ttsReady);

  return [
    `多模态每日牌 | ${parts.label} ${parts.period}`,
    '模式: 只读每日状态，不下载图片、不听写语音、不调用模型、不生成音频',
    opener,
    `今日链路: ${health}`,
    `今日实跑: ${formatTodayMediaRuns(todayRuns)}`,
    `今日三件套: ${formatMediaDailyChecklist(todayRuns, visionReady, sttReady, ttsReady)}`,
    `今日完成度: ${dailyProgress.progress}`,
    `优先补: ${dailyProgress.priority}`,
    '打卡口径: /vision test 成功传图、/voice stt 成功转写、/voice test 成功发出 record 才算；check/warm/cache hit 不算实跑。',
    `今日缺口: ${missingRuns.length ? missingRuns.join(' / ') : '三条链路今天都有成功 trace，继续看边界别嘴硬'}`,
    `开关: vision=${config.enable_vision ? 'on' : 'off'} max${config.vision_max_images || 2}；stt=${config.enable_stt ? 'on' : 'off'} max${config.stt_max_records || 1} ${sttStats.provider}${sttStats.localReady ? '/local-ready' : ''}；tts=${config.enable_tts ? 'on' : 'off'} ${voiceStats.provider}${voiceStats.localReady ? '/local-ready' : ''} send=${voiceStats.sendMode}`,
    `缓存: 图片${imageStats.count}/${imageStats.maxFiles} 命中${imageStats.hits}/${imageStats.misses}；听写${sttStats.cacheFiles}/${sttStats.maxCacheFiles} 命中${sttStats.hits}/${sttStats.misses}；TTS${voiceStats.cacheFiles}/${voiceStats.maxCacheFiles} 命中${voiceStats.hits}/${voiceStats.misses}`,
    snapshot.latestVisionLine,
    `最近听写: ${snapshot.latestRecordSummary}`,
    snapshot.latestVoiceLine,
    task,
    `风险: ${risks.length ? [...new Set(risks)].join(' / ') : '无明显配置/链路风险'}`,
    `下一步: ${next.length ? [...new Set(next)].join('；') : '/media check <图/语音> 只读预检；/vision test 真测图片；/voice stt 真测听写'}`,
    '边界: 不在 trace 里的图片/语音不能装作看过或听过；缓存 hit 不等于模型已看图或重新听音频；克隆/授权样本不能说成现实主播本人语音。',
  ].join('\n');
}

export function formatMediaStatusPanel(snapshot: MediaStatusSnapshot): string {
  const { config, apiReady, imageStats, voiceStats, sttStats, giftStats, traceCounts } = snapshot;
  const risks: string[] = [];

  if (!config.enable_vision) risks.push('识图off');
  else if (!apiReady) risks.push('识图API不可用');
  if (!config.enable_stt) risks.push('听写off');
  else if ((sttStats.provider === 'api' && !apiReady) || (sttStats.provider === 'auto' && !sttStats.localReady && !apiReady)) risks.push('听写后端不可用');
  if (!config.enable_tts) risks.push('TTS off');
  else if (voiceStats.provider === 'local' && !voiceStats.localReady) risks.push('本地TTS未配置');
  else if (voiceStats.provider === 'api' && !apiReady) risks.push('TTS API不可用');
  else if (voiceStats.provider === 'auto' && !voiceStats.localReady && !apiReady) risks.push('TTS auto无可用后端');
  if (voiceStats.cloneEnabled && !voiceStats.cloneReady) risks.push(`克隆样本不可用(${voiceStats.sampleReason || 'missing'})`);
  if (voiceStats.sendMode !== 'base64') risks.push(`TTS发送${voiceStats.sendMode}可能受容器路径影响`);
  if (imageStats.lastError) risks.push(`最近图片错误:${imageStats.lastError.slice(0, 60)}`);
  if (sttStats.lastError) risks.push(`最近听写错误:${sttStats.lastError.slice(0, 60)}`);
  if (voiceStats.lastError) risks.push(`最近TTS错误:${voiceStats.lastError.slice(0, 60)}`);

  return [
    '多模态状态',
    '模式: 只读聚合状态，不下载图片、不听写语音、不调用模型、不生成音频',
    `开关: vision=${config.enable_vision ? 'on' : 'off'} max${config.vision_max_images || 2} model=${config.vision_model || config.model || '未配置'}；stt=${config.enable_stt ? 'on' : 'off'} max${config.stt_max_records || 1} ${sttStats.provider}${sttStats.localReady ? '/local-ready' : ''}；tts=${config.enable_tts ? 'on' : 'off'} ${voiceStats.provider}${voiceStats.localReady ? '/local-ready' : ''} send=${voiceStats.sendMode}`,
    `图片缓存: ${imageStats.count}/${imageStats.maxFiles}张 ${imageStats.sizeMB}/${imageStats.maxSizeMB}MB 命中${imageStats.hits}/${imageStats.misses} 失败${imageStats.downloadFailures} 飞行${imageStats.inFlight}`,
    snapshot.latestVisionLine,
    `听写缓存: ${sttStats.cacheFiles}/${sttStats.maxCacheFiles}条 ${sttStats.sizeMB}/${sttStats.maxCacheMB}MB 命中${sttStats.hits}/${sttStats.misses} 飞行${sttStats.inFlight} 空转写${sttStats.transcriptMisses}`,
    `最近听写: ${snapshot.latestRecordSummary}`,
    `语音缓存: ${voiceStats.cacheFiles}/${voiceStats.maxCacheFiles}条 ${voiceStats.sizeMB}/${voiceStats.maxCacheMB}MB 命中${voiceStats.hits}/${voiceStats.misses} 飞行${voiceStats.inFlight} 合并${voiceStats.inFlightHits}`,
    `克隆: ${voiceStats.cloneEnabled ? (voiceStats.cloneReady ? 'ready' : `missing${voiceStats.sampleReason ? `(${voiceStats.sampleReason})` : ''}`) : 'off'} 样本${voiceStats.sampleSizeMB}MB`,
    snapshot.latestVoiceLine,
    `礼物: 收到${giftStats.totalGiftNotices} 已谢${giftStats.sentThanks} 节流${giftStats.throttledThanks} 忽略${giftStats.ignoredThanks} 语音${giftStats.giftVoiceSent}/${giftStats.giftVoiceAttempts} 最近${giftStats.recentTraces}`,
    giftStats.lastGiftTrace ? `最近礼物: group=${giftStats.lastGiftTrace.groupId || '-'} uid=${giftStats.lastGiftTrace.senderId || '-'} ${giftStats.lastGiftTrace.gift || '礼物'}x${giftStats.lastGiftTrace.count || 1} ${giftStats.lastGiftTrace.action}/${giftStats.lastGiftTrace.reason} voice=${giftStats.lastGiftTrace.voiceAction}/${giftStats.lastGiftTrace.voiceReason || '-'}` : '最近礼物: 无真实礼物事件',
    `记录: vision ${traceCounts.vision}/${traceCounts.maxVision} voice ${traceCounts.voice}/${traceCounts.maxVoice} reply ${traceCounts.reply}/${traceCounts.maxReply} gift ${giftStats.recentTraces}`,
    `风险: ${risks.length ? [...new Set(risks)].join(' / ') : '无明显配置/链路风险'}`,
    '回复边界: 不在 trace 里的图片/语音不能装作看过或听过；克隆/授权样本不能说成现实主播本人语音；礼物感谢是拟态模板，不是核验原话。',
    '查看: /media recent 3；单项: /vision recent、/voice recent、/gift recent、/trace recent',
  ].join('\n');
}
