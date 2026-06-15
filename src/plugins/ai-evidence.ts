export function extractEvidenceLines(text: string, maxLines: number = 5): string[] {
  if (!text) return [];
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => (
      /^(?:来源|缓存|source|cache)\s*[:：]/i.test(line)
      || /(?:CS API|HLTV|Liquipedia|VRS|webSearch|拉取|链接|https?:\/\/)/i.test(line)
    ))
    .map((line) => line.replace(/\s+/g, ' ').slice(0, 120));
  return lines.filter((line, index, all) => all.indexOf(line) === index).slice(0, maxLines);
}

export function extractRealtimeFreshnessLines(text: string, maxLines: number = 5): string[] {
  if (!text) return [];
  const result: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!/^(?:缓存|当前缓存)\s*[:：]/.test(line)) continue;
    if (/miss|还没有成功快照/.test(line)) {
      result.push(line.replace(/\s+/g, ' ').slice(0, 120));
      continue;
    }
    const key = (line.match(/^缓存\s*[:：]\s*([^\s，,]+)/) || [])[1] || (line.includes('当前缓存') ? '当前缓存' : 'cache');
    const status = /\bfresh\b|fresh，/i.test(line) ? 'fresh' : /\bstale\b|stale，|过期/.test(line) ? 'stale' : 'unknown';
    const age = (line.match(/age=(\d+s)/i) || line.match(/年龄\s*(\d+)s/) || [])[1];
    const ttl = (line.match(/ttl=(\d+s)/i) || line.match(/TTL\s*(\d+)s/i) || [])[1];
    const expired = (line.match(/expired=(\d+s)/i) || line.match(/已过期\s*(\d+)s/) || [])[1];
    const source = (line.match(/source=([^\s]+)/i) || line.match(/内部源\s*([^，\s]+)/) || [])[1];
    const parts = [`${key} ${status}`];
    if (age) parts.push(`age=${age}`);
    if (ttl) parts.push(`ttl=${ttl}`);
    if (expired) parts.push(`expired=${expired}`);
    if (source) parts.push(`source=${source}`);
    result.push(parts.join(' ').slice(0, 120));
    if (result.length >= maxLines) break;
  }
  return result.filter((line, index, all) => all.indexOf(line) === index);
}

export function buildRealtimeReferencePack(searchInfo: string): string {
  const freshnessLines = extractRealtimeFreshnessLines(searchInfo, 8);
  const hasStaleEvidence = /(?:^|\n)\s*(?:缓存|当前缓存)\s*[:：].*\bstale\b/i.test(searchInfo)
    || /不能当实时结论/.test(searchInfo);
  const hasFreshEvidence = freshnessLines.some((line) => /\bfresh\b/i.test(line));
  const hasMissEvidence = /(?:^|\n)\s*(?:缓存|当前缓存)\s*[:：].*(?:\bmiss\b|还没有成功快照)/i.test(searchInfo)
    || freshnessLines.some((line) => /\bmiss\b|还没有成功快照/i.test(line));
  const staleOnly = hasStaleEvidence && !hasFreshEvidence;
  const evidenceLines = extractEvidenceLines(searchInfo, 3);
  const freshnessSummary = freshnessLines.length > 0
    ? freshnessLines.map((line) => `  * ${line}`).join('\n')
    : '  * 未看到缓存新鲜度行；只能按联网摘要/来源片段谨慎回答';
  return [
    '[实时事实参考]',
    '使用规则：',
    '- 下方是本条消息可用的联网/实时依据；回答事实问题时优先级高于本地知识和模型记忆。',
    '- 只说资料里出现的比分、排名、阵容、转会、日期；没出现的不要补完。',
    '- 如果资料没有覆盖用户问的具体点，就直接说“这点我得查最新的”，别凭印象编。',
    '证据新鲜度:',
    freshnessSummary,
    hasStaleEvidence ? '- 注意：资料里含 stale/旧缓存，只能当线索，不能说成最新实时结论。' : '',
    staleOnly ? '- 关键边界：本条实时资料只有 stale/旧缓存，没有 fresh；必须说“旧快照/线索/我得查最新”，不能报成“现在/最新”。' : '',
    hasMissEvidence ? '- 注意：miss/无快照表示本地没有证据，不等于没有比赛、没有赛果或没有变动。' : '',
    evidenceLines.length > 0 ? `来源线索: ${evidenceLines.join(' / ')}` : '',
    '- CS 相关优先级：CS API / HLTV / Liquipedia > 联网补充摘要 > 本地知识 > 模型记忆。',
    '资料：',
    searchInfo,
    '[/实时事实参考]',
  ].filter(Boolean).join('\n');
}

export function summarizeRealtimeEvidence(
  searchInfo: string,
  hltvLabels: string[],
  knowledgeTitles: string[],
  memoryHits: number,
): string[] {
  const result: string[] = [];
  if (hltvLabels.length > 0) result.push(`HLTV/CS API: ${hltvLabels.join(',')}`);
  const extracted = extractEvidenceLines(searchInfo, 4);
  result.push(...extracted);
  if (searchInfo && extracted.length === 0) {
    result.push(searchInfo.includes('[联网补充]') ? 'webSearch联网补充摘要' : '联网/实时摘要');
  }
  if (knowledgeTitles.length > 0) result.push(`知识库: ${knowledgeTitles.slice(0, 3).join(',')}`);
  if (memoryHits > 0) result.push(`RAG记忆: ${memoryHits}条`);
  return result.filter((item, index, all) => item && all.indexOf(item) === index).slice(0, 8);
}
