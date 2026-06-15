import type { KnowledgeFreshnessIssue } from './knowledge-base';
import { hasUnsupportedRumorClaim, softenUnverifiedClaims } from './reply-postprocess';

export interface MultimodalPerceptionContext {
  hasImages: boolean;
  imageInputCount?: number;
  visionPayload: boolean;
  visionImages?: number;
  hasRecords: boolean;
  recordInputCount?: number;
  recordTranscripts: number;
  sttTruncated?: boolean;
}

export interface GuardResult {
  text: string;
  reason: string;
  issues: string[];
}

const VISION_BOUNDARY = /(?:没|未|无法|不能|看不|看不到|没看到|没看见|没有看到|没拿到|没加载|下载失败|看不清|看不了|没传图|没图|补充文字|补句文字|重发|别让我硬(?:看|编)|不要(?:假装|硬编)|不能假装).{0,18}(?:图|图片|截图|照片|画面|细节)?/i;
const AUDIO_BOUNDARY = /(?:没|未|无法|不能|听不|听不到|没听到|没听见|没听清|没听写|没有听写|没转写|没有转写|转写失败|听写失败|补充文字|补句文字|重发|别让我硬(?:听|编)|不要(?:假装|硬编)|不能假装).{0,18}(?:语音|声音|录音|音频|细节)?/i;

const VISION_CLAIM = /(?:我(?:看|瞅|扫|识别|读)(?:到|见|出来|了一眼)?|(?:图|图片|截图|照片|画面)(?:里|中|上|里面|中间)?(?:有|是|显示|写着|能看到|可以看到|看起来|可见)|(?:左边|右边|上面|下面|上方|下方|背景里|角落里).{0,16}(?:有|是|写着|显示|站着|坐着|像)|这(?:张|个)(?:图|图片|截图|照片|画面)(?:里|上)?)/i;
const AUDIO_CLAIM = /(?:我(?:听到|听见|听出来|听完|听写|转写)(?:了|到)?|(?:语音|声音|录音|音频)(?:里|中|里面)?(?:说|提到|是|听起来|能听到|可以听到)|你(?:刚才|语音里|录音里)?说(?:的是|了|到)|这(?:条|段)(?:语音|录音|音频)(?:说|里))/i;
const COMPLETE_AUDIO_CLAIM = /(?:完整|全部|全都|每条|后面|剩下|整段|全程).{0,12}(?:听|听完|听到|听写|转写|语音|录音|音频)|(?:听完|听全|全听|全都听|都听到了)/i;

function hasUsableVision(ctx: MultimodalPerceptionContext): boolean {
  return ctx.visionPayload && (ctx.visionImages || 0) > 0;
}

function hasUsableAudio(ctx: MultimodalPerceptionContext): boolean {
  return ctx.recordTranscripts > 0;
}

function hasVisionBoundary(text: string): boolean {
  return VISION_BOUNDARY.test(text);
}

function hasAudioBoundary(text: string): boolean {
  return AUDIO_BOUNDARY.test(text);
}

function hasVisionClaim(text: string): boolean {
  return VISION_CLAIM.test(text);
}

function hasAudioClaim(text: string): boolean {
  return AUDIO_CLAIM.test(text);
}

function imageBoundaryLine(ctx: MultimodalPerceptionContext): string {
  const count = ctx.imageInputCount || 0;
  const prefix = count > 1 ? `这${count}张图` : '这图';
  return `${prefix}我这边实际没看进模型，别让我硬编；你重发一下或补句文字。`;
}

function audioBoundaryLine(ctx: MultimodalPerceptionContext): string {
  const count = ctx.recordInputCount || 0;
  const prefix = count > 1 ? `这${count}条语音` : '这条语音';
  return `${prefix}我这边没听写出来，别让我硬装听见；你补句文字。`;
}

function truncatedAudioBoundaryLine(): string {
  return '我只听写到前面一部分，后面的别让我硬编；你补一下剩下的。';
}

