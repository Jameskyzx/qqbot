import type { ChatMessage } from './llm-api';
import { normalizePassiveText } from './voice-intent';
import {
  hasRealityBoundaryClaim,
  hasUnsupportedOriginalQuoteClaim,
  hasUnsupportedRumorClaim,
} from './reply-postprocess';

export interface ReplyQualityJobSnapshot {
  rawText: string;
  effectiveText: string;
  hasImages: boolean;
  hasRecords: boolean;
  forceVoice: boolean;
  isAtBot: boolean;
}

export interface ReplyQualityCheck {
  ok: boolean;
  issues: string[];
}

const QUALITY_STOP_TOKENS = new Set([
  '这个', '这条', '这句', '这种', '一下', '一个', '一点', '感觉', '真的', '确实',
  '可以', '不是', '哥们', '兄弟', '你这', '怎么', '什么', '今天', '现在', '回复',
  '模板', '风格', '有点', '东西', '说法', '别急', '看看', '评价', '锐评',
]);

function meaningfulQualityTokens(text: string): string[] {
  const compact = normalizePassiveText(text || '').toLowerCase();
  const tokens = compact.match(/[\u4e00-\u9fa5]{2,8}|[a-z0-9][a-z0-9_.-]{1,15}/g) || [];
  return [...new Set(tokens
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !QUALITY_STOP_TOKENS.has(token))
    .filter((token) => !/^(?:哈哈|啊啊|嗯嗯|哦哦|草草|666|233)$/.test(token))
  )].slice(0, 18);
}

function hasReplySpecificAnchor(text: string, job: ReplyQualityJobSnapshot): boolean {
  const reply = normalizePassiveText(text || '').toLowerCase();
  if (!reply) return false;
  const inputTokens = meaningfulQualityTokens([job.effectiveText, job.rawText].filter(Boolean).join('\n'));
  if (inputTokens.some((token) => reply.includes(token))) return true;
  const inputText = normalizePassiveText([job.effectiveText, job.rawText].filter(Boolean).join('\n'));
  if (/(?:这把|这局|这回合)/.test(reply) && /(?:这把|这局|这回合)/.test(inputText)) return true;
  if (/(?:打稳|稳一点|别急着拉|别急着补枪|先等|别急着出)/.test(text) && /(?:打稳|稳一点|怎么打|怎么处理|怎么拉|怎么补)/.test(inputText)) return true;
  if (job.hasImages && /(?:图|图片|画面|截图|照片|看[得不]?清|左边|右边|上面|下面|文字|界面|可见|像是)/.test(text)) return true;
  if (job.hasRecords && /(?:语音|听写|你说|刚那句|听到|没听清|补文字)/.test(text)) return true;
  if (/(?:经济|道具|补枪|timing|残局|回防|地图|枪线|首杀|默认|控图|转点|阵容|比分|排名|赛程|hltv|navi|g2|faze|spirit|vitality|donk|zywoo|niko|m0nesy|烟|闪|火|雷|包点|中路|香蕉道|警家|落点|对枪|枪位|架枪|反清|前压|断后)/i.test(text)) {
    return true;
  }
  if (isCsDiscussionHint([job.effectiveText, job.rawText].join('\n')) && /(?:经济|道具|补枪|timing|残局|回防|地图|枪线|首杀|默认|控图|转点|阵容|比分|排名|赛程|hltv|navi|g2|faze|spirit|vitality|donk|zywoo|niko|m0nesy)/i.test(text)) {
    return true;
  }
  return false;
}

function isCsDiscussionHint(text: string): boolean {
  return /(?:cs2?|csgo|hltv|navi|vitality|spirit|faze|mouz|g2|falcons|astralis|liquid|furia|heroic|mongolz|tyloo|lynn|cloud9|major|blast|iem|esl|选手|队伍|战队|职业哥|比赛|地图|枪|道具|烟|闪|火|雷|残局|回防|补枪|经济|比分|排名|阵容|转会|rating|adr|kast|donk|zywoo|niko|m0nesy|s1mple|ropz|sh1ro|device|karrigan|aleksib|b1t)/i.test(text);
}

function isGenericTemplateReply(text: string, job: ReplyQualityJobSnapshot): boolean {
  const compact = normalizePassiveText(text || '');
  if (compact.length < 8 || compact.length > 120) return false;
  if (hasReplySpecificAnchor(text, job)) return false;
  const genericMatches = compact.match(/(?:这波|有说法|有点东西|先别急|等一下|稳住|看情况|不好说|难说|还行|可以的|确实|怎么说|我只能说|离谱|抽象|别急|问题不大|先看|再说)/g) || [];
  if (genericMatches.length >= 2) return true;
  if (genericMatches.length >= 1 && compact.length <= 42 && /(?:这波|这个|这种|感觉|有点|还行|可以|难说|不好说|先看|稳住|别急)/.test(compact)) return true;
  return false;
}

export function shouldBypassAtMentionFactFallback(job: Pick<ReplyQualityJobSnapshot, 'isAtBot'>): boolean {
  return job.isAtBot === true;
}

