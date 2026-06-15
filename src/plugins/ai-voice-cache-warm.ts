import type { AIConfig } from '../types';
import { buildVoicePreflightAnalysis } from './ai-voice-diagnostics';
import { getVoiceStats, inspectVoiceCache } from './tts';

export function voiceCacheStatusSummary(parts: ReturnType<typeof inspectVoiceCache>['parts']): string {
  const counts = parts.reduce((acc, part) => {
    acc[part.status] = (acc[part.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return ['hit', 'miss', 'in-flight', 'expired', 'invalid', 'disabled']
    .map((key) => `${key} ${counts[key] || 0}`)
    .join(' / ');
}

export function formatVoiceCachePartLine(prefix: string, part: ReturnType<typeof inspectVoiceCache>['parts'][number]): string {
  const ttl = part.status === 'hit' ? ` ttl=${part.ttlSeconds}s` : part.status === 'expired' ? ` age=${part.ageSeconds}s` : '';
  const file = part.ext ? ` ${part.ext}/${part.sizeKB}KB` : '';
  const clone = part.clone ? ' clone' : '';
  return `${prefix}${part.index}. 状态=${part.status}${ttl} key=${part.cacheKey} ${part.mode}${clone}${file} ${part.chars}字`;
}

export async function formatVoiceCacheWarm(
  config: AIConfig,
  text: string,
  apiReady: boolean,
  generatePart: (partText: string) => Promise<string | null>,
): Promise<string> {
  const analysis = buildVoicePreflightAnalysis(config, text, apiReady);
  if (!analysis.raw) return '/voice warm <要预热的文本>';

  const before = inspectVoiceCache(config, analysis.parts);
  const actions: string[] = [];
  let generated = 0;
  let hit = 0;
  let skipped = 0;
  let failed = 0;

  for (const part of before.parts) {
    if (part.status === 'hit') {
      hit++;
      actions.push(`${part.index}. hit/no-op key=${part.cacheKey}`);
      continue;
    }
    if (part.provider === 'api' && !apiReady) {
      skipped++;
      actions.push(`${part.index}. skipped/api-not-ready key=${part.cacheKey}`);
      continue;
    }
    if (part.status !== 'miss' && part.status !== 'expired' && part.status !== 'in-flight') {
      skipped++;
      actions.push(`${part.index}. skipped/${part.status} key=${part.cacheKey}`);
      continue;
    }
    const voicePath = await generatePart(part.text);
    if (voicePath) {
      generated++;
      actions.push(`${part.index}. generated key=${part.cacheKey}`);
    } else {
      failed++;
      actions.push(`${part.index}. failed key=${part.cacheKey}`);
    }
  }

  const after = inspectVoiceCache(config, analysis.parts);
  const stats = getVoiceStats(config);
  const beforeLines = before.parts.slice(0, 6).map((part) => formatVoiceCachePartLine('预热前 ', part));
  const afterLines = after.parts.slice(0, 6).map((part) => formatVoiceCachePartLine('预热后 ', part));
  const risks = [...analysis.risks];
  if (!apiReady && before.parts.some((part) => part.provider === 'api')) risks.push('API后端不可用，api/auto-api 分段不会生成');
  if (after.parts.some((part) => part.status !== 'hit')) risks.push('仍有分段没有命中缓存');

  return [
    '语音缓存预热',
    '模式: 管理员真实TTS缓存预热，不调用AI，不发送record',
    `TTS: ${config.enable_tts ? 'on' : 'off'} ${before.provider}${before.localReady ? '/local-ready' : ''} send=${before.sendMode}`,
    `克隆: ${before.cloneEnabled ? (before.cloneReady ? 'ready' : `missing${before.sampleReason ? `(${before.sampleReason})` : ''}`) : 'off'}`,
    `分段: ${before.parts.length}段 / 单段上限${before.maxChars}字${analysis.likelyTruncated ? ' / 可能截断' : ''}`,
    `预热前: ${voiceCacheStatusSummary(before.parts)}`,
    ...beforeLines,
    before.parts.length > beforeLines.length ? `预热前 ... 还有${before.parts.length - beforeLines.length}段未展示` : '',
    `预热动作: generated ${generated} / hit ${hit} / skipped ${skipped} / failed ${failed}`,
    ...actions.slice(0, 8),
    actions.length > 8 ? `... 还有${actions.length - 8}个动作未展示` : '',
    `预热后: ${voiceCacheStatusSummary(after.parts)}`,
    ...afterLines,
    after.parts.length > afterLines.length ? `预热后 ... 还有${after.parts.length - afterLines.length}段未展示` : '',
    `风险: ${risks.length ? [...new Set(risks)].join(' / ') : '无明显风险'}`,
    failed > 0 || stats.lastError ? `最近错误: ${stats.lastError || 'unknown'}` : '',
    '边界: 预热只代表音频缓存可复用，不代表文本事实正确；克隆语音也不能说成现实主播本人语音，不能拿去冒充本人。',
    '说明: 这里只生成或复用缓存，不会给群里发语音；要试听再用 /voice test <文本>。',
  ].filter(Boolean).join('\n');
}
