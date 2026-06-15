import {
  formatReplyCachePolicy,
  type ReplyCachePolicy,
  type StyleSceneDecision,
} from './ai-style-scene';

export interface ReplyCachePreflightPanelItem {
  input: string;
  normalized: string;
  scene: StyleSceneDecision;
  policy: ReplyCachePolicy;
  key: string;
  keyState: string;
  searchWouldRun: boolean;
  stableTactical: boolean;
  timeSensitive: boolean;
  knowledgeTitles: string[];
  knowledgeSignature: string;
  advice: string[];
}

export interface ReplyCachePoolStatusSnapshot {
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

export function formatReplyCachePreflightItem(item: ReplyCachePreflightPanelItem, index?: number): string[] {
  const prefix = typeof index === 'number' ? `${index}. ` : '';
  return [
    `${prefix}输入: ${item.input.slice(0, 100)}`,
    `归一化: ${item.normalized || '[空]'}`,
    `场景: ${item.scene.scene}${item.scene.needsRealtime ? '/需实时' : ''}${item.scene.signals.length ? ` (${item.scene.signals.join('/')})` : ''}`,
    `增强: 搜索${item.searchWouldRun ? '会' : '不会'}触发${item.stableTactical ? ' / 稳定战术' : ''}${item.timeSensitive ? ' / 时间敏感' : ''}`,
    `知识: ${item.knowledgeTitles.join(' / ') || '无分区'} sig=${item.knowledgeSignature ? item.knowledgeSignature.slice(0, 10) : '-'}`,
    `策略: ${formatReplyCachePolicy(item.policy)}${item.policy.enabled ? ` key=${item.key} 状态=${item.keyState}` : ` 状态=${item.keyState}`}`,
    `建议: ${item.advice.join('；')}`,
  ];
}

export function formatReplyCachePreflightPanel(input: string, items: ReplyCachePreflightPanelItem[]): string {
  const clean = (input || '').trim();
  if (!clean) return '/mem cache <消息>\n可用 /mem cache A || B 对比两条自然变体是否同 key。';
  const lines = [
    '回复缓存预检',
    '模式: 只读，不联网、不调用模型；模拟普通群聊主动接话，强触发和多模态会另行旁路。',
    ...items.flatMap((item, index) => formatReplyCachePreflightItem(item, items.length > 1 ? index + 1 : undefined)),
  ];
  if (items.length === 2) {
    const sameNormalized = items[0].normalized === items[1].normalized;
    const samePolicy = formatReplyCachePolicy(items[0].policy) === formatReplyCachePolicy(items[1].policy);
    const sameKey = !!items[0].key && items[0].key === items[1].key;
    lines.push(
      `对比: 归一化${sameNormalized ? '相同' : '不同'} / 策略${samePolicy ? '相同' : '不同'} / key${sameKey ? '相同' : '不同或不可缓存'}`,
      sameKey ? '判断: 这两条普通主动接话会合流到同一缓存。' : '判断: 这两条不会安全合流，先看策略/知识分区/实时词差异。',
    );
  }
  return lines.join('\n');
}

export function formatReplyCachePoolStatusPanel(snapshot: ReplyCachePoolStatusSnapshot): string {
  const totalSamples = snapshot.hits + snapshot.misses;
  const hitRate = totalSamples > 0 ? `${Math.round((snapshot.hits / totalSamples) * 100)}%` : '暂无样本';
  const capacity = snapshot.maxEntries > 0 ? Math.round((snapshot.entries / snapshot.maxEntries) * 100) : 0;
  const ttlSeconds = [...snapshot.ttlSeconds].sort((a, b) => a - b);
  const ttlLine = ttlSeconds.length > 0
    ? `min=${ttlSeconds[0]}s p50=${ttlSeconds[Math.floor(ttlSeconds.length / 2)]}s max=${ttlSeconds[ttlSeconds.length - 1]}s`
    : '无 fresh 条目';
  const status = snapshot.entries === 0
    ? 'cold/empty'
    : snapshot.expired > 0
      ? 'has-expired'
      : capacity >= 90
        ? 'near-capacity'
        : 'warm';
  const advice: string[] = [];
  if (snapshot.configuredTtl <= 0) {
    advice.push('ai_reply_cache_seconds <= 0，回复缓存关闭；只保留 single-flight 合并。');
  } else if (snapshot.entries === 0) {
    advice.push('缓存池为空，先观察普通主动接话；可用 /mem cache <消息> 预检哪些问法可缓存。');
  }
  if (totalSamples >= 20 && snapshot.hits / totalSamples < 0.2 && capacity >= 70) {
    advice.push('条目不少但命中偏低，考虑缩短 ai_reply_cache_seconds 或用 /mem cache 对比自然变体。');
  }
  if (capacity >= 90) {
    advice.push('容量接近上限，LRU 会淘汰最旧条目；常见稳定战术问法可保留，实时/身份/礼物旁路是正确的。');
  }
  if (snapshot.expired > 0) {
    advice.push('存在过期条目，下一次读/写会顺手清理；不需要为了这点单独清缓存。');
  }
  if (snapshot.inFlight > 0) {
    advice.push('当前有生成中的同 key 请求，后来的普通主动接话会合并等待，能减少重复 LLM 调用。');
  }
  if (snapshot.bypasses > Math.max(8, snapshot.hits + snapshot.misses)) {
    advice.push('旁路很多，说明高上下文/实时/多模态/身份等场景多；这是为了真实性和不复读。');
  }
  if (advice.length === 0) {
    advice.push('状态正常；继续用 /trace recent 看真实 cache hit/off 分布。');
  }

  return [
    '回复缓存池状态',
    '模式: 只读，不清理、不联网、不调用模型；只看当前进程内短 TTL 回复缓存。',
    `状态: ${status}`,
    `配置: ttl=${snapshot.configuredTtl}s max=${snapshot.maxEntries} entries=${snapshot.entries}/${snapshot.maxEntries}(${capacity}%)`,
    `条目: fresh ${snapshot.fresh} / expired ${snapshot.expired} / in-flight ${snapshot.inFlight}`,
    `命中: ${snapshot.hits}/${snapshot.misses} hitRate=${hitRate} 旁路${snapshot.bypasses}`,
    `TTL分布: ${ttlLine}`,
    `策略Top: ${snapshot.policyTop.join(' / ') || '暂无样本'}`,
    `建议: ${[...new Set(advice)].slice(0, 5).join('；')}`,
    '边界: 回复缓存只给普通主动接话用；@、回复、私聊、命令、实时事实、识图/语音、身份边界和礼物等场景会按策略旁路。',
  ].join('\n');
}
