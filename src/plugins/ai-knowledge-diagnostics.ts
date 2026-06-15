import type { AIConfig } from '../types';
import {
  inspectQuoteKnowledge,
  inspectKnowledgeFreshness,
  inspectKnowledgeInbox,
  inspectKnowledgeSources,
  isKnowledgeAutoEnabled,
  loadKnowledgeSources,
  previewKnowledgeSourceTrust,
  recommendKnowledgeCandidateAction,
  type KnowledgeCandidate,
  type KnowledgeSearchResult,
  type KnowledgeSourceInspectRow,
} from './knowledge-base';
import { formatTime } from './reply-postprocess';

export function formatKnowledgeResults(results: KnowledgeSearchResult[], maxChars: number = 1200): string {
  if (results.length === 0) return '没检索到，关键词换一下，别硬搜。';
  return results
    .map((item, index) => `${index + 1}. ${item.title} (${item.score})\n${item.excerpt}`)
    .join('\n\n')
    .slice(0, maxChars);
}

export function formatQuoteKnowledgePreflight(query: string): string {
  const inspected = inspectQuoteKnowledge(query);
  return [
    '语录/口癖预检',
    `关键词: ${inspected.query || '[空]'}`,
    `短句池: 命中${inspected.matchedLines}/${inspected.totalLines} 分区${inspected.sectionCount}${inspected.fallbackUsed ? ' fallback=全量池' : ''}`,
    `分区: ${inspected.sections.join(' / ') || '无'}`,
    inspected.sampleLines.length > 0
      ? `样例: ${inspected.sampleLines.join(' / ')}`
      : '样例: 无',
    `边界: ${inspected.boundary}`,
    `行动建议: ${inspected.advice.join('；')}`,
    '说明: 这里只读检查短句池，不调用模型、不联网、不写库；/quote 实际发送也只能当口吻锚点。',
  ].join('\n');
}

export function isOriginalQuoteRequest(text: string): boolean {
  return /(?:原话|逐字|一字不差|本人说过|本人讲过|经典语录|名场面台词|直播原文|切片原文|完整字幕|完整台词|复刻|还原)/i.test(text);
}

export function formatQuoteReply(query: string, line: string): string {
  const boundary = '边界: 这是口癖/短句锚点，只能当场景口吻参考，不是玩机器本人逐字原话。';
  if (!line) {
    return [
      '这关键词没逮到口癖锚点，换个词。',
      isOriginalQuoteRequest(query) ? boundary : '提示: 可以 /quote check <关键词> 先看短句池命中。',
    ].join('\n');
  }
  if (isOriginalQuoteRequest(query)) {
    return [
      `口癖锚点: ${line}`,
      boundary,
      '想扩素材先放 knowledge/inbox/，跑 /kb inbox 体检，别把长字幕当原话灌库。',
    ].join('\n');
  }
  return line;
}

export function formatKnowledgeSourceTrustPreview(input: string): string {
  const clean = (input || '').trim();
  if (!clean) return '/kb trust <链接或域名>';
  const preview = previewKnowledgeSourceTrust(clean);
  return [
    '知识来源评级预检',
    `输入: ${preview.input.slice(0, 120)}`,
    `评级: ${preview.sourceTrust}`,
    `域名: ${preview.sourceHosts.join(' / ') || '未解析到'}`,
    `URL: ${preview.urls.join(' ') || '无'}`,
    ...preview.reasons.map((item) => `原因: ${item}`),
    ...preview.policy.map((item) => `边界: ${item}`),
    '说明: 这里只做来源/域名预检，不联网抓取、不写候选；真正写库仍要过 /kb preview 或 /kb import-url 的质量闸。',
  ].join('\n');
}

export function parseKnowledgeSourceInspectLimit(input: string, total: number): number {
  const clean = (input || '').trim().toLowerCase();
  if (clean === 'all' || clean === '全部') return Math.max(1, Math.min(total, 40));
  const match = clean.match(/(?:--limit\s+|limit=)?(\d{1,2})/);
  return Math.max(1, Math.min(Number(match?.[1]) || 10, 40));
}