export function guardMultimodalPerceptionClaims(text: string, ctx: MultimodalPerceptionContext): GuardResult {
  const original = (text || '').trim();
  if (!original) return { text: original, reason: '', issues: [] };

  const issues: string[] = [];
  const imageNeedsBoundary = (
    ctx.hasImages
    && !hasUsableVision(ctx)
    && hasVisionClaim(original)
    && !hasVisionBoundary(original)
  );
  const audioNeedsBoundary = (
    ctx.hasRecords
    && !hasUsableAudio(ctx)
    && hasAudioClaim(original)
    && !hasAudioBoundary(original)
  );
  const truncatedAudioNeedsBoundary = (
    ctx.hasRecords
    && hasUsableAudio(ctx)
    && ctx.sttTruncated === true
    && COMPLETE_AUDIO_CLAIM.test(original)
    && !hasAudioBoundary(original)
  );

  if (imageNeedsBoundary) issues.push('unsupported vision perception claim');
  if (audioNeedsBoundary) issues.push('unsupported audio perception claim');
  if (truncatedAudioNeedsBoundary) issues.push('overbroad audio transcript claim');
  if (issues.length === 0) return { text: original, reason: '', issues };

  const boundaries: string[] = [];
  if (imageNeedsBoundary) boundaries.push(imageBoundaryLine(ctx));
  if (audioNeedsBoundary) boundaries.push(audioBoundaryLine(ctx));
  if (truncatedAudioNeedsBoundary) boundaries.push(truncatedAudioBoundaryLine());

  return {
    text: [...new Set(boundaries)].join('\n'),
    reason: `multimodal perception guard: ${issues.join('/')}`,
    issues,
  };
}

export type KnowledgeFreshnessRiskKind = 'ranking' | 'roster' | 'match' | 'version' | 'player';

export interface FactGuardResult {
  text: string;
  reason: string;
}

export interface EvidenceLedgerGuardContext {
  realtimeStaleEvidence?: boolean;
  memoryFiltered?: number;
}

function knowledgeFreshnessRiskKinds(issues: KnowledgeFreshnessIssue[]): KnowledgeFreshnessRiskKind[] {
  const kinds: KnowledgeFreshnessRiskKind[] = [];
  const add = (kind: KnowledgeFreshnessRiskKind) => {
    if (!kinds.includes(kind)) kinds.push(kind);
  };
  for (const issue of issues) {
    const text = `${issue.title}\n${issue.triggers.join(' ')}\n${issue.excerpt}\n${issue.advice}`;
    if (/排名|排行|榜单|top\s*\d|VRS|HLTV/i.test(text)) add('ranking');
    if (/阵容|转会|加入|离队|替补|租借|官宣|签约|bench|roster|transfer|队伍|选手/i.test(text)) add('roster');
    if (/比分|赛果|赛程|赛况|正在打|刚结束|胜者|地图比分|BO[135]|matchid|比赛/i.test(text)) add('match');
    if (/选手数据|个人数据|rating|ADR|KAST|K\/?D|stats?|状态|表现|发挥|击杀|KD/i.test(text)) add('player');
    if (/版本|更新|改动|active duty|地图池|服役地图|移除|加入地图/i.test(text)) add('version');
  }
  return kinds;
}

function freshRealtimeCoversKnowledgeKind(kind: KnowledgeFreshnessRiskKind, hltvLabels: string[], realtimeFreshness: string[]): boolean {
  const labelText = hltvLabels.join(' ');
  const freshnessText = realtimeFreshness.join(' ');
  if (!/\bfresh\b/i.test(freshnessText)) return false;
  if (kind === 'ranking') return /排名|ranking/i.test(labelText) || /(?:^|\s)ranking\s+fresh/i.test(freshnessText);
  if (kind === 'match') return /单场|赛程|赛果|近期比赛|正在比赛|比赛/i.test(labelText) || /(?:^|\s)(?:match:\d+|matches|results)\s+fresh/i.test(freshnessText);
  if (kind === 'roster') return /队伍|阵容|team/i.test(labelText) || /(?:^|\s)team:[^\s]+\s+fresh/i.test(freshnessText);
  if (kind === 'player') return /选手|player|stats?|状态|表现|单场/i.test(labelText) || /(?:^|\s)(?:player:[^\s]+|match:\d+)\s+fresh/i.test(freshnessText);
  if (kind === 'version') return /版本|地图池|active duty/i.test(labelText) || /(?:map|version|pool)[^\s]*\s+fresh/i.test(freshnessText);
  return false;
}

