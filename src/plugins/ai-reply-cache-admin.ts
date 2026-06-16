import type { AIConfig } from '../types';
import { detectCsTopicQuery } from './fuzzy-command';
import {
  isStableCsTacticalQuery,
  shouldSearch,
} from './ai-trigger-policy';
import {
  buildReplyCachePolicy,
  buildStyleSceneDecision,
} from './ai-style-scene';
import {
  getReplyCachePoolSnapshot,
  inspectReplyCacheKey,
  makeReplyCacheKey,
  normalizeCacheText,
  pruneExpiredReplyCache,
} from './ai-reply-cache-runtime';
import {
  formatReplyCachePoolStatusPanel,
  formatReplyCachePreflightPanel,
  type ReplyCachePreflightPanelItem,
} from './ai-reply-cache-diagnostics';
import { buildKnowledgeRoutePreview } from './ai-knowledge-route-runtime';

function buildReplyCachePreflightItem(config: AIConfig, input: string): ReplyCachePreflightPanelItem {
  const clean = (input || '').trim();
  const normalized = normalizeCacheText(clean);
  const job = {
    rawText: clean || '缓存预检',
    effectiveText: clean || '缓存预检',
    hasImages: false,
    hasRecords: false,
    forced: false,
  };
  const csTopic = detectCsTopicQuery(clean);
  const realtimeIntent = csTopic.needsMatches || csTopic.needsRanking || csTopic.needsResults;
  const searchWouldRun = shouldSearch(config, clean);
  const stableTactical = isStableCsTacticalQuery(clean);
  const styleScene = buildStyleSceneDecision(job, '', realtimeIntent, false);
  const timeSensitive = /(?:今天|今日|现在|当前|此刻|此时|目前|今晚|今早|今夜|刚才|几号|几点|几月|星期|周[一二三四五六日天])/.test(clean);
  const knowledgeRoute = config.enable_knowledge !== false
    ? buildKnowledgeRoutePreview(config, clean, { triggerReason: 'cache-check' })
    : null;
  const policy = buildReplyCachePolicy(config, job, styleScene, searchWouldRun ? '[dry-run-search]' : '', timeSensitive, false);
  const key = policy.enabled
    ? makeReplyCacheKey(config, clean, knowledgeRoute?.signature || '', policy.scope)
    : '';
  const keyState = inspectReplyCacheKey(key).keyState;
  const advice: string[] = [];
  if (policy.enabled) {
    advice.push(`这类普通主动接话可复用 ${policy.ttlSeconds}s；实际 @/回复/私聊/命令仍会按 forced 旁路`);
  } else if (policy.reason === 'realtime') {
    advice.push(searchWouldRun
      ? '这条预计会走联网/实时增强，所以不缓存；事实类问题这是正确行为'
      : '风格场景需要实时边界，不能复用旧回答');
  } else if (policy.reason === 'time-sensitive') {
    advice.push('包含时间敏感词，答案会随时间变化，不缓存');
  } else if (policy.reason.startsWith('scene:')) {
    advice.push('高上下文/身份/礼物/纠偏等场景不缓存，避免复读或冒充风险');
  } else if (policy.reason === 'disabled') {
    advice.push('ai_reply_cache_seconds <= 0，回复缓存关闭');
  } else {
    advice.push(`当前策略旁路: ${policy.reason}`);
  }
  if (stableTactical) {
    advice.push('已识别为稳定 CS 战术讨论，不触发联网搜索，适合短 TTL 缓存');
  } else if (searchWouldRun) {
    advice.push('如果这其实只是打法常识，减少“最新/现在/排名/比分”等实时词可提高缓存命中');
  }
  if (normalized && normalized !== clean.toLowerCase()) {
    advice.push('已归一化开头称呼、全角/半角或重复标点，低风险自然变体更容易命中同 key');
  }
  if (knowledgeRoute && knowledgeRoute.titles.length === 0 && config.knowledge_force_style !== false) {
    advice.push('知识分区无命中时仍会尝试语态素材；可用 /kb route 看详细召回');
  }

  return {
    input: clean,
    normalized,
    scene: styleScene,
    policy,
    key,
    keyState,
    searchWouldRun,
    stableTactical,
    timeSensitive,
    knowledgeTitles: knowledgeRoute?.titles || [],
    knowledgeSignature: knowledgeRoute?.signature || '',
    advice: [...new Set(advice)].slice(0, 5),
  };
}

export function formatReplyCachePreflight(config: AIConfig, input: string): string {
  const clean = (input || '').trim();
  const parts = clean
    .split(/\s+\|\|\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);
  const items = (parts.length > 0 ? parts : [clean]).map((part) => buildReplyCachePreflightItem(config, part));
  return formatReplyCachePreflightPanel(clean, items);
}

export function formatReplyCachePoolStatus(config: AIConfig): string {
  const configuredTtl = Math.max(0, Math.floor(config.ai_reply_cache_seconds ?? 0));
  return formatReplyCachePoolStatusPanel(getReplyCachePoolSnapshot(configuredTtl, 8));
}

export function pruneExpiredReplyCacheForMaintenance(now: number = Date.now()): {
  before: number;
  fresh: number;
  expired: number;
  removed: number;
  after: number;
  inFlight: number;
} {
  return pruneExpiredReplyCache(now);
}
