import type { AIConfig } from '../types';
import {
  extractKnowledgeTitles,
  selectKnowledge,
  type KnowledgeFreshnessIssue,
} from './knowledge-base';

export interface KnowledgeRoutePreview {
  query: string;
  styleQuery: string;
  topicQuery: string;
  hasKnowledgeTopic: boolean;
  budget: number;
  styleBudget: number;
  topicBudget: number;
  styleKnowledge: string;
  topicKnowledge: string;
  knowledgeInfo: string;
  titles: string[];
  lanes: KnowledgeRouteLane[];
  signature: string;
  freshnessIssues: KnowledgeFreshnessIssue[];
  freshnessBoundary: string;
}

export type KnowledgeRouteLaneKey = 'cs_fact' | 'gift' | 'quote' | 'scene' | 'person_team' | 'voice' | 'ops' | 'general';

export interface KnowledgeRouteLane {
  key: KnowledgeRouteLaneKey;
  label: string;
  query: string;
  budget: number;
  chars: number;
  titles: string[];
  hit: boolean;
}

const knowledgeRouteLaneSpecs: Record<KnowledgeRouteLaneKey, { label: string; trigger: RegExp; query: string }> = {
  cs_fact: {
    label: 'CS/事实',
    trigger: /(?:cs2|csgo|hltv|liquipedia|vrs|major|blast|iem|esl|比分|赛程|赛果|排名|阵容|转会|地图池|veto|rating|adr|kast|navi|g2|vitality|spirit|faze|mouz|falcons|astralis|liquid|mongolz|tyloo|lynn|donk|niko|zywoo|m0nesy|s1mple|ropz|sh1ro|device|aleksib|b1t)/i,
    query: 'CS2 比赛 选手 队伍 地图池 实时事实 来源边界 HLTV Liquipedia 排名 阵容 比分',
  },
  gift: {
    label: '礼物',
    trigger: /(?:礼物|送礼|谢礼|谢谢|感谢|老板|飞机|火箭|礼花|gift|老板大气)/i,
    query: '礼物感谢 拟态模板 老板大气 经济 道具 火力支援 不冒充真实礼物原话',
  },
  quote: {
    label: '语录/口癖',
    trigger: /(?:语录|口癖|短句|原话|名言|经典|玩机器.*(?:说|讲)|这句话|逐字|quote)/i,
    query: '短句锚点 口癖 经典短句 原话边界 不逐字冒充',
  },
  scene: {
    label: '场景/切片',
    trigger: /(?:场景|切片|直播|白给|保枪|开香槟|残局|道具|优势被翻|弹幕|嘴硬|模板|风格|像人|真人|公式)/i,
    query: '直播场景模板 切片长句摘要 反应结构 真人化 非公式化 弹幕接话',
  },
  person_team: {
    label: '人物/队伍',
    trigger: /(?:选手|队伍|职业哥|主播|玩机器|machine|6657|niko|donk|zywoo|m0nesy|s1mple|ropz|sh1ro|device|karrigan|aleksib|navi|vitality|spirit|faze|mouz|g2|falcons|astralis|liquid|heroic|furia)/i,
    query: '选手风格倾向 队伍风格倾向 人物背景 当前阵容状态以实时数据为准',
  },
  voice: {
    label: '语音',
    trigger: /(?:语音|念出来|读出来|tts|stt|声音|克隆|授权样本|voice|听写)/i,
    query: '语音 TTS STT 授权样本 声音克隆 语音缓存 真实语音边界',
  },
  ops: {
    label: '运维/命令',
    trigger: /(?:命令|配置|缓存|知识库|kb|trace|status|diag|vps|部署|更新|bot|机器人|qqbot|napcat|内存|队列)/i,
    query: '命令回复素材 配置 缓存 知识库 运维 诊断 trace status VPS 边界',
  },
  general: {
    label: '泛话题',
    trigger: /[\s\S]/,
    query: '玩机器 直播间 CS2 背景 话题素材 回复边界',
  },
};

export function detectKnowledgeRouteLaneKeys(text: string): KnowledgeRouteLaneKey[] {
  const haystack = text || '';
  const ordered: KnowledgeRouteLaneKey[] = ['cs_fact', 'gift', 'quote', 'scene', 'person_team', 'voice', 'ops'];
  const keys = ordered.filter((key) => knowledgeRouteLaneSpecs[key].trigger.test(haystack));
  if (keys.length === 0) keys.push('general');
  if (keys.length > 4) return keys.slice(0, 4);
  return keys;
}

