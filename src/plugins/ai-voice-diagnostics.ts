import type { AIConfig } from '../types';
import { sanitizeOutgoingText } from '../message-sanitize';
import { getSttStats, inspectSttCacheSources } from './stt';
import { getVoiceStats, inspectVoiceCache } from './tts';
import { summarizeImageSourceKinds } from './ai-media-trace';
import { hasRealityBoundaryClaim, previewText } from './reply-postprocess';
import { splitVoiceTextForTts } from './voice-intent';

export interface VoicePreflightAnalysis {
  raw: string;
  cleaned: string;
  maxChars: number;
  parts: string[];
  spokenChars: number;
  likelyTruncated: boolean;
  risks: string[];
  next: string[];
  stats: ReturnType<typeof getVoiceStats>;
}

export interface VoiceStatusOptions {
  recentVoiceCount: number;
  maxVoiceTraces: number;
  sttStatusLastTrace: string;
}

export const VOICE_CLONE_BOUNDARY_LINE = '边界: 只使用你有权使用的授权样本；生成语音不能说成现实主播本人语音，也不能拿去冒充本人。';

export function hasVoiceIdentityBoundaryRisk(text: string): boolean {
  if (!text) return false;
  return hasRealityBoundaryClaim(text)
    || /(?:本人|本尊|主播本人|现实主播|玩机器|MachineWJQ|6657).{0,12}(?:语音|声音|声线|原声|真声|真人声音|本人声音)/i.test(text)
    || /(?:语音|声音|声线|原声|真声|真人声音|本人声音).{0,12}(?:本人|本尊|主播本人|现实主播|玩机器|MachineWJQ|6657)/i.test(text)
    || /(?:克隆|复刻|还原|模仿).{0,10}(?:本人|本尊|主播本人|现实主播|玩机器|MachineWJQ|6657).{0,10}(?:语音|声音|声线|原声|真声)/i.test(text)
    || /(?:官方授权|本人授权|主播授权|玩机器授权).{0,12}(?:语音|声音|声线|克隆|复刻|样本)/i.test(text);
}

