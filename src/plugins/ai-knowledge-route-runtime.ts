import type { AIConfig } from '../types';
import {
  extractKnowledgeTitles,
  findKnowledgeFreshnessIssuesForTitles,
  getKnowledgeKeywords,
  isKnowledgeTopic,
  selectKnowledge,
  selectStyleKnowledge,
} from './knowledge-base';
import {
  buildKnowledgeFreshnessRuntimeBoundary,
  buildKnowledgeRouteDiagnostics,
  formatKnowledgeRoutePreviewPanel,
  selectTopicKnowledgeByLanes,
  type KnowledgeRoutePreview,
} from './ai-knowledge-route';
import { buildRuntimeKnowledgeInfo, type RuntimePromptJob } from './ai-prompt-builders';
import { makeStableKnowledgeSignature, normalizeCacheText } from './ai-reply-cache-runtime';

export interface KnowledgeRoutePreviewOptions {
  triggerReason?: string;
  hasImages?: boolean;
  hasRecords?: boolean;
  searchInfo?: string;
  recordTranscriptText?: string;
}

function makeKnowledgeRoutePreviewJob(
  queryText: string,
  options: KnowledgeRoutePreviewOptions,
): RuntimePromptJob {
  const hasImages = options.hasImages === true;
  const hasRecords = options.hasRecords === true;
  return {
    chatType: 'group',
    chatId: 0,
    groupId: 0,
    userId: 0,
    messageId: 0,
    senderName: 'knowledge-route',
    rawText: queryText,
    effectiveText: queryText,
    imageUrls: [],
    imageInputCount: hasImages ? 1 : 0,
    recordUrls: hasRecords ? ['record'] : [],
    hasImages,
    hasRecords,
    forceVoice: false,
    isAtBot: false,
    isReplyToBot: false,
    triggerReason: options.triggerReason || 'kb-route',
    contextMessages: [],
  };
}

export function buildKnowledgeRoutePreview(
  config: AIConfig,
  text: string,
  options: KnowledgeRoutePreviewOptions = {},
): KnowledgeRoutePreview {
  const rawQueryText = text || '';
  const queryText = normalizeCacheText(rawQueryText) || rawQueryText.trim();
  const recordTranscriptText = options.recordTranscriptText || '';
  const searchInfo = options.searchInfo || '';
  const searchableText = queryText || recordTranscriptText || '';
  const topicQuery = [
    queryText,
    recordTranscriptText,
    searchInfo,
    ...getKnowledgeKeywords().filter((keyword) => searchableText.toLowerCase().includes(keyword.toLowerCase())),
  ].join('\n');
  const styleQuery = [
    '直播语态 回复铁律 真人化 非公式化 口癖调度 反应强度 上下文定位',
    options.triggerReason || '',
    options.hasImages ? '识图 图片 场景' : '',
    options.hasRecords ? '语音 听写 场景' : '',
    queryText,
  ].filter(Boolean).join('\n');
  const hasKnowledgeTopic = isKnowledgeTopic(topicQuery);
  const budget = config.knowledge_max_chars || 1800;
  const styleBudget = Math.max(600, Math.floor(budget * (hasKnowledgeTopic ? 0.35 : 0.75)));
  const topicBudget = Math.max(600, budget - styleBudget);
  const styleKnowledge = config.knowledge_force_style === false
    ? selectKnowledge(styleQuery, styleBudget)
    : (selectKnowledge(styleQuery, styleBudget) || selectStyleKnowledge(styleBudget));
  const topicSelection = selectTopicKnowledgeByLanes(topicQuery, topicBudget, hasKnowledgeTopic);
  const topicKnowledge = topicSelection.topicKnowledge;
  const titles = [
    ...extractKnowledgeTitles(styleKnowledge, 4),
    ...extractKnowledgeTitles(topicKnowledge, 4),
  ].filter((title, index, all) => all.indexOf(title) === index).slice(0, 6);
  const freshnessIssues = findKnowledgeFreshnessIssuesForTitles(titles, 6);
  const freshnessBoundary = buildKnowledgeFreshnessRuntimeBoundary(freshnessIssues, queryText || topicQuery, hasKnowledgeTopic);
  const job = makeKnowledgeRoutePreviewJob(queryText || '知识路由预检', options);
  const knowledgeInfo = buildRuntimeKnowledgeInfo(styleKnowledge, topicKnowledge, job, hasKnowledgeTopic, budget, freshnessBoundary);
  const signature = makeStableKnowledgeSignature(styleKnowledge, topicKnowledge, titles);
  return {
    query: queryText,
    styleQuery,
    topicQuery,
    hasKnowledgeTopic,
    budget,
    styleBudget,
    topicBudget,
    styleKnowledge,
    topicKnowledge,
    knowledgeInfo,
    titles,
    lanes: topicSelection.lanes,
    signature,
    freshnessIssues,
    freshnessBoundary,
  };
}

export function formatKnowledgeRoutePreview(config: AIConfig, text: string): string {
  const clean = (text || '').trim();
  const route = buildKnowledgeRoutePreview(config, clean, { triggerReason: 'kb-route' });
  const diagnostic = buildKnowledgeRouteDiagnostics(config, route);
  return formatKnowledgeRoutePreviewPanel(clean, route, diagnostic);
}