function splitKnowledgeBlocks(markdown: string): Array<{ title: string; block: string }> {
  const text = (markdown || '').trim();
  if (!text) return [];
  const matches = [...text.matchAll(/^【(.+?)】\s*$/gm)];
  if (matches.length === 0) return [{ title: '', block: text }];
  const blocks: Array<{ title: string; block: string }> = [];
  for (let index = 0; index < matches.length; index++) {
    const match = matches[index];
    const start = match.index || 0;
    const end = matches[index + 1]?.index ?? text.length;
    const block = text.slice(start, end).trim();
    const title = (match[1] || '').trim();
    if (block) blocks.push({ title, block });
  }
  return blocks;
}

function normalizeRouteBlockKey(text: string): string {
  return (text || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[，,。.!！?？;；:：、\-]+/g, ' ')
    .trim();
}

export function selectTopicKnowledgeByLanes(
  topicQuery: string,
  topicBudget: number,
  hasKnowledgeTopic: boolean,
): { topicKnowledge: string; lanes: KnowledgeRouteLane[] } {
  if (!hasKnowledgeTopic) return { topicKnowledge: '', lanes: [] };
  const keys = detectKnowledgeRouteLaneKeys(topicQuery);
  const perLaneBudget = Math.max(360, Math.floor(topicBudget / Math.max(1, keys.length)));
  const lanes: KnowledgeRouteLane[] = [];
  const blocks: Array<{ title: string; block: string }> = [];
  const seen = new Set<string>();

  for (const key of keys) {
    const spec = knowledgeRouteLaneSpecs[key];
    const laneQuery = [topicQuery, spec.query].join('\n');
    const selected = selectKnowledge(laneQuery, perLaneBudget);
    const laneTitles = extractKnowledgeTitles(selected, 4);
    lanes.push({
      key,
      label: spec.label,
      query: spec.query,
      budget: perLaneBudget,
      chars: selected.length,
      titles: laneTitles,
      hit: selected.length > 0,
    });
    for (const block of splitKnowledgeBlocks(selected)) {
      const blockKey = `${block.title || 'untitled'}:${normalizeRouteBlockKey(block.block).slice(0, 120)}`;
      if (seen.has(blockKey)) continue;
      seen.add(blockKey);
      blocks.push(block);
    }
  }

  const selectedBlocks: string[] = [];
  let used = 0;
  for (const block of blocks) {
    if (used + block.block.length > topicBudget && selectedBlocks.length > 0) continue;
    selectedBlocks.push(block.block);
    used += block.block.length;
    if (used >= topicBudget) break;
  }
  return {
    topicKnowledge: selectedBlocks.join('\n\n').slice(0, topicBudget),
    lanes,
  };
}

export function formatKnowledgeLaneSummary(lanes: KnowledgeRouteLane[]): string[] {
  return lanes
    .filter((lane) => lane.hit || lane.key !== 'general')
    .map((lane) => `${lane.label}:${lane.hit ? `${lane.chars}字` : 'miss'}${lane.titles.length ? `(${lane.titles.slice(0, 2).join('/')})` : ''}`)
    .slice(0, 6);
}

const KNOWLEDGE_FRESHNESS_QUERY_PATTERN = /(?:最新|当前|现在|目前|今天|今日|最近|近期|实时|刚刚|刚查到|排名|排行|榜单|阵容|转会|比分|赛果|赛程|赛况|版本|地图池|hltv|vrs|matchid|rating|adr|kast)/i;

export function compactKnowledgeFreshnessIssue(issue: KnowledgeFreshnessIssue): string {
  const missing = issue.missing.length ? ` 缺${issue.missing.join('/')}` : '';
  return `${issue.level}:${issue.title}${missing}`;
}

export function formatKnowledgeFreshnessIssueList(issues: KnowledgeFreshnessIssue[], limit = 3): string {
  return issues.slice(0, limit).map(compactKnowledgeFreshnessIssue).join('；');
}

export function buildKnowledgeFreshnessRuntimeBoundary(
  issues: KnowledgeFreshnessIssue[],
  queryText: string,
  hasKnowledgeTopic: boolean,
): string {
  if (issues.length === 0) return '';
  const realtimeLike = KNOWLEDGE_FRESHNESS_QUERY_PATTERN.test(queryText);
  return [
    `命中疑似旧事实分区: ${formatKnowledgeFreshnessIssueList(issues, 4)}`,
    realtimeLike || hasKnowledgeTopic
      ? '这些块只能当历史线索/背景摘要；回答当前排名、阵容、转会、比分、赛程、版本、地图池时必须以最新实时参考为准，没有准信就说得查最新。'
      : '如果用户追问当前事实，只能把这些块当旧线索，不能包装成现在仍然成立。',
  ].join('\n');
}

export function formatKnowledgeFreshnessTraceItems(issues: KnowledgeFreshnessIssue[], limit = 4): string[] {
  return issues.slice(0, limit).map(compactKnowledgeFreshnessIssue);
}