export function formatVoiceStatusPanel(
  config: AIConfig,
  apiReady: boolean,
  options: VoiceStatusOptions,
): string {
  const stats = getVoiceStats(config);
  const sttStats = getSttStats(config);
  const next = new Set<string>();
  let ttsDiagnosis = 'TTS诊断: 可用';
  if (!config.enable_tts) {
    ttsDiagnosis = 'TTS诊断: 未开启';
    next.add('打开 enable_tts 后用 /voice check 预检');
  } else if (stats.provider === 'local' && !stats.localReady) {
    ttsDiagnosis = 'TTS诊断: 本地TTS未配置';
    next.add('配置 tts_local_command 或改 tts_provider');
  } else if (stats.provider === 'api' && !apiReady) {
    ttsDiagnosis = 'TTS诊断: API后端不可用';
    next.add('检查 api_url/model/api_key');
  } else if (stats.provider === 'auto' && !stats.localReady && !apiReady) {
    ttsDiagnosis = 'TTS诊断: auto没有可用后端';
    next.add('配置本地TTS命令或可用对话接口');
  } else if (stats.provider === 'auto' && !stats.localReady && apiReady) {
    ttsDiagnosis = 'TTS诊断: 可用(API兜底，本地未配置)';
    next.add('想省API就配置本地TTS命令');
  } else if (stats.provider === 'local') {
    ttsDiagnosis = 'TTS诊断: 可用(local)';
  } else {
    ttsDiagnosis = 'TTS诊断: 可用(api)';
  }

  let sttDiagnosis = 'STT诊断: 可用';
  if (!config.enable_stt) {
    sttDiagnosis = 'STT诊断: 未开启';
    next.add('打开 enable_stt 后用 /voice stt 测试');
  } else if (sttStats.provider === 'local' && !sttStats.localReady) {
    sttDiagnosis = 'STT诊断: 本地STT未配置';
    next.add('配置 stt_local_command 或改 stt_provider');
  } else if ((sttStats.provider === 'api' || (sttStats.provider === 'auto' && !sttStats.localReady)) && !apiReady) {
    sttDiagnosis = 'STT诊断: API后端不可用';
    next.add('配置可用对话接口或本地STT');
  } else if (sttStats.provider === 'auto' && !sttStats.localReady) {
    sttDiagnosis = 'STT诊断: 可用(API兜底，本地未配置)';
  } else if (sttStats.provider === 'local') {
    sttDiagnosis = 'STT诊断: 可用(local)';
  }

  const cloneDiagnosis = stats.cloneEnabled
    ? (stats.cloneReady ? '克隆诊断: 样本可用' : `克隆诊断: 样本不可用(${stats.sampleReason || 'missing'})，会退回普通TTS`)
    : '克隆诊断: 已关闭';
  if (stats.cloneEnabled && !stats.cloneReady) next.add('/voice clone <音频URL或本地路径> 安装授权样本');
  if (stats.sendMode !== 'base64') next.add('Docker/NapCat部署建议 tts_send_mode=base64');
  if (stats.lastError) next.add('/voice check 或 /voice test 定位最近TTS错误');
  if (sttStats.lastError) next.add('/voice sttcache + /voice stt 定位最近听写错误');

  return [
    '语音状态',
    ttsDiagnosis,
    sttDiagnosis,
    cloneDiagnosis,
    VOICE_CLONE_BOUNDARY_LINE,
    `TTS: ${config.enable_tts ? 'on' : 'off'}`,
    `STT: ${config.enable_stt ? 'on' : 'off'}`,
    `TTS提供方: ${stats.provider}${stats.localReady ? ' local-ready' : ''}`,
    `STT提供方: ${sttStats.provider}${sttStats.localReady ? ' local-ready' : ''}`,
    `普通模型: ${stats.model}`,
    `克隆模型: ${stats.cloneModel}`,
    `听写模型: ${sttStats.model || '未配置'}`,
    `TTS发送: ${stats.sendMode}`,
    `STT格式: ${sttStats.recordFormat} / payload ${sttStats.payloadMode}`,
    ...(stats.provider !== 'api' ? [`本地TTS命令: ${stats.localCommand || '未配置'}`] : []),
    ...(sttStats.provider !== 'api' ? [`本地STT命令: ${sttStats.localCommand || '未配置'}`] : []),
    `克隆: ${stats.cloneEnabled ? (stats.cloneReady ? 'ready' : 'missing') : 'off'}`,
    `样本: ${stats.samplePath}`,
    `样本大小: ${stats.sampleSizeMB}MB`,
    ...(stats.sampleReason ? [`样本原因: ${stats.sampleReason}`] : []),
    `缓存: ${stats.cacheFiles}/${stats.maxCacheFiles}条 ${stats.sizeMB}/${stats.maxCacheMB}MB 命中${stats.hits}/${stats.misses} 飞行${stats.inFlight} 合并${stats.inFlightHits}`,
    `听写缓存: ${sttStats.cacheFiles}/${sttStats.maxCacheFiles}条 ${sttStats.sizeMB}/${sttStats.maxCacheMB}MB 命中${sttStats.hits}/${sttStats.misses} 飞行${sttStats.inFlight} 合并${sttStats.inFlightHits} 下载失败${sttStats.downloadMisses} 空转写${sttStats.transcriptMisses}`,
    `语音记录: ${options.recentVoiceCount}/${options.maxVoiceTraces}，看 /voice recent`,
    options.sttStatusLastTrace,
    `清理: TTS删${stats.lastCleanupDeleted}/累计${stats.cleanupDeletedTotal} STT删${sttStats.lastCleanupDeleted}/累计${sttStats.cleanupDeletedTotal}`,
    `最长文本: ${stats.maxChars}字`,
    ...(stats.lastMode ? [`最近TTS模式: ${stats.lastMode}`] : []),
    ...(stats.lastError ? [`最近错误: ${stats.lastError}`] : []),
    ...(sttStats.lastError ? [`听写最近错误: ${sttStats.lastError}`] : []),
    `下一步: ${next.size ? [...next].join('；') : '可以 /voice check <文本> 或 /voice sttcache <语音URL> 做只读预检'}`,
  ].join('\n');
}