function replyMatchesKnowledgeRiskKind(text: string, kind: KnowledgeFreshnessRiskKind): boolean {
  if (!text) return false;
  if (kind === 'ranking') {
    return /(?:现在|目前|当前|今天|最新|最近)?[^。！？!?]{0,24}(?:排名|排行|榜单|第[一二三四五六七八九十\d]+|top\s*\d|第一|VRS|HLTV)/i.test(text);
  }
  if (kind === 'roster') {
    return /(?:现在|目前|当前|最新|最近)?[^。！？!?]{0,24}(?:阵容|转会|加入|离队|替补|首发|签约|bench|benched|roster|transfer|在.{0,8}队)/i.test(text);
  }
  if (kind === 'match') {
    return /(?:现在|目前|今天|今日|最新|最近|刚刚|刚结束)?[^。！？!?]{0,24}(?:比分|赛果|赛程|赛况|战胜|淘汰|赢了|输了|\d{1,2}\s*[:：-]\s*\d{1,2}|matchid|BO[135])/i.test(text);
  }
  if (kind === 'player') {
    return /(?:现在|目前|当前|今天|最新|最近|这场|近期)?[^。！？!?]{0,30}(?:rating|ADR|KAST|K\/?D|KD|stats?|数据|状态|表现|发挥|击杀|谁C|谁c|谁最C|谁最c|最C|最c)/i.test(text);
  }
  if (kind === 'version') {
    return /(?:现在|目前|当前|最新|最近)?[^。！？!?]{0,24}(?:版本|地图池|active duty|服役地图|移除|加入地图|更新|改动)/i.test(text);
  }
  return false;
}

export function localizeKnowledgeRiskKind(kind: KnowledgeFreshnessRiskKind): string {
  if (kind === 'ranking') return '当前排名';
  if (kind === 'roster') return '当前阵容/转会';
  if (kind === 'match') return '当前比分/赛果/赛程';
  if (kind === 'player') return '当前选手数据/状态';
  if (kind === 'version') return '当前版本/地图池';
  return '当前事实';
}

function softenKnowledgeFreshnessRiskClaims(
  text: string,
  issues: KnowledgeFreshnessIssue[],
  hasCurrentRealtimeData: boolean,
  hltvLabels: string[],
  realtimeFreshness: string[],
): FactGuardResult {
  if (!text || issues.length === 0) return { text, reason: '' };
  const alreadyConservative = /(?:我得查|得查最新|印象里|不一定对|不太确定|具体我得|你查最新|以最新为准|按最新为准|不能保证|别让我硬编|没实时来源|没查到准信|旧线索|旧快照|不能当实时)/.test(text);
  if (alreadyConservative) return { text, reason: '' };

  const kinds = knowledgeFreshnessRiskKinds(issues);
  const uncovered = kinds.filter((kind) => !freshRealtimeCoversKnowledgeKind(kind, hltvLabels, realtimeFreshness));
  const risky = (uncovered.length > 0 ? uncovered : (!hasCurrentRealtimeData ? kinds : []))
    .filter((kind) => replyMatchesKnowledgeRiskKind(text, kind));
  if (risky.length === 0) return { text, reason: '' };

  const label = risky.map(localizeKnowledgeRiskKind).join('/');
  return {
    text: `这块${label}我得看最新来源，不能拿本地旧资料报死；你以最新为准`,
    reason: `knowledge freshness risk softened: ${risky.join('/')}`,
  };
}

function hasRealtimeMissEvidence(realtimeFreshness: string[]): boolean {
  return realtimeFreshness.some((line) => /\bmiss\b|无快照|没有成功快照|还没有成功快照/i.test(line));
}

function hasRealtimeFreshEvidence(realtimeFreshness: string[]): boolean {
  return realtimeFreshness.some((line) => /\bfresh\b/i.test(line));
}

function hasRealtimeStaleEvidence(realtimeFreshness: string[], explicitStale?: boolean): boolean {
  return explicitStale === true
    || realtimeFreshness.some((line) => /\bstale\b|过期|旧缓存|不能当实时结论/i.test(line));
}

function hasMixedCurrentEvidence(
  hasCurrentRealtimeData: boolean,
  realtimeFreshness: string[],
  guardContext?: EvidenceLedgerGuardContext,
): boolean {
  if (!hasCurrentRealtimeData) return false;
  const hasFresh = hasRealtimeFreshEvidence(realtimeFreshness);
  if (!hasFresh && realtimeFreshness.length > 0) return false;
  return hasRealtimeStaleEvidence(realtimeFreshness, guardContext?.realtimeStaleEvidence)
    || hasRealtimeMissEvidence(realtimeFreshness)
    || (guardContext?.memoryFiltered || 0) > 0;
}

function replyCurrentFactKinds(text: string): KnowledgeFreshnessRiskKind[] {
  const kinds: KnowledgeFreshnessRiskKind[] = [];
  const allKinds: KnowledgeFreshnessRiskKind[] = ['ranking', 'roster', 'match', 'player', 'version'];
  for (const kind of allKinds) {
    if (replyMatchesKnowledgeRiskKind(text, kind)) kinds.push(kind);
  }
  return kinds;
}