export function assessReplyQuality(
  text: string,
  job: ReplyQualityJobSnapshot,
  hasRealtimeData: boolean,
): ReplyQualityCheck {
  const issues: string[] = [];
  const compact = text.replace(/\s+/g, '');
  if (!compact) {
    issues.push('empty');
    return { ok: false, issues };
  }

  const sourceLeak = /(?:根据|结合|参考).{0,12}(?:知识库|临场笔记|临场素材|语态素材|话题素材|实时事实参考|实时参考)|(?:知识库|临场笔记|语态素材|话题素材|实时事实参考|实时参考)(?:里)?(?:显示|提到|说|给到)|作为(?:AI|机器人|bot|群bot|助手)|玩机器风格回复|模板回复|拟态/i;
  if (sourceLeak.test(text)) issues.push('source/template leak');
  const stageLabelLeak = /(?:^|\n)\s*[(（【\[]?\s*(?:直播口吻(?:接弹幕)?|玩机器(?:风格|口吻)?|6657(?:风格|口吻)?|Machine(?:风格|口吻)?|拟态|风格参考|接弹幕|真人感|群聊回复|QQ?群回复|bot回复|机器人回复|第一人称(?:拟态)?|场景|执行|边界|信号)\s*[)）】\]]?\s*[：:，,、-]/i;
  if (stageLabelLeak.test(text)) issues.push('stage/prompt label leak');
  const assistantCliche = /^(?:当然(?:可以)?|好的|好嘞|没问题|收到|明白(?:了)?)[，,。!！\s]*(?:我来|下面|以下|这边|为你|帮你)|^(?:下面|以下)(?:是|给你|我来|整理|列出)|希望(?:这|以上)?(?:些)?(?:内容|回答)?(?:能|可以)?(?:帮到你|对你有帮助)|如果你(?:还)?(?:需要|想要|有其他问题)|欢迎(?:继续)?(?:提问|追问|交流)|作为(?:一个)?(?:AI|人工智能|语言模型|机器人|bot|助手)|我(?:是|只是)?(?:一个)?(?:AI|人工智能|语言模型|机器人|bot|助手)/i;
  if (assistantCliche.test(text)) issues.push('assistant-cliche');
  const evidenceLeak = /(?:^|\n)\s*(?:缓存|cache)\s*[:：].*(?:fresh|stale|miss|age=|ttl=|expired=|source=|fetch=|hit=)|(?:age|ttl|expired|fetch|hit|source)=\S+|\[\/?(?:实时事实参考|HLTV实时数据|联网补充)\]/i;
  if (evidenceLeak.test(text)) issues.push('realtime evidence metadata leak');
  if (hasRealityBoundaryClaim(text)) issues.push('identity impersonation claim');
  if (hasUnsupportedOriginalQuoteClaim(text)) issues.push('unsupported original quote claim');

  const reportLike = /^(?:结论|原因|建议|分析|总结|答案|短评|评价|判断|我的判断|先说结论)[：:]/.test(text.trim());
  if (reportLike) issues.push('report-like heading');
  const markdownScaffold = /(?:^|\n)\s*#{1,6}\s+\S|(?:^|\n)\s*>|```|\*\*[^*\n]{1,80}\*\*/.test(text);
  if (markdownScaffold) issues.push('markdown/scaffold style');

  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (
    lines.length >= 3
    && lines.slice(0, 4).filter((line) => /^(?:[-*]|\d+[.、]|[一二三四五六七八九十][、.])/.test(line)).length >= 2
    && text.length > 90
  ) {
    issues.push('list-like assistant style');
  }

  const formulaicOpeners = compact.match(/(?:不是哥们|哥们|兄弟们|家人们|有一说一|讲道理|说实话|这波有说法|有点东西|先说结论|我只能说)/g) || [];
  if (formulaicOpeners.length >= 3) issues.push('overused catchphrases');
  if (
    compact.length <= 24
    && /^(?:这波有说法|有点东西|可以的|不是哥们|哥们|兄弟们|有一说一|讲道理|我只能说)[。.!！?？]*$/.test(compact)
  ) {
    issues.push('low-information catchphrase');
  }
  if (isGenericTemplateReply(text, job)) {
    issues.push('generic-template reply');
  }

  const multimodalEmptyReaction = (
    (job.hasImages || job.hasRecords)
    && compact.length <= 40
    && /^(?:看到了|收到|图收到了|语音收到了|这波有说法|有点东西|可以的|我看了一眼|听到了)[。.!！?？]*$/.test(compact)
  );
  if (multimodalEmptyReaction) issues.push('unsupported empty multimodal reaction');

  if (text.length > 320 && !job.forceVoice) issues.push('too long');
  if (job.forceVoice && text.length > 180) issues.push('too long for voice');

  const hasCurrentQualifier = /(?:现在|目前|当前|今天|今日|最新|刚刚|昨天|前天|上周|本周|这个月|最近)/.test(text);
  const hasConcreteRealtimeClaim =
    /\b(?:navi|vitality|spirit|faze|mouz|g2|falcons|astralis|liquid|furia|heroic|mongolz|tyloo|lynn|cloud9|zywoo|donk|niko|m0nesy|s1mple|ropz|sh1ro|device|karrigan|aleksib|jl|b1t)\b.{0,24}(?:排名|排行|第一|top\s*\d|阵容|转会|加入|离队|替补|首发|比分|赛果|战绩|rating|ADR|KAST|赢了|输了|战胜|淘汰)/i.test(text)
    || /(?:排名|排行|阵容|转会|比分|赛果|战绩|rating|ADR|KAST).{0,18}(?:第一|第[一二三四五六七八九十\d]+|top\s*\d|\d{1,2}\s*[:：-]\s*\d{1,2}|赢了|输了|战胜|淘汰)/i.test(text);
  const alreadyConservative = /(?:我得查|得查最新|印象里|不一定对|不太确定|具体我得|你查最新|以最新为准|不能保证|别让我硬编|没实时来源|没查到准信)/.test(text);
  const hasFreshLookupClaim = /我(?:刚刚?|刚才|才|已经)?(?:查|搜)(?:了|到)?(?:一下|一眼|了下|下)?/i.test(text);
  const hasFalseRealtimeSourceClaim =
    /我(?:刚刚?|刚才|才|已经)?(?:查|搜|看|翻)(?:了|到)?(?:一下|一眼|了下|下)?\s*(?:HLTV|hltv|实时(?:数据|资料)?|最新(?:数据|资料|排名|消息)?|资料|数据|榜单|网页|官网|赛程|排名)/i.test(text)
    || /(?:HLTV|hltv|实时(?:数据|资料|榜单)?|最新(?:数据|资料|排名|消息)?)(?:显示|说|写着|给到|查到|来看|上看)/i.test(text)
    || ((hasFreshLookupClaim || /(?:资料|数据|搜索结果|网页|官网|榜单)(?:显示|说|写着|给到|查到|来看|上看)/i.test(text)) && (hasCurrentQualifier || hasConcreteRealtimeClaim));
  const bypassAtMentionFactFallback = shouldBypassAtMentionFactFallback(job);
  if (!bypassAtMentionFactFallback && !hasRealtimeData && hasFalseRealtimeSourceClaim) {
    issues.push('false realtime source claim');
  }
  if (!bypassAtMentionFactFallback && hasUnsupportedRumorClaim(text, hasRealtimeData)) {
    issues.push('unsupported rumor source claim');
  }
  if (!bypassAtMentionFactFallback && !hasRealtimeData && hasCurrentQualifier && hasConcreteRealtimeClaim && !alreadyConservative) {
    issues.push('unverified realtime claim');
  }

  return { ok: issues.length === 0, issues };
}