export function buildVoicePreflightAnalysis(config: AIConfig, text: string, apiReady: boolean): VoicePreflightAnalysis {
  const raw = (text || '').trim();
  const stats = getVoiceStats(config);
  const maxChars = Math.max(10, config.tts_max_chars || stats.maxChars || 120);
  const cleaned = sanitizeOutgoingText(raw)
    .replace(/\s+/g, ' ')
    .replace(/[#*_`>]/g, '')
    .trim();
  const parts = splitVoiceTextForTts(raw, maxChars);
  const spokenChars = parts.reduce((sum, part) => sum + part.length, 0);
  const likelyTruncated = cleaned.length > maxChars * 4 || (parts.length >= 4 && spokenChars < Math.floor(cleaned.length * 0.85));
  const risks: string[] = [];
  const next: string[] = [];
  const provider = stats.provider;
  if (!config.enable_tts) {
    risks.push('TTS未开启');
    next.push('打开 enable_tts');
  } else if (provider === 'local' && !stats.localReady) {
    risks.push('本地TTS未配置');
    next.push('配置 tts_local_command 或改 provider');
  } else if (provider === 'api' && !apiReady) {
    risks.push('API后端不可用');
    next.push('检查 api_url/model/api_key');
  } else if (provider === 'auto' && !stats.localReady && !apiReady) {
    risks.push('auto没有可用TTS后端');
    next.push('配置本地TTS或可用API');
  }
  if (parts.length === 0) {
    risks.push('清洗后没有可念文本');
    next.push('换一段正常文字');
  }
  if (parts.length > 1) {
    risks.push(`会拆成${parts.length}条record`);
    next.push('群里直读建议压到一两句');
  }
  if (likelyTruncated) {
    risks.push('超过4段上限，后文可能不会念出');
    next.push('先缩短文本或分多次发');
  }
  if (stats.cloneEnabled && !stats.cloneReady) {
    risks.push('克隆样本不可用，会走普通TTS');
    next.push('需要复刻声音就用 /voice clone 安装授权样本');
  }
  if (stats.sendMode !== 'base64') {
    risks.push(`发送模式${stats.sendMode}，Docker/NapCat可能读不到文件`);
    next.push('Docker部署优先 tts_send_mode=base64');
  }
  if (hasVoiceIdentityBoundaryRisk(raw)) {
    risks.push('疑似现实本人/授权语音话术');
    next.push('改成“风格语音/授权样本”，不要说成现实主播本人语音');
  }

  return {
    raw,
    cleaned,
    maxChars,
    parts,
    spokenChars,
    likelyTruncated,
    risks,
    next: [...new Set(next)],
    stats,
  };
}

export function formatVoicePreflight(config: AIConfig, text: string, apiReady: boolean): string {
  const analysis = buildVoicePreflightAnalysis(config, text, apiReady);
  if (!analysis.raw) return '/voice check <要预检的文本>';
  const { raw, cleaned, maxChars, parts, likelyTruncated, risks, next, stats } = analysis;
  const provider = stats.provider;

  return [
    '语音预检',
    '模式: 直读TTS预检，不调用AI，不生成音频',
    `TTS: ${config.enable_tts ? 'on' : 'off'} ${provider}${stats.localReady ? '/local-ready' : ''} send=${stats.sendMode}`,
    `克隆: ${stats.cloneEnabled ? (stats.cloneReady ? 'ready' : 'missing') : 'off'} 样本${stats.sampleSizeMB}MB`,
    `长度: 原文${raw.length}字 / 清洗${cleaned.length}字 / 单段上限${maxChars}字`,
    `分段: ${parts.length}/4${likelyTruncated ? ' 可能截断' : ''}`,
    ...parts.map((part, index) => `${index + 1}. ${previewText(part, 72)}`),
    `风险: ${risks.length ? risks.join(' / ') : '无明显风险'}`,
    '边界: /voice check 只检查TTS文本和发送风险；克隆/授权样本也不能说成现实主播本人语音，也不能拿去冒充本人。',
    `下一步: ${next.length ? next.join('；') : '可以 /voice test <文本> 做真实生成测试'}`,
  ].join('\n');
}

export function formatVoiceCachePreflight(config: AIConfig, text: string, apiReady: boolean): string {
  const analysis = buildVoicePreflightAnalysis(config, text, apiReady);
  if (!analysis.raw) return '/voice cache <要预检的文本>';
  const inspect = inspectVoiceCache(config, analysis.parts);
  const counts = inspect.parts.reduce((acc, part) => {
    acc[part.status] = (acc[part.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const risks = [...analysis.risks];
  if (!apiReady && inspect.parts.some((part) => part.provider === 'api')) risks.push('API后端不可用，api/auto-api 分段会 disabled');
  if (inspect.parts.some((part) => part.status === 'expired')) risks.push('存在过期音频，下一次生成会重写缓存');
  if (inspect.parts.some((part) => part.status === 'miss')) risks.push('存在未命中分段，首次生成会消耗TTS');
  const summary = ['hit', 'miss', 'in-flight', 'expired', 'invalid', 'disabled']
    .map((key) => `${key} ${counts[key] || 0}`)
    .join(' / ');
  const partLines = inspect.parts.slice(0, 6).map((part) => {
    const ttl = part.status === 'hit' ? ` ttl=${part.ttlSeconds}s` : part.status === 'expired' ? ` age=${part.ageSeconds}s` : '';
    const file = part.ext ? ` ${part.ext}/${part.sizeKB}KB` : '';
    const clone = part.clone ? ' clone' : '';
    return `${part.index}. 状态=${part.status}${ttl} key=${part.cacheKey} ${part.mode}${clone}${file} ${part.chars}字`;
  });

  return [
    '语音缓存预检',
    '模式: 只读检查TTS分段和缓存 key，不调用AI，不生成音频',
    `TTS: ${config.enable_tts ? 'on' : 'off'} ${inspect.provider}${inspect.localReady ? '/local-ready' : ''} send=${inspect.sendMode}`,
    `克隆: ${inspect.cloneEnabled ? (inspect.cloneReady ? 'ready' : `missing${inspect.sampleReason ? `(${inspect.sampleReason})` : ''}`) : 'off'}`,
    `分段: ${inspect.parts.length}段 / 单段上限${inspect.maxChars}字${analysis.likelyTruncated ? ' / 可能截断' : ''}`,
    `缓存状态: ${summary}`,
    ...partLines,
    inspect.parts.length > partLines.length ? `... 还有${inspect.parts.length - partLines.length}段未展示` : '',
    `风险: ${risks.length ? [...new Set(risks)].join(' / ') : '无明显风险'}`,
    '边界: 语音缓存只代表音频可复用，不代表文本事实正确；克隆语音也不能说成现实主播本人语音，不能拿去冒充本人。',
    `下一步: ${inspect.parts.every((part) => part.status === 'hit') ? '可以直接 /voice test 复用缓存；要清理用 /voice clean' : '常用短句可先 /voice test 预热一次；生成后再 /voice cache 复查 hit'}`,
  ].filter(Boolean).join('\n');
}

export function formatSttCachePreflight(config: AIConfig, sources: string[], apiReady: boolean): string {
  const uniqueSources = [...new Set(sources.map((source) => source.trim()).filter(Boolean))];
  if (uniqueSources.length === 0) return '/voice sttcache <语音URL>\n也可以把语音和 /voice sttcache 发在同一条消息里';
  const stats = getSttStats(config);
  const sttLimit = Math.max(1, Math.min(config.stt_max_records || 1, 4));
  const passCount = config.enable_stt ? Math.min(uniqueSources.length, sttLimit) : 0;
  const truncated = uniqueSources.length > passCount;
  const inspect = inspectSttCacheSources(config, uniqueSources, 6);
  const counts = inspect.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const summary = ['hit', 'miss', 'in-flight', 'expired', 'invalid', 'disabled']
    .map((key) => `${key} ${counts[key] || 0}`)
    .join(' / ');
  const risks: string[] = [];
  const next: string[] = [];
  const provider = stats.provider;
  const sttNeedsApi = provider === 'api' || (provider === 'auto' && !stats.localReady);
  if (!config.enable_stt) {
    risks.push('听写未开启');
    next.push('打开 enable_stt');
  } else if (provider === 'local' && !stats.localReady) {
    risks.push('本地STT命令未配置');
    next.push('配置 stt_local_command 或切到 api/auto');
  } else if (sttNeedsApi && !apiReady) {
    risks.push('听写API后端不可用');
    next.push('配置可用对话接口或本地STT');
  }
  if (truncated) {
    risks.push(`真实听写会截断 ${passCount}/${uniqueSources.length}`);
    next.push('减少语音条数或调高 stt_max_records');
  }
  if (inspect.some((item) => item.status === 'miss' || item.status === 'expired')) {
    risks.push('存在未命中或过期听写缓存');
    next.push('/voice stt <语音URL> 真实预热听写缓存');
  }
  if (inspect.some((item) => item.status === 'in-flight')) {
    next.push('等当前听写完成后再复查 sttcache');
  }
  if (stats.lastError) {
    risks.push(`最近听写错误: ${stats.lastError.slice(0, 60)}`);
    next.push('/voice stt <语音URL> 定位下载/转码/模型问题');
  }
  const lines = inspect.map((item, index) => {
    const ttl = item.status === 'hit'
      ? ` ttl=${item.ttlSeconds}s chars=${item.chars}`
      : item.status === 'expired'
        ? ` age=${item.ageSeconds}s chars=${item.chars}`
        : '';
    return `${index + 1}. 状态=${item.status}${ttl} key=${item.cacheKey || '-'} ${previewText(item.reason, 42)} / ${previewText(item.source, 60)}`;
  });
  return [
    '听写缓存预检',
    '模式: 只读检查STT缓存 key，不下载语音、不转码、不调用模型',
    `STT: ${config.enable_stt ? 'on' : 'off'} ${provider}${stats.localReady ? '/local-ready' : ''} model=${stats.model || '未配置'} payload=${stats.payloadMode}`,
    `语音: 输入${uniqueSources.length}条 / 真实最多听写${passCount}/${uniqueSources.length} / max${sttLimit}${truncated ? ' 已截断' : ''}`,
    `来源: ${summarizeImageSourceKinds(uniqueSources).join(' / ') || '无'}`,
    `缓存状态: ${summary}`,
    ...lines,
    uniqueSources.length > inspect.length ? `... 还有${uniqueSources.length - inspect.length}条未展示` : '',
    `风险: ${risks.length ? [...new Set(risks)].join(' / ') : '无明显风险'}`,
    '边界: STT缓存命中只代表转写文本可复用，不证明音频内容完整；miss/expired 时不能假装已经听到语音。',
    `下一步: ${next.length ? [...new Set(next)].join('；') : '可以直接 /voice stt <语音URL> 做端到端听写测试'}`,
  ].filter(Boolean).join('\n');
}