export function buildKnowledgeRouteDiagnostics(config: AIConfig, route: KnowledgeRoutePreview): { diagnostics: string[]; advice: string[] } {
  const diagnostics: string[] = [];
  const advice: string[] = [];
  const topicKeyword = route.query.split(/\s+/).find((item) => item.length >= 2) || route.query.slice(0, 24);

  if (config.enable_knowledge === false) {
    diagnostics.push('知识库已关闭，实际AI回复不会注入这些内容');
    advice.push('打开 enable_knowledge 后再看真实注入效果');
  }
  if (config.knowledge_force_style === false) {
    diagnostics.push('强制风格包关闭，普通闲聊可能更依赖模型本身');
    advice.push('想稳定玩机器语态就打开 knowledge_force_style');
  }
  if (!route.styleKnowledge) {
    diagnostics.push('风格包未命中，真人感/口癖/边界素材可能吃不到');
    advice.push('/kb stats 看主库是否加载，或把风格素材放 knowledge/inbox 后 /kb ingest');
  } else {
    diagnostics.push(`风格包命中 ${extractKnowledgeTitles(route.styleKnowledge, 2).join('/') || '未命名分区'}`);
  }
  if (route.hasKnowledgeTopic && !route.topicKnowledge) {
    diagnostics.push('检测到话题意图，但话题包未命中');
    advice.push(topicKeyword ? `/kb preview ${topicKeyword} 生成候选，或 /kb import-url <可信来源>` : '/kb preview <关键词> 生成候选');
  } else if (route.hasKnowledgeTopic) {
    const hitLanes = formatKnowledgeLaneSummary(route.lanes);
    diagnostics.push(hitLanes.length > 0
      ? `多路话题命中 ${hitLanes.join('；')}`
      : `话题包命中 ${extractKnowledgeTitles(route.topicKnowledge, 2).join('/') || '未命名分区'}`);
  } else {
    diagnostics.push('未检测到强话题意图，只走风格/场景底座');
    advice.push('如果这是选手/队伍/礼物/语录话题，补更明确关键词再 /kb route');
  }
  if (route.freshnessIssues.length > 0) {
    diagnostics.push(`时效风险 ${formatKnowledgeFreshnessIssueList(route.freshnessIssues, 2)}`);
    advice.push('先 /kb stale 或 /cs verify 核当前事实；修库前这些分区只能当旧线索');
  }
  const missedLanes = route.lanes.filter((lane) => !lane.hit && lane.key !== 'general').map((lane) => lane.label);
  if (missedLanes.length > 0) {
    diagnostics.push(`未命中路: ${missedLanes.join('/')}`);
    advice.push(`/kb preview ${missedLanes[0]} 相关关键词，或把素材放 knowledge/inbox 后 /kb ingest`);
  }
  if (route.knowledgeInfo.length >= Math.floor(route.budget * 0.95)) {
    diagnostics.push('注入接近预算上限，后续分区可能被截断');
    advice.push('小机器可降低 knowledge_max_chars，或把长素材摘要化');
  }
  if (route.titles.length === 0) {
    diagnostics.push('没有提取到知识分区标题');
    advice.push('/kb audit 看主库格式，分区建议使用 Markdown 标题');
  }
  if (advice.length === 0) {
    advice.push('可以发一条强触发后用 /trace last 核对实际知识分区');
  }

  return {
    diagnostics: [...new Set(diagnostics)].slice(0, 5),
    advice: [...new Set(advice)].slice(0, 4),
  };
}

export function formatKnowledgeRoutePreviewPanel(
  input: string,
  route: KnowledgeRoutePreview,
  diagnostic: { diagnostics: string[]; advice: string[] },
): string {
  const clean = (input || '').trim();
  if (!clean) return '/kb route <要预检的消息>';
  return [
    '知识路由预检',
    `输入: ${clean.slice(0, 80)}`,
    `预算: total ${route.budget} / style ${route.styleBudget} / topic ${route.topicBudget}`,
    `话题命中: ${route.hasKnowledgeTopic ? 'yes' : 'no'}`,
    `风格包: ${route.styleKnowledge ? `${route.styleKnowledge.length}字` : '无'}`,
    `话题包: ${route.topicKnowledge ? `${route.topicKnowledge.length}字` : '无'}`,
    `多路召回: ${formatKnowledgeLaneSummary(route.lanes).join(' / ') || (route.hasKnowledgeTopic ? '无命中' : '未触发')}`,
    `注入总量: ${route.knowledgeInfo.length}字`,
    `分区: ${route.titles.join(' / ') || '无'}`,
    `时效风险: ${route.freshnessIssues.length ? formatKnowledgeFreshnessIssueList(route.freshnessIssues, 4) : '无'}`,
    `签名: ${route.signature || '-'}`,
    `命中诊断: ${diagnostic.diagnostics.join('；')}`,
    `行动建议: ${diagnostic.advice.join('；')}`,
    '边界: 这里只预检知识召回，不调用模型；公开事实仍要看来源和实时证据。',
  ].join('\n');
}
