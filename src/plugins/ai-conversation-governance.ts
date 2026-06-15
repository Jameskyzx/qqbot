import type { AIConfig } from '../types';
import { detectCsTopicQuery } from './fuzzy-command';
import { normalizePassiveText } from './voice-intent';
import type { FocusedHistoryJob } from './ai-memory-utils';

export interface MemoryLayerBudget {
  shortTermMessages: number;
  longTermTopK: number;
  longTermChars: number;
  profileChars: number;
  factChars: number;
  compressionHint: string;
}

export interface ConversationGovernanceDecision {
  mode: 'answer' | 'counter_question' | 'brief_react' | 'quiet' | 'fact_check' | 'multimodal_ground';
  tone: 'warm' | 'sharp' | 'calm' | 'curious';
  maxSentences: number;
  shouldAskClarifyingQuestion: boolean;
  shouldStayQuiet: boolean;
  memory: MemoryLayerBudget;
  hints: string[];
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

function questionLike(text: string): boolean {
  return /(?:\?|？|吗|么|啥|什么|怎么|咋|为何|为什么|能不能|可不可以|有没有|是不是|哪|谁|几|多少)/.test(text);
}

function ambiguousShortQuestion(text: string): boolean {
  const clean = normalizePassiveText(text);
  if (!clean || clean.length > 18) return false;
  return questionLike(clean) && /^(?:这|这个|那个|他|她|它|他们|咋了|啥意思|怎么说|真的假的|能行吗|好打吗|稳吗)/.test(clean);
}

export function buildMemoryLayerBudget(config: AIConfig, job: FocusedHistoryJob): MemoryLayerBudget {
  const baseSend = clampInt(config.context_send_messages || 28, 4, 200);
  const mediaPenalty = job.hasImages || job.hasRecords ? 4 : 0;
  const layering = config.memory_layering_enabled !== false;
  const shortTermMessages = clampInt(baseSend - (layering ? mediaPenalty : 0), 8, 80);
  const longTermTopK = layering ? clampInt(config.memory_top_k ?? 5, 0, 12) : clampInt(config.memory_top_k ?? 5, 0, 8);
  const longTermChars = layering ? clampInt(config.memory_inject_max_chars ?? 900, 0, 3000) : clampInt(config.memory_inject_max_chars ?? 900, 0, 1200);
  const factChars = clampInt(config.knowledge_max_chars ?? 2600, 0, 6000);
  return {
    shortTermMessages,
    longTermTopK,
    longTermChars,
    profileChars: 420,
    factChars,
    compressionHint: !layering
      ? '记忆分层关闭，按旧策略注入历史，实时事实仍需证据兜底'
      : job.hasImages || job.hasRecords
      ? '媒体输入优先保留最近文本和真实转写，旧摘要只当背景'
      : '近期上下文优先，长期记忆只补偏好和稳定背景',
  };
}

export function buildConversationGovernanceDecision(
  config: AIConfig,
  job: FocusedHistoryJob & {
    forced: boolean;
    groupChatBusy?: boolean;
    hasCurrentRealtimeData?: boolean;
    recordTranscriptText?: string;
    searchUsed?: boolean;
    knowledgeTopic?: boolean;
  },
): ConversationGovernanceDecision {
  const text = normalizePassiveText(job.effectiveText || job.recordTranscriptText || '');
  const csTopic = detectCsTopicQuery(text);
  const hasRealtimeIntent = csTopic.needsMatches || csTopic.needsRanking || csTopic.needsResults
    || /(?:最新|现在|当前|目前|今天|今晚|刚才|刚刚|最近|比分|赛程|赛果|排名|阵容|转会|rating|adr|kast)/i.test(text);
  const memory = buildMemoryLayerBudget(config, job);
  const hints: string[] = [memory.compressionHint];

  let mode: ConversationGovernanceDecision['mode'] = 'answer';
  let tone: ConversationGovernanceDecision['tone'] = config.aggression_level === 'high' ? 'sharp' : 'warm';
  let maxSentences = job.forced ? 3 : 2;
  let shouldAskClarifyingQuestion = false;
  let shouldStayQuiet = false;

  if (job.hasImages || job.hasRecords) {
    mode = 'multimodal_ground';
    if (config.multimodal_grounding_strict !== false) {
      hints.push('先说真实可见/可听内容，再评价；没传给模型就承认链路没跑通');
    }
    maxSentences = Math.max(maxSentences, 3);
  }

  if (hasRealtimeIntent) {
    mode = 'fact_check';
    tone = 'calm';
    hints.push(config.fact_freshness_strict === false
      ? '事实问法保持谨慎，不要把旧缓存说成最新'
      : job.hasCurrentRealtimeData ? '已有当前证据，按fresh优先说' : '缺fresh证据时只给边界和补证路线');
    maxSentences = Math.max(maxSentences, 3);
  }

  if (config.conversation_clarify_ambiguous !== false && ambiguousShortQuestion(text) && !job.hasImages && !job.hasRecords) {
    mode = 'counter_question';
    tone = 'curious';
    shouldAskClarifyingQuestion = true;
    hints.push('短问句指代不清，优先反问一个关键点，别硬编上下文');
  }

  if (!job.forced && job.groupChatBusy && !job.knowledgeTopic && !hasRealtimeIntent) {
    mode = 'brief_react';
    maxSentences = clampInt(config.conversation_busy_max_sentences ?? 1, 1, 4);
    hints.push('群聊很快，普通插话保持一句短反应');
  }

  if (!job.forced && !text && !job.hasImages && !job.hasRecords) {
    mode = 'quiet';
    shouldStayQuiet = true;
    hints.push('无有效输入，普通消息不主动补戏');
  }

  return {
    mode,
    tone,
    maxSentences,
    shouldAskClarifyingQuestion,
    shouldStayQuiet,
    memory,
    hints: hints.slice(0, 5),
  };
}

export function formatConversationGovernancePrompt(decision: ConversationGovernanceDecision): string {
  return [
    `[回复策略] mode=${decision.mode} tone=${decision.tone} maxSentences=${decision.maxSentences}`,
    decision.shouldAskClarifyingQuestion ? '指代不清时先反问一个关键点，不要脑补。' : '',
    decision.shouldStayQuiet ? '普通低信息输入保持安静。' : '',
    `记忆分层: 短期${decision.memory.shortTermMessages}条 / 长期${decision.memory.longTermTopK}条${decision.memory.longTermChars}字 / 画像${decision.memory.profileChars}字 / 事实${decision.memory.factChars}字`,
    ...decision.hints.map((hint) => `- ${hint}`),
  ].filter(Boolean).join('\n');
}

export function formatConversationGovernanceTrace(decision: ConversationGovernanceDecision): string {
  return `${decision.mode}/${decision.tone}/s${decision.maxSentences}/mem${decision.memory.shortTermMessages}-${decision.memory.longTermTopK}-${decision.memory.longTermChars}`;
}