export function uncoveredReplyFactKinds(
  text: string,
  hltvLabels: string[],
  realtimeFreshness: string[],
): KnowledgeFreshnessRiskKind[] {
  return replyCurrentFactKinds(text)
    .filter((kind) => !freshRealtimeCoversKnowledgeKind(kind, hltvLabels, realtimeFreshness));
}

function softenMixedEvidenceOverclaims(
  text: string,
  hasCurrentRealtimeData: boolean,
  hltvLabels: string[],
  realtimeFreshness: string[],
  guardContext?: EvidenceLedgerGuardContext,
): FactGuardResult {
  if (!text || !hasCurrentRealtimeData) return { text, reason: '' };
  const alreadyBounded = /(?:只按|只能按|没覆盖|未覆盖|不能报死|不能拍死|不能当实时结论|旧线索|旧快照|缺口|以最新为准|得查最新|不确定|不敢说|没准信|没可靠来源)/.test(text);
  if (alreadyBounded) return { text, reason: '' };
  const uncoveredKinds = uncoveredReplyFactKinds(text, hltvLabels, realtimeFreshness);
  if (uncoveredKinds.length > 0) {
    const labels = uncoveredKinds.map(localizeKnowledgeRiskKind).join('/');
    return {
      text: `这条最新证据没覆盖${labels}；我只能按资料覆盖到的部分说，没覆盖的别报死。`,
      reason: `evidence ledger uncovered fact kind softened: ${uncoveredKinds.join('/')}`,
    };
  }
  if (!hasMixedCurrentEvidence(hasCurrentRealtimeData, realtimeFreshness, guardContext)) {
    return { text, reason: '' };
  }
  const hasOverclaim =
    /我(?:刚刚?|刚才|才|已经)?(?:查|搜|看|翻)(?:了|到)?(?:一下|一眼|了下|下)?.{0,24}(?:HLTV|hltv|实时|最新|数据|资料|榜单|排名)/i.test(text)
    || /(?:HLTV|hltv|实时(?:数据|资料|榜单)?|最新(?:数据|资料|排名|消息)?|资料|数据|榜单)(?:显示|说|写着|给到|查到|来看|上看)/i.test(text)
    || /(?:全部|全都|都|完整|所有)(?:[^。！？!?]{0,12})(?:最新|实时|当前|fresh|没问题|能报死|可以报死|直接报死|拍死|下结论)/i.test(text)
    || /(?:可以|能|直接|放心)(?:[^。！？!?]{0,8})(?:报死|拍死|下结论)/i.test(text);
  if (!hasOverclaim) return { text, reason: '' };
  const stale = hasRealtimeStaleEvidence(realtimeFreshness, guardContext?.realtimeStaleEvidence);
  const miss = hasRealtimeMissEvidence(realtimeFreshness);
  const filtered = guardContext?.memoryFiltered || 0;
  const risks = [
    stale ? '旧快照' : '',
    miss ? '缺口' : '',
    filtered > 0 ? `过滤旧记忆${filtered}条` : '',
  ].filter(Boolean).join('、') || '混合证据';
  return {
    text: `这条有最新证据，但证据账本里还有${risks}；我只能按资料覆盖到的部分说，没覆盖的别报死。`,
    reason: 'evidence ledger mixed-current overclaim softened',
  };
}

export function guardReplyFacts(
  text: string,
  hasCurrentRealtimeData: boolean,
  knowledgeFreshnessIssues: KnowledgeFreshnessIssue[],
  hltvLabels: string[],
  realtimeFreshness: string[],
  guardContext?: EvidenceLedgerGuardContext,
): FactGuardResult {
  const beforeGeneralGuard = text;
  const beforeRumorGuard = hasUnsupportedRumorClaim(beforeGeneralGuard, hasCurrentRealtimeData);
  const next = softenUnverifiedClaims(beforeGeneralGuard, hasCurrentRealtimeData);
  if (next !== beforeGeneralGuard) {
    return {
      text: next,
      reason: beforeRumorGuard
        ? 'unsupported rumor claim softened'
        : hasCurrentRealtimeData ? 'realtime-backed reply kept conservative' : 'unverified realtime claim softened',
    };
  }
  const freshnessGuard = softenKnowledgeFreshnessRiskClaims(
    next,
    knowledgeFreshnessIssues,
    hasCurrentRealtimeData,
    hltvLabels,
    realtimeFreshness,
  );
  if (freshnessGuard.reason) return freshnessGuard;
  return softenMixedEvidenceOverclaims(next, hasCurrentRealtimeData, hltvLabels, realtimeFreshness, guardContext);
}
