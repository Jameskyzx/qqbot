import type { AIConfig } from '../types';
import { detectCsTopicQuery } from './fuzzy-command';
import { isKnowledgeTopic } from './knowledge-base';
import { isExplicitVoiceReplyRequest, normalizePassiveText } from './voice-intent';

export const DIRECT_AI_COMMANDS = new Set(['ai', 'ask', 'chat', 'talk', '问', '聊', '对话']);
export const DIRECT_SEARCH_COMMANDS = new Set(['search', '搜', '搜索']);
export const DIRECT_VISION_COMMANDS = new Set(['vision', 'image', 'img', '识图']);
export const DIRECT_MEDIA_COMMANDS = new Set(['media', 'multimodal', 'multi', '多模态', '媒体']);

const DEFAULT_SEARCH_PATTERN = /最新|最近|现在|今天|谁赢|比分|赛程|更新|版本|发布|新闻|热搜|多少钱|价格|天气/;

export function includesAnyKeyword(text: string, keywords: string[] = []): boolean {
  if (!text || keywords.length === 0) return false;
  const lowerText = text.toLowerCase();
  return keywords.some((keyword) => keyword && lowerText.includes(keyword.toLowerCase()));
}

export function extractCsMatchDetailId(text: string): string {
  const raw = text || '';
  const hasIntent = /(?:match\s*id|matchid|比赛id|赛果id|这场|那场|单场|详情|统计|数据|rating|adr|kast|谁c|谁C|谁杀|谁猛|谁发挥|地图比分|几比几|比分|赛后|战报|复盘|锐评)/i.test(raw);
  if (!hasIntent) return '';
  const explicit = raw.match(/(?:match\s*id|matchid|比赛id|赛果id)\s*[=：:\s#-]*(\d{4,})/i);
  if (explicit?.[1]) return explicit[1];
  const loose = raw.match(/(?:^|[^\d])(\d{6,})(?:[^\d]|$)/);
  return loose?.[1] || '';
}

export function isLowInformationPassiveText(text: string, config: AIConfig): boolean {
  const normalized = normalizePassiveText(text);
  if (!normalized) return true;
  const minChars = Math.max(1, config.passive_random_min_chars || 4);
  if (normalized.length < minChars) return true;
  if (config.passive_random_allow_numeric !== true && /^[\d.。,\s，、]+$/.test(normalized)) return true;
  if (/^[哈啊嗯哦额呃草艹wW6]+$/.test(normalized) && normalized.length <= 6) return true;
  if (/^[^\u4e00-\u9fa5A-Za-z0-9]+$/.test(normalized)) return true;
  return false;
}

export function isCsDiscussionHint(text: string): boolean {
  const normalized = normalizePassiveText(text).toLowerCase();
  if (normalized.length < 4) return false;
  const hard = [
    'cs', 'cs2', 'csgo', 'major', 'blast', 'iem', 'esl', 'hltv',
    'navi', 'g2', 'faze', 'vitality', 'spirit', 'mouz', 'falcons', 'astralis',
    'niko', 'monesy', 'm0nesy', 'zywoo', 's1mple', 'donk', 'ropz', 'device',
  ];
  if (hard.some((item) => normalized.includes(item))) return true;
  const soft = [
    '这把', '这局', '回合', '残局', '手枪局', '长枪局', '强起', '半起', 'eco',
    '经济', '道具', '补枪', '默认', '控图', '转点', '回防', '保枪', '下包',
    '拆包', '钳子', 'timing', '首杀', '突破', '架枪', '狙', '步枪', '地图池',
    '香蕉道', '中路', '外场', '包点', 'a大', 'b点', 'ct', 't方',
    'mirage', 'inferno', 'nuke', 'ancient', 'anubis', 'dust2', 'overpass', 'train',
  ];
  let hits = 0;
  for (const item of soft) {
    if (normalized.includes(item.toLowerCase())) hits++;
    if (hits >= 1 && /(?:怎么打|打成|能赢|赢不了|输了|翻了|白给|犯病|抽象|残局|回防|经济|道具|补枪)/.test(normalized)) {
      return true;
    }
    if (hits >= 2) return true;
  }
  return false;
}

export function isDirectChatCue(text: string): boolean {
  const normalized = normalizePassiveText(text).toLowerCase();
  if (!normalized || normalized.length > 80) return false;
  const names = ['玩机器', '机器', 'machinewjq', 'machine', '6657'];
  const hasName = names.some((name) => normalized.includes(name.toLowerCase()));
  const cuePattern = /(?:在吗|在不在|你在|出来|说句话|聊聊|你怎么看|怎么看|咋看|怎么说|评价|锐评|帮我|帮忙|想想|看看|能不能|可以不|懂不懂|你好|hello|hi|哥们)/i;
  if (hasName) return true;
  if (normalized.length <= 12 && /^(?:你好|hi|hello|在吗|在不在|出来|说句话|聊聊)$/.test(normalized)) return true;
  if (/^(?:你怎么看|怎么看|咋看|怎么说|帮我|帮忙|想想|看看|评价|锐评)/.test(normalized)) return true;
  return cuePattern.test(normalized) && /(你|bot|机器人|ai|机器|玩机器|6657)/i.test(normalized);
}

export function isStableCsTacticalQuery(text: string): boolean {
  const normalized = normalizePassiveText(text).toLowerCase();
  if (!normalized || normalized.length < 4) return false;
  if (!isCsDiscussionHint(normalized)) return false;
  if (/(?:最新|现在|当前|目前|今天|今日|今晚|最近|刚刚|昨天|上周|本周|这个月|今年|赛程|赛果|比分|排名|排行|阵容|转会|加入|离队|战绩|状态|表现|数据|rating|adr|kast|hltv|vrs|matchid|谁赢|哪场|哪队|哪个队|什么时候|几点|几号)/i.test(normalized)) {
    return false;
  }
  return /(?:残局|clutch|1v\d|一打|回防|拆包|下包|守包|补枪|道具|烟|闪|火|雷|utility|封烟|白闪|经济|eco|强起|半起|保枪|白给|默认|控图|转点|timing|架枪|突破|怎么打|怎么处理|打稳|稳一点|优势|被翻|开香槟|翻盘)/i.test(normalized);
}

export function isPassiveCsRealtimeQuestion(text: string): boolean {
  const normalized = normalizePassiveText(text).toLowerCase();
  if (!normalized) return false;
  if (extractCsMatchDetailId(normalized)) return true;
  if (!isCsDiscussionHint(normalized)) return false;
  if (isStableCsTacticalQuery(normalized)) return false;
  const topic = detectCsTopicQuery(normalized);
  if (topic.needsMatches || topic.needsRanking || topic.needsResults) return true;
  const hasRealtimeWords = /(?:最新|现在|当前|目前|今天|今日|今晚|最近|近期|刚刚|刚才|昨天|本周|这周|这个月|状态|表现|怎么样|怎样|如何|数据|stats?|rating|adr|kast|排名|排行|阵容|roster|转会|战绩|比分|赛果|谁赢|哪场|什么时候|几点|几号)/i.test(normalized);
  const hasCsEntity = /\b(?:zywoo|donk|niko|m0nesy|monesy|s1mple|ropz|sh1ro|magixx|jl|b1t|hunter|aleksib|karrigan|device|broky|frozen|apex|mezii|flamez|jimpphat|siuhy|kscerato|yuurih|cadian|navi|vitality|spirit|faze|mouz|g2|falcons|astralis|liquid|furia|heroic|mongolz|tyloo|lynn|cloud9)\b/i.test(normalized);
  return hasRealtimeWords && hasCsEntity;
}

export function shouldSearch(config: AIConfig, text: string): boolean {
  if (!config.enable_search || text.length <= 3) return false;

  const factualQueryPattern = /(?:现在|今天|最近|最新|当前|目前|今年|今晚|昨天|前天|上周|这周|本月|去年|刚才)[^。？\s]{0,15}(?:谁|哪|什么|怎么样|多少|几|有没有|是不是)|(?:谁|哪个|什么时候|多少|几比几|哪场|哪场|什么队|什么队伍|什么人)|(?:发生|爆发|开打|开赛|公布|更新|发布|确认|官宣|宣布)/;
  if (factualQueryPattern.test(text)) return true;
  if (isStableCsTacticalQuery(text)) return false;
  const explicitSearchIntent = /(?:查一下|搜一下|搜索|联网|资料|最新|最近|现在|今天|当前|目前|今晚|昨天|谁赢|比分|赛程|赛果|战报|排名|排行|阵容|转会|官宣|确认)/i.test(text);
  if (isCsDiscussionHint(text) && !explicitSearchIntent) return false;

  if (config.search_keywords && config.search_keywords.length > 0) {
    if (includesAnyKeyword(text, config.search_keywords)) return true;
  }
  if (config.search_on_style_query && isKnowledgeTopic(text)) return true;
  if (DEFAULT_SEARCH_PATTERN.test(text)) return true;

  return false;
}

export function shouldReply(
  config: AIConfig,
  text: string,
  command: string | null,
  atBot: boolean,
  replyToBot: boolean,
  isPrivate: boolean = false,
  groupChatBusy: boolean = false,
  selfRecentlyReplied: boolean = false,
): { reply: boolean; forced: boolean } {
  const directCommand = !!command && DIRECT_AI_COMMANDS.has(command);
  if (directCommand || atBot || replyToBot || isPrivate || isExplicitVoiceReplyRequest(text, command)) {
    return { reply: true, forced: true };
  }
  if (command) {
    return { reply: false, forced: false };
  }
  if (isPassiveCsRealtimeQuestion(text)) {
    return { reply: false, forced: false };
  }

  const selfCoolMultiplier = selfRecentlyReplied ? 0.5 : 1.0;
  const busyMultiplier = groupChatBusy ? 0.35 : 1.0;

  const styleKeywordHit = includesAnyKeyword(text, [
    config.active_preset,
    '玩机器',
    '机器',
    'MachineWJQ',
    'Machine',
    '6657',
  ]);
  const directChatCue = isDirectChatCue(text);
  if (directChatCue) {
    return { reply: true, forced: false };
  }
  if (styleKeywordHit) {
    const styleMentionNeedsReply = /(?:你怎么看|怎么看|咋看|怎么说|评价|锐评|在吗|出来|说句话|问你|帮我|可以不|能不能|是不是|谁|什么|吗|？|\?)/i.test(text);
    const probability = styleMentionNeedsReply
      ? 0.95
      : Math.max(config.related_reply_probability ?? 0.65, config.trigger_probability || 0) * selfCoolMultiplier * busyMultiplier;
    return { reply: Math.random() < probability, forced: false };
  }

  const keywordHit = includesAnyKeyword(text, config.trigger_keywords);
  if (keywordHit || isKnowledgeTopic(text)) {
    return { reply: Math.random() < (config.related_reply_probability ?? 0.65) * selfCoolMultiplier * busyMultiplier, forced: false };
  }

  switch (config.trigger_mode) {
    case 'all':
      return { reply: !isLowInformationPassiveText(text, config), forced: false };
    case 'smart': {
      if (isLowInformationPassiveText(text, config)) {
        return { reply: false, forced: false };
      }
      return { reply: Math.random() < (config.trigger_probability || 0) * selfCoolMultiplier * busyMultiplier, forced: false };
    }
    case 'at':
    case 'command':
    default:
      return { reply: false, forced: false };
  }
}
