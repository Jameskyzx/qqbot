import type { AIConfig } from '../types';
import { classifyImageSource } from './ai-media-trace';
import { previewText } from './reply-postprocess';
import { getSttStats, inspectSttCacheSources } from './stt';

export function formatSttCacheInspectLine(
  label: string,
  item: ReturnType<typeof inspectSttCacheSources>[number] | undefined,
): string {
  if (!item) return `${label}: 无`;
  const ttl = item.status === 'hit'
    ? ` ttl=${item.ttlSeconds}s chars=${item.chars}`
    : item.status === 'expired'
      ? ` age=${item.ageSeconds}s chars=${item.chars}`
      : '';
  return `${label}: ${item.status}${ttl} key=${item.cacheKey || '-'} ${previewText(item.reason, 70)}`;
}

export function formatSttBackendDelta(before: ReturnType<typeof getSttStats>, after: ReturnType<typeof getSttStats>): string {
  const localDelta = Math.max(0, after.localRuns - before.localRuns);
  const apiDelta = Math.max(0, after.apiRuns - before.apiRuns);
  const hitDelta = Math.max(0, after.hits - before.hits);
  const missDelta = Math.max(0, after.misses - before.misses);
  const inFlightDelta = Math.max(0, after.inFlightHits - before.inFlightHits);
  return `后端动作: local+${localDelta} api+${apiDelta} cacheHit+${hitDelta} cacheMiss+${missDelta} inFlightHit+${inFlightDelta}`;
}

export async function formatSttEndToEndTest(
  config: AIConfig,
  input: string,
  transcribeSource: (source: string) => Promise<string[]>,
): Promise<string> {
  const sourceKind = classifyImageSource(input);
  const cacheBefore = inspectSttCacheSources(config, [input], 1)[0];
  const statsBefore = getSttStats(config);
  let transcripts: string[] = [];
  let thrownError = '';
  try {
    transcripts = await transcribeSource(input);
  } catch (err) {
    thrownError = err instanceof Error ? err.message : String(err);
  }
  const statsAfter = getSttStats(config);
  const cacheAfter = inspectSttCacheSources(config, [input], 1)[0];
  const transcript = transcripts.join('\n').trim();
  const ok = transcript.length > 0;
  const backendBoundary = (statsAfter.localRuns - statsBefore.localRuns) <= 0 && (statsAfter.apiRuns - statsBefore.apiRuns) <= 0
    ? '本次后端 local/api 没增加，说明没有重新听音频，只复用了已有转写。'
    : '本次有后端听写动作，缓存后 hit 才代表这次转写结果已经可复用。';
  return [
    ok ? '听写链路测试' : '听写链路测试失败',
    `语音源: ${sourceKind}`,
    `STT: ${config.enable_stt ? 'on' : 'off'} ${statsAfter.provider}${statsAfter.localReady ? '/local-ready' : ''} model=${statsAfter.model || '未配置'} payload=${statsAfter.payloadMode}`,
    formatSttCacheInspectLine('缓存前', cacheBefore),
    formatSttCacheInspectLine('缓存后', cacheAfter),
    formatSttBackendDelta(statsBefore, statsAfter),
    statsAfter.lastPayloadMode ? `payload实际: ${statsAfter.lastPayloadMode}` : '',
    ok ? '听写: OK' : `听写: FAIL ${previewText(thrownError || statsAfter.lastError || 'empty transcript', 160)}`,
    ok ? `转写: ${previewText(transcript, 500)}` : '',
    ok
      ? `边界: STT缓存 hit 只代表转写文本可复用，不证明音频内容完整；${backendBoundary}`
      : '边界: 听写失败或空转写时不能假装听到语音；缓存后不是 hit 也不能拿缓存当语音内容。',
  ].filter(Boolean).join('\n');
}
