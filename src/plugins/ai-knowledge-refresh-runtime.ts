import type { AIConfig } from '../types';
import { webSearch } from './web-search';
import {
  auditKnowledge,
  autoCommitKnowledgeCandidate,
  filterDueKnowledgeSources,
  isKnowledgeAutoEnabled,
  knowledgeSourceEvidenceHint,
  loadKnowledgeSources,
  markKnowledgeAutoRefresh,
  markKnowledgeSourceRefreshed,
  previewKnowledgeCandidate,
  type KnowledgeCandidate,
  type KnowledgeSource,
} from './knowledge-base';
import {
  formatKnowledgeCandidateAdvice,
} from './ai-knowledge-diagnostics';
import { describeKnowledgeCandidateQuality } from './knowledge-base';

export const knowledgeRefreshQueries = [
  '玩机器 Machine 6657 经典语录 切片 CS2 解说',
  '玩机器 6657 斗鱼 礼物 感谢 老板大气',
  '玩机器 6657 直播间 烂梗 弹幕 sb6657',
  '玩机器 Machine 萌娘百科 6657 CSGO 解说',
  'HLTV top 20 players 2025 ZywOo donk ropz m0NESY sh1ro NiKo',
  'CS2 2026 team ranking Vitality NAVI Spirit MOUZ G2 Falcons FaZe',
];

export function makeFallbackKnowledgeSources(): KnowledgeSource[] {
  return knowledgeRefreshQueries.map((query, index) => ({
    id: `fallback-${index + 1}`,
    query,
    sourceType: /HLTV|ranking|team/i.test(query) ? 'public_fact' : 'public_summary',
    trusted: !/礼物|感谢/.test(query),
    autoCommitEligible: !/礼物|感谢|切片|语录/.test(query),
    intervalMinutes: 720,
  }));
}

export function chooseRefreshSources(config: AIConfig, queryOverride: string, autoRun: boolean): KnowledgeSource[] {
  if (queryOverride.trim()) {
    return [{
      id: 'manual-query',
      query: queryOverride.trim(),
      sourceType: /HLTV|Liquipedia|排名|阵容|转会|赛程|比分/i.test(queryOverride) ? 'public_fact' : 'public_summary',
      trusted: false,
      autoCommitEligible: false,
      intervalMinutes: 720,
    }];
  }

  const configured = loadKnowledgeSources();
  const sources = configured.length > 0 ? configured : makeFallbackKnowledgeSources();
  const limit = autoRun
    ? (config.knowledge_auto_batch_max_sources || 4)
    : (config.knowledge_expansion_batch_max_sources || config.knowledge_manual_batch_max_sources || 12);
  return autoRun
    ? filterDueKnowledgeSources(sources, limit)
    : sources.slice(0, limit);
}

export function summarizeRefreshResult(
  batchId: string,
  searched: number,
  candidates: number,
  committed: number,
  pending: KnowledgeCandidate[],
  failed: string[],
  auditIssues: number,
  autoRun: boolean,
): string {
  return [
    autoRun ? '知识库自动刷新完成' : '知识库刷新完成',
    `批次: ${batchId}`,
    `搜索源: ${searched}`,
    `候选: ${candidates}`,
    `自动写入: ${committed}`,
    `待确认: ${pending.length}`,
    `失败: ${failed.length}`,
    `审计问题: ${auditIssues}`,
    ...pending.slice(0, 5).map((item) => `候选 ${item.id}: ${item.title} (${item.risk}/${item.confidence}) 质量闸${describeKnowledgeCandidateQuality(item)}；${formatKnowledgeCandidateAdvice(item, 120)}`),
    ...failed.slice(0, 3).map((item) => `失败: ${item}`),
  ].join('\n');
}

export async function runKnowledgeRefresh(
  config: AIConfig,
  queryOverride: string = '',
  autoRun: boolean = false,
  aggressiveOverride: boolean = false,
): Promise<string> {
  if (config.knowledge_update_mode === 'static') {
    return '知识库现在是 static 模式，只查不写候选。';
  }
  if (autoRun && (config.knowledge_auto_update === false || !isKnowledgeAutoEnabled())) {
    return '知识库自动更新当前关闭。';
  }

  const sources = chooseRefreshSources(config, queryOverride, autoRun);
  if (sources.length === 0) {
    markKnowledgeAutoRefresh();
    const audit = auditKnowledge();
    return [
      autoRun ? '知识库自动刷新跳过' : '知识库刷新跳过',
      '原因: 没有到期来源',
      `审计问题: ${audit.issues.length}`,
    ].join('\n');
  }

  const timeoutMs = config.knowledge_source_timeout_ms || config.search_timeout_ms || 1800;
  const cacheSeconds = config.search_cache_seconds ?? 300;
  const aggressive = aggressiveOverride || config.knowledge_aggressive_auto_commit !== false;
  const batchId = `${autoRun ? 'auto' : 'manual'}_${Date.now().toString(36)}`;
  const pending: KnowledgeCandidate[] = [];
  const failed: string[] = [];
  let searched = 0;
  let candidates = 0;
  let committed = 0;

  for (const source of sources) {
    try {
      searched++;
      const result = await webSearch(source.query, timeoutMs, cacheSeconds, config.search_negative_cache_seconds ?? 60);
      if (!result) {
        failed.push(`${source.id}: 无搜索结果`);
        continue;
      }

      const expansionEnabled = config.knowledge_expansion_enabled !== false;
      const sourceTypeWritable = source.sourceType === 'public_fact' || source.sourceType === 'public_summary' || source.sourceType === 'style_template';
      const trustedSummaryEligible = aggressive && source.trusted && source.sourceType === 'public_summary';
      const manualAggressiveEligible = aggressiveOverride && sourceTypeWritable;
      const autoCommitEligible = Boolean(
        expansionEnabled &&
        config.knowledge_auto_commit_public_facts !== false &&
        (
          (source.autoCommitEligible && source.sourceType === 'public_fact') ||
          (source.autoCommitEligible && trustedSummaryEligible) ||
          manualAggressiveEligible
        ),
      );
      const sourceHint = knowledgeSourceEvidenceHint(source.id);
      const candidate = previewKnowledgeCandidate(source.query, result, `refresh:${source.id}${sourceHint ? ` ${sourceHint}` : ''}`, {
        sourceType: source.sourceType,
        confidence: source.trusted ? 'high' : 'medium',
        autoCommitEligible,
        risk: 'review',
      });
      candidates++;

      const wasEligible = candidate.autoCommitEligible;
      const action = autoCommitKnowledgeCandidate(candidate, {
        batchId,
        maxBlockChars: config.knowledge_auto_max_block_chars || 1200,
      });
      if (action === 'committed') {
        committed++;
      } else if (candidate.status === 'dropped' && wasEligible) {
        // 重复内容已被去重丢弃，不算待确认。
      } else {
        pending.push(candidate);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failed.push(`${source.id}: ${message.slice(0, 80)}`);
    } finally {
      if (autoRun) markKnowledgeSourceRefreshed(source.id);
    }
  }

  markKnowledgeAutoRefresh();
  const audit = auditKnowledge();
  return summarizeRefreshResult(batchId, searched, candidates, committed, pending, failed, audit.issues.length, autoRun);
}