export function buildReplyQualityRepairMessages(
  messages: ChatMessage[],
  badReply: string,
  quality: ReplyQualityCheck,
  job: ReplyQualityJobSnapshot,
  hasRealtimeData: boolean,
): ChatMessage[] {
  const bypassAtMentionFactFallback = shouldBypassAtMentionFactFallback(job);
  const instructions = [
    '这条回复发出前自检没过，重写一版。',
    `问题: ${quality.issues.join(' / ')}`,
    '要求：像QQ群里真人顺手接一句，短一点，别列提纲，别解释你在模仿谁。',
    '必须接住当前消息里的一个具体点：人名、队伍、操作、道具、图片可见内容、语音听写内容，至少选一个说准。',
    '如果是图片/语音，只能说实际看进模型或听写出来的内容；没进模型/没听写就明确收住。',
    '不要只把“这波有说法/有点东西/先别急/稳住/看情况”换个顺序再发。',
    '禁止说“根据知识库/临场笔记/实时事实参考/作为AI/模板/拟态/场景/执行/边界”。',
    '也禁止客服腔：“当然可以/下面是/以下是/我来为你/希望能帮到你/如果你需要”这类都别用。',
    '不要声称任何拟态句是玩机器本人原话、真实语录、经典语录或逐字复刻；只能说成场景口吻。',
    bypassAtMentionFactFallback ? '' : '没有实时资料时，禁止说“我刚查了/HLTV显示/实时数据说/资料显示”，不能假装刚联网。',
    bypassAtMentionFactFallback ? '' : '没有可靠来源时，也禁止用“听说/朋友说/群里都说/爆料说”给传闻背书。',
    '不要把“缓存/source/ttl/age/fetch/fresh/stale”这类证据元数据发给群友，只把它转成一句自然的不确定边界。',
    bypassAtMentionFactFallback
      ? '这条是明确@你：直接给判断，别用“没实时来源/以最新为准/得查最新/不能拍死/没可靠来源”当保底回复。'
      : hasRealtimeData
        ? '如果用到了实时资料，只能说资料里明确出现的事实。'
        : '没有实时资料支撑时，别报最新排名/比分/阵容/转会；需要就说“这点我得查最新的”。',
    job.forceVoice ? '这条要适合念出来，控制在一两句。' : '',
    '只输出重写后的QQ消息，不要加标题。',
  ].filter(Boolean);
  return [
    ...messages,
    { role: 'assistant', content: badReply },
    { role: 'user', content: instructions.join('\n') },
  ];
}
