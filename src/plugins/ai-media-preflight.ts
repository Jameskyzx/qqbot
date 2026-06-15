import type { AIConfig } from '../types';
import { getCacheStats as getImageCacheStats, inspectImageCacheSources } from './image-cache';
import { getSttStats, inspectSttCacheSources } from './stt';
import {
  classifyImageSource,
  describeDataUrl,
  summarizeImageSourceKinds,
} from './ai-media-trace';
import { previewText } from './reply-postprocess';
import { formatSttCachePreflight } from './ai-voice-diagnostics';

function uniqueNonEmpty(items: string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

export function formatMediaPreflight(
  config: AIConfig,
  imageSources: string[],
  recordSources: string[],
  apiReady: boolean,
): string {
  const imageStats = getImageCacheStats();
  const sttStats = getSttStats(config);
  const imageInputCount = imageSources.length;
  const imageMax = Math.max(1, Math.min(config.vision_max_images || 2, 4));
  const imagePassCount = config.enable_vision ? Math.min(imageInputCount, imageMax) : 0;
  const imageTruncated = imageInputCount > imagePassCount;
  const recordInputCount = recordSources.length;
  const sttLimit = Math.max(1, Math.min(config.stt_max_records || 1, 4));
  const recordPassCount = config.enable_stt ? Math.min(recordInputCount, sttLimit) : 0;
  const recordTruncated = recordInputCount > recordPassCount;
  const risks: string[] = [];
  const next: string[] = [];
  const boundaries: string[] = [];

  if (imageInputCount === 0 && recordInputCount === 0) {
    risks.push('没有图片或语音源');
    next.push('附图/附语音，或传图片URL/音频URL');
    boundaries.push('只能按文字上下文回复，不要假装看图或听到语音。');
  }
  if (imageInputCount > 0 && !config.enable_vision) {
    risks.push('识图未开启');
    next.push('打开 enable_vision');
    boundaries.push('不能描述图片细节，只能请对方补文字或重发。');
  } else if (imageInputCount > 0 && config.enable_vision && !apiReady) {
    risks.push('识图API不可用');
    next.push('检查 api_url/model/api_key');
    boundaries.push('图片不会被模型实际看到，不能编造画面内容。');
  } else if (imageInputCount > 0) {
    boundaries.push(`只能描述实际传入模型的前${imagePassCount}张图片；看不清要直说。`);
  }
  if (imageTruncated) {
    risks.push(`图片会截断 ${imagePassCount}/${imageInputCount}`);
    next.push('减少图片数或调高 vision_max_images');
  }
  if (recordInputCount > 0 && !config.enable_stt) {
    risks.push('听写未开启');
    next.push('打开 enable_stt');
    boundaries.push('不能假装听到了语音内容，只能请对方补文字。');
  } else if (recordInputCount > 0 && config.enable_stt && ((sttStats.provider === 'api' && !apiReady) || (sttStats.provider === 'auto' && !sttStats.localReady && !apiReady))) {
    risks.push('听写后端不可用');
    next.push('配置本地STT或可用对话接口');
    boundaries.push('语音无法可靠听写，不能把猜测当语音内容。');
  } else if (recordInputCount > 0) {
    boundaries.push(`只能接听写成功的前${recordPassCount}条语音；空转写就说没听清。`);
  }
  if (recordTruncated) {
    risks.push(`语音会截断 ${recordPassCount}/${recordInputCount}`);
    next.push('减少语音条数或调高 stt_max_records');
  }
  if (imageStats.lastError) {
    risks.push(`最近图片错误: ${imageStats.lastError.slice(0, 60)}`);
    next.push('/vision test <图片URL> 定位下载/模型问题');
  }
  const imageCacheInspect = inspectImageCacheSources(imageSources, 3);
  const imageCacheLines = imageCacheInspect.map((item, index) => {
    const detail = item.status === 'hit'
      ? ` ttl=${item.ttlSeconds}s`
      : item.status === 'local-readable'
        ? ` ${item.sizeKB}KB`
        : '';
    return `图缓存${index + 1}: ${item.status}${detail} ${item.reason.slice(0, 42)}`;
  });
  if (imageCacheInspect.some((item) => item.status === 'miss' || item.status === 'expired')) {
    next.push('常用图片先 /vision warm 预热缓存');
  }
  const sttCacheInspect = inspectSttCacheSources(config, recordSources, 3);
  const sttCacheLines = sttCacheInspect.map((item, index) => {
    const detail = item.status === 'hit'
      ? ` chars=${item.chars} ttl=${item.ttlSeconds}s`
      : item.status === 'expired'
        ? ` age=${item.ageSeconds}s`
        : '';
    return `音缓存${index + 1}: ${item.status}${detail} ${item.reason.slice(0, 42)}`;
  });
  if (config.enable_stt && sttCacheInspect.some((item) => item.status === 'miss' || item.status === 'expired')) {
    next.push('常用语音先 /voice stt 预热听写缓存');
  }
  if (sttStats.lastError) {
    risks.push(`最近听写错误: ${sttStats.lastError.slice(0, 60)}`);
    next.push('/voice stt <语音URL> 定位听写问题');
  }

  return [
    '多模态预检',
    '模式: 只解析图片/语音源和配置，不下载图片、不听写语音、不调用模型',
    `图片: 输入${imageInputCount}张 / 将传${imagePassCount}/${imageInputCount} / max${imageMax}${imageTruncated ? ' 已截断' : ''}`,
    `图片源: ${summarizeImageSourceKinds(imageSources).join(' / ') || '无'}`,
    imageCacheLines.length ? `图片缓存预检: ${imageCacheLines.join(' / ')}` : '',
    `语音: 输入${recordInputCount}条 / 将听写${recordPassCount}/${recordInputCount} / max${sttLimit}${recordTruncated ? ' 已截断' : ''}`,
    `语音源: ${summarizeImageSourceKinds(recordSources).join(' / ') || '无'}`,
    sttCacheLines.length ? `语音缓存预检: ${sttCacheLines.join(' / ')}` : '',
    `配置: vision=${config.enable_vision ? 'on' : 'off'} model=${config.vision_model || config.model || '未配置'}；stt=${config.enable_stt ? 'on' : 'off'} ${sttStats.provider}${sttStats.localReady ? '/local-ready' : ''}`,
    `回复边界: ${boundaries.length ? boundaries.join('；') : '可以按实际可见/听写内容回复，事实和截图数据仍要留边界。'}`,
    ...imageSources.slice(0, 3).map((source, index) => `图${index + 1}: ${classifyImageSource(source)} ${previewText(source, 72)}`),
    ...recordSources.slice(0, 3).map((source, index) => `音${index + 1}: ${classifyImageSource(source)} ${previewText(source, 72)}`),
    imageSources.length + recordSources.length > 6 ? `... 还有${imageSources.length + recordSources.length - 6}个源未展示` : '',
    `风险: ${risks.length ? risks.join(' / ') : '无明显风险'}`,
    `下一步: ${next.length ? [...new Set(next)].join('；') : '需要真测图片用 /vision test；需要真测语音用 /voice stt'}`,
  ].filter(Boolean).join('\n');
}

export function formatVisionPreflight(
  config: AIConfig,
  sources: string[],
  apiReady: boolean,
): string {
  const stats = getImageCacheStats();
  const inputCount = sources.length;
  const maxImages = Math.max(1, Math.min(config.vision_max_images || 2, 4));
  const passCount = Math.min(inputCount, maxImages);
  const truncated = inputCount > passCount;
  const sourceKinds = summarizeImageSourceKinds(sources);
  const risks: string[] = [];
  const next: string[] = [];

  if (!config.enable_vision) {
    risks.push('识图未开启');
    next.push('打开 enable_vision');
  }
  if (!(config.vision_model || config.model)) {
    risks.push('识图模型未配置');
    next.push('配置 vision_model 或 model');
  }
  if (config.enable_vision && !apiReady) {
    risks.push('对话接口不可用');
    next.push('检查 api_url/model/api_key');
  }
  if (inputCount === 0) {
    risks.push('没有图片源');
    next.push('带图片或传图片URL');
  }
  if (truncated) {
    risks.push(`会按 vision_max_images 截断 ${passCount}/${inputCount}`);
    next.push('减少图片数或调高 vision_max_images');
  }
  if (sources.some((source) => ['file-url', 'local-path'].includes(classifyImageSource(source)))) {
    risks.push('本地/文件路径需要 bot 进程可读');
    next.push('Docker/NapCat 路径不通时用 base64 或 HTTP URL');
  }
  if (sources.some((source) => classifyImageSource(source) === 'unknown')) {
    risks.push('存在未知图片源格式');
    next.push('优先用 http(s)、base64、data:image 或直接附图');
  }
  if (stats.count >= Math.max(1, Math.floor(stats.maxFiles * 0.9))) {
    risks.push('图片缓存文件数接近上限');
    next.push('必要时跑 /maint clean 或调 image_cache_max_files');
  }
  if (stats.sizeMB >= stats.maxSizeMB * 0.9) {
    risks.push('图片缓存容量接近上限');
    next.push('必要时跑 /maint clean 或调 image_cache_max_mb');
  }
  if (stats.lastError) {
    risks.push(`最近下载错误: ${stats.lastError.slice(0, 80)}`);
    next.push('用 /vision test <图片URL> 做端到端定位');
  }
  const cacheInspect = inspectImageCacheSources(sources, 4);
  const cacheInspectSummary = cacheInspect.map((item, index) => {
    const detail = item.status === 'hit'
      ? ` ttl=${item.ttlSeconds}s ${item.sizeKB}KB`
      : item.status === 'expired'
        ? ' 已过期'
        : item.status === 'local-readable'
          ? ` ${item.sizeKB}KB`
          : '';
    return `${index + 1}. ${item.status}${detail} ${item.reason.slice(0, 48)}`;
  });
  if (cacheInspect.some((item) => item.status === 'miss' || item.status === 'expired')) {
    next.push('常用图片可先跑 /vision warm 预热图片缓存');
  }
  if (cacheInspect.some((item) => item.status === 'local-missing')) {
    risks.push('存在本地图片路径不可读');
  }

  return [
    '识图预检',
    '模式: 只解析图片源和配置，不下载图片，不调用模型',
    `开关: ${config.enable_vision ? 'on' : 'off'} 模型=${config.vision_model || config.model || '未配置'} payload=${config.vision_payload_mode || 'auto'}`,
    `图片: 输入${inputCount}张 / 将传${passCount}/${inputCount} / max${maxImages}${truncated ? ' 已截断' : ''}`,
    `来源类型: ${sourceKinds.join(' / ') || '无'}`,
    `缓存: ${stats.count}/${stats.maxFiles}张 ${stats.sizeMB}/${stats.maxSizeMB}MB 命中${stats.hits}/${stats.misses} 失败${stats.downloadFailures} 飞行${stats.inFlight}`,
    cacheInspectSummary.length ? '缓存预检:' : '',
    ...cacheInspectSummary,
    ...sources.slice(0, 4).map((source, index) => `${index + 1}. ${classifyImageSource(source)} ${previewText(source, 86)}`),
    sources.length > 4 ? `... 还有${sources.length - 4}张未展示` : '',
    `风险: ${risks.length ? risks.join(' / ') : '无明显风险'}`,
    `下一步: ${next.length ? [...new Set(next)].join('；') : '可以 /vision test <图片URL> 做真实下载+模型测试'}`,
  ].filter(Boolean).join('\n');
}

function imageCacheInspectStatusSummary(items: ReturnType<typeof inspectImageCacheSources>): string {
  const counts = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  return ['hit', 'miss', 'in-flight', 'expired', 'inline', 'local-readable', 'local-missing', 'too-large', 'invalid']
    .map((key) => `${key} ${counts[key] || 0}`)
    .join(' / ');
}

export async function formatVisionCacheWarm(
  config: AIConfig,
  sources: string[],
  warmSource: (source: string) => Promise<string | null>,
): Promise<string> {
  const uniqueSources = uniqueNonEmpty(sources);
  if (uniqueSources.length === 0) return '/vision warm <图片URL>\n也可以把图片和 /vision warm 发在同一条消息里';
  const maxWarm = Math.max(1, Math.min(config.vision_max_images || 2, 4));
  const targets = uniqueSources.slice(0, maxWarm);
  const truncated = uniqueSources.length > targets.length;
  const before = inspectImageCacheSources(targets, maxWarm);
  const actions: string[] = [];
  let warmed = 0;
  let hit = 0;
  let skipped = 0;
  let failed = 0;

  for (const item of before) {
    const index = actions.length + 1;
    if (item.status === 'hit') {
      hit++;
      actions.push(`${index}. hit/no-op key=${item.cacheKey} ttl=${item.ttlSeconds}s ${item.sizeKB}KB`);
      continue;
    }
    if (item.kind !== 'remote') {
      skipped++;
      actions.push(`${index}. skip ${item.status} ${previewText(item.reason, 48)}`);
      continue;
    }
    if (item.status === 'invalid' || item.status === 'too-large') {
      skipped++;
      actions.push(`${index}. skip ${item.status} ${previewText(item.reason, 48)}`);
      continue;
    }
    const dataUrl = await warmSource(item.source);
    const afterOne = inspectImageCacheSources([item.source], 1)[0];
    if (dataUrl && afterOne?.status === 'hit') {
      warmed++;
      actions.push(`${index}. warmed key=${afterOne.cacheKey} ${afterOne.sizeKB}KB ${describeDataUrl(dataUrl)}`);
    } else {
      failed++;
      const stats = getImageCacheStats();
      actions.push(`${index}. fail key=${item.cacheKey} ${previewText(stats.lastError || afterOne?.reason || 'unknown', 80)}`);
    }
  }

  const after = inspectImageCacheSources(targets, maxWarm);
  const risks: string[] = [];
  const next: string[] = [];
  if (truncated) {
    risks.push(`预热按 vision_max_images 截断 ${targets.length}/${uniqueSources.length}`);
    next.push('减少图片数或调高 vision_max_images');
  }
  if (failed > 0) {
    risks.push('存在图片下载失败');
    next.push('/vision test <图片URL> 定位下载/模型链路');
  }
  if (after.some((item) => item.status === 'expired' || item.status === 'miss')) {
    risks.push('预热后仍有未命中或过期图片');
  }
  const stats = getImageCacheStats();
  if (stats.sizeMB >= stats.maxSizeMB * 0.9) {
    risks.push('图片缓存容量接近上限');
    next.push('必要时跑 /maint clean 或调 image_cache_max_mb');
  }
  if (stats.count >= Math.max(1, Math.floor(stats.maxFiles * 0.9))) {
    risks.push('图片缓存文件数接近上限');
    next.push('必要时跑 /maint clean 或调 image_cache_max_files');
  }

  return [
    '图片缓存预热',
    '模式: 真实下载图片写入 image_cache，不调用视觉模型，不生成AI回复',
    `图片: 输入${uniqueSources.length}张 / 预热${targets.length}/${uniqueSources.length} / max${maxWarm}${truncated ? ' 已截断' : ''}`,
    `来源: ${summarizeImageSourceKinds(targets).join(' / ') || '无'}`,
    `预热前: ${imageCacheInspectStatusSummary(before)}`,
    `预热动作: warmed ${warmed} / hit ${hit} / skipped ${skipped} / failed ${failed}`,
    ...actions.slice(0, 6),
    actions.length > 6 ? `... 还有${actions.length - 6}条动作未展示` : '',
    `预热后: ${imageCacheInspectStatusSummary(after)}`,
    `缓存: ${stats.count}/${stats.maxFiles}张 ${stats.sizeMB}/${stats.maxSizeMB}MB 命中${stats.hits}/${stats.misses} 失败${stats.downloadFailures} 飞行${stats.inFlight}`,
    `风险: ${risks.length ? [...new Set(risks)].join(' / ') : '无明显风险'}`,
    '边界: 图片缓存命中只代表下载文件可复用，不代表模型已经看过图片；要验证识图质量仍需 /vision test。',
    `下一步: ${next.length ? [...new Set(next)].join('；') : '可以 /vision check 复查 hit，或 /vision test 做端到端识图测试'}`,
  ].filter(Boolean).join('\n');
}

export async function formatMediaCacheWarm(
  config: AIConfig,
  imageSources: string[],
  recordSources: string[],
  apiReady: boolean,
  warmImageSource: (source: string) => Promise<string | null>,
): Promise<string> {
  const images = uniqueNonEmpty(imageSources);
  const records = uniqueNonEmpty(recordSources);
  if (images.length === 0 && records.length === 0) {
    return '/media warm <图片URL/语音URL或附图附语音>\n图片会真实下载进缓存；语音只做STT缓存预检。';
  }
  const imagePanel = images.length > 0
    ? await formatVisionCacheWarm(config, images, warmImageSource)
    : '图片缓存预热\n图片: 无';
  const recordPanel = records.length > 0
    ? formatSttCachePreflight(config, records, apiReady)
    : '听写缓存预检\n语音: 无';
  return [
    '多模态缓存预热',
    '模式: 图片真实下载写入 image_cache；语音只读检查STT缓存，不听写、不调用模型',
    '--- 图片 ---',
    imagePanel,
    '--- 语音 ---',
    recordPanel,
    '总边界: 预热命中只代表缓存可复用，不代表模型已经看过图片或听过语音；真实内容仍以 /vision test 和 /voice stt 为准。',
  ].join('\n');
}