export function formatKnowledgeSourceInspectRow(row: KnowledgeSourceInspectRow): string[] {
  const hosts = row.sourceHosts.join(',') || (row.evidenceHint ? row.evidenceHint.replace(/^https?:\/\//, '').replace(/\/$/, '') : '无');
  const last = row.lastRefreshAt > 0 ? `${formatTime(row.lastRefreshAt)} / ${row.minutesSinceRefresh}m前` : '从未';
  const next = row.status === 'fresh' ? `${row.nextRefreshInMinutes}m后` : '现在可刷新';
  const reason = row.autoWriteReason.length > 42 ? `${row.autoWriteReason.slice(0, 41)}…` : row.autoWriteReason;
  return [
    `- ${row.id}: ${row.status} / ${row.sourceType} / cfgTrusted=${row.trusted ? 'yes' : 'no'} / eligible=${row.autoCommitEligible ? 'yes' : 'no'}`,
    `  来源=${row.sourceTrust}(${hosts}) / auto=${row.autoWriteState}(${reason}) / last=${last} / next=${next}`,
  ];
}

export function formatKnowledgeSourcesReport(config: AIConfig, input: string): string {
  const sources = loadKnowledgeSources();
  const limit = parseKnowledgeSourceInspectLimit(input, sources.length);
  const report = inspectKnowledgeSources(sources, { limit });
  const rows = report.rows.flatMap(formatKnowledgeSourceInspectRow);
  return [
    '知识来源体检',
    `模式: 只读，不联网、不写库、不改 source-state；生成 ${formatTime(report.generatedAt)}`,
    `来源状态: total ${report.total} / fresh ${report.fresh} / due ${report.due} / never ${report.never}`,
    `自动配置: config=${config.knowledge_auto_update !== false ? 'on' : 'off'} runtime=${isKnowledgeAutoEnabled() ? 'on' : 'off'} interval=${config.knowledge_auto_interval_minutes || 180}m batch=${config.knowledge_auto_batch_max_sources || 6}`,
    `写库前置: eligible ${report.autoCommitEligible} / cfgTrusted ${report.trustedConfigured} / domainTrusted ${report.trustedDomains} / domainRisky ${report.riskyDomains}`,
    ...rows,
    report.rows.length < report.total ? `还有 ${report.total - report.rows.length} 个来源未展示，可用 /kb sources all。` : '',
    '边界: due/never 只表示需要刷新，不等于已有最新事实；unknown/risky 不能包装成已核验事实、实时结论或逐字原话。',
    '下一步: /kb refresh [关键词] 刷候选，/kb trust <链接> 单独查域名，/kb audit 查主库风险。',
  ].filter(Boolean).join('\n');
}

export function formatKnowledgeFreshnessReport(input: string): string {
  const limit = parseKnowledgeSourceInspectLimit(input, 30);
  const report = inspectKnowledgeFreshness(limit);
  const rows = report.issues.map((issue, index) => [
    `${index + 1}. ${issue.level}: ${issue.title}`,
    `  触发: ${issue.triggers.join(' / ')}；缺失: ${issue.missing.join(' / ')}`,
    `  摘要: ${issue.excerpt}`,
    issue.remediation.length ? `  补证: ${issue.remediation.join('；')}` : '',
    `  建议: ${issue.advice}`,
  ].filter(Boolean).join('\n'));
  const remediationRoutes = [...new Set(report.issues.flatMap((issue) => issue.remediation))].slice(0, 8);
  return [
    '知识库时效事实体检',
    `模式: 只读，不联网、不写库；扫描 ${report.scanned}/${report.sections} 块`,
    `风险: hard ${report.hardSections} / risk ${report.riskSections}`,
    rows.length > 0 ? rows.join('\n') : '结果: 没发现明显时效事实边界缺口。',
    remediationRoutes.length > 0 ? `补证路线: ${remediationRoutes.join('；')}` : '补证路线: CS实时事实先 /cs verify all，管理员先 /cs warm plan all，再用 /cs evidence all 复核。',
    report.issues.length >= limit ? `提示: 当前只显示前 ${limit} 条，可用 /kb stale all 看更多。` : '',
    '边界: 本命令只找“容易被误当当前事实”的知识块；真正回复排名/阵容/赛果前仍以 /cs verify、/cs evidence 和 fresh 实时证据为准，stale/miss 不能当实时结论。',
    '下一步: 给风险块补证据链接、抓取时间、fresh/stale/旧快照边界；或把内容降级为历史线索/摘要；补完后再走 /cs verify 与 /cs evidence 复核。',
  ].filter(Boolean).join('\n');
}

export function formatKnowledgeInboxReport(input: string): string {
  const limit = parseKnowledgeSourceInspectLimit(input, 30);
  const report = inspectKnowledgeInbox(limit);
  const rows = report.rows.map((row, index) => {
    const kb = Math.round(row.bytes / 1024 * 10) / 10;
    const hosts = row.sourceHosts.join(',') || '无';
    const issues = row.issues.length ? row.issues.join(' / ') : '无明显硬伤';
    const advice = row.advice.join('；');
    return [
      `${index + 1}. ${row.file} ${kb}KB ${row.lines}行 ${row.materialType}/${row.risk} ingest=${row.ingestMode}`,
      `  来源=${row.sourceTrust}(${hosts}) 证据${row.evidenceUrls.length}条 问题=${issues}`,
      `  建议=${advice}`,
    ].join('\n');
  });
  return [
    '知识库 inbox 素材体检',
    `模式: 只读，不生成候选、不写库；跳过 README.md；生成 ${formatTime(report.generatedAt)}`,
    `素材: total ${report.totalFiles} / scanned ${report.scannedFiles} / ${Math.round(report.totalBytes / 1024 * 10) / 10}KB`,
    `风险: needs_source ${report.needsSource} / 长转写 ${report.longTranscript} / 带证据链接 ${report.withEvidence}`,
    rows.length > 0 ? rows.join('\n') : '结果: knowledge/inbox 里没有可导入的 md/txt 素材文件。',
    report.rows.length < report.totalFiles ? `提示: 当前只显示前 ${limit} 个，可用 /kb inbox all 看更多。` : '',
    '边界: inbox 是素材候选区，不是事实库；长转写、完整字幕和未核验原话要先摘要化，实时事实要补公开来源并用 /cs verify 复核。',
    '下一步: 结构 OK 再 /kb ingest；split-first 先拆成“场景/摘要/可用话术/禁用边界”；needs_source 先补链接或降级为本地授权摘要。',
  ].filter(Boolean).join('\n');
}

export function formatKnowledgeCandidateAdvice(candidate: KnowledgeCandidate, maxChars: number = 180): string {
  const advice = recommendKnowledgeCandidateAction(candidate);
  return advice.length > maxChars ? `${advice.slice(0, maxChars - 1)}…` : advice;
}
