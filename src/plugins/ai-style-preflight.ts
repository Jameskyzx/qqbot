import type { AIConfig } from '../types';
import { extractEvidenceLines, extractRealtimeFreshnessLines } from './ai-evidence';
import { detectCsTopicQuery } from './fuzzy-command';
import { assessReplyQuality, ReplyQualityCheck, ReplyQualityJobSnapshot } from './ai-reply-quality';
import { buildStyleSceneDecision, StyleSceneDecision, StyleSceneInput } from './ai-style-scene';
import { postProcessReply, previewText } from './reply-postprocess';

export interface StyleEvidenceAnalysis {
  evidenceText: string;
  hasCurrentRealtimeData: boolean;
  hasEvidenceText: boolean;
  hasFresh: boolean;
  hasStale: boolean;
  hasMiss: boolean;
  staleOnly: boolean;
  freshness: string[];
  evidenceLines: string[];
  mode: string;
  boundary: string;
}

export type StyleFactKind = 'ranking' | 'roster' | 'match' | 'version' | 'player';

export interface StyleFactGuardResult {
  text: string;
  reason: string;
}

export interface StyleVoicePreflightAnalysis {
  cleaned: string;
  maxChars: number;
  parts: string[];
  likelyTruncated: boolean;
  risks: string[];
  stats: {
    provider: string;
    localReady?: boolean;
    sendMode: string;
  };
}

export interface StyleQualityPreflightOptions {
  hasRealtimeData?: boolean;
  forceVoice?: boolean;
  config?: AIConfig;
  apiReady?: boolean;
  evidenceText?: string;
  guardReplyFacts?: (
    text: string,
    hasCurrentRealtimeData: boolean,
    realtimeFreshness: string[],
    realtimeStaleEvidence: boolean,
  ) => StyleFactGuardResult;
  uncoveredFactKinds?: (text: string, realtimeFreshness: string[]) => StyleFactKind[];
  localizeFactKind?: (kind: StyleFactKind) => string;
  buildVoicePreflightAnalysis?: (
    config: AIConfig,
    text: string,
    apiReady: boolean,
  ) => StyleVoicePreflightAnalysis;
}

type StyleCsEvidenceTargetKind = 'matches' | 'results' | 'ranking' | 'match' | 'team' | 'player';

interface StyleCsEvidenceTarget {
  kind: StyleCsEvidenceTargetKind;
  subject: string;
  reason: string;
}

type StyleCheckJobSnapshot = ReplyQualityJobSnapshot & StyleSceneInput;

export function parseStyleCheckArgs(args: string[]): { text: string; evidenceText: string; hasRealtimeData: boolean; forceVoice: boolean } {
  const joined = args.slice(1).join(' ').trim();
  const hasRealtimeData = /(?:^|\s)--(?:realtime|fresh)(?=\s|$)/i.test(joined);
  const forceVoice = /(?:^|\s)--(?:voice|语音)(?=\s|$)/i.test(joined);
  const withoutFlags = joined
    .replace(/(?:^|\s)--(?:realtime|fresh|voice|语音)(?=\s|$)/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const [textPart, ...evidenceParts] = withoutFlags.split(/\s*\|\|\s*/);
  return {
    text: (textPart || '').trim(),
    evidenceText: evidenceParts.join(' || ').trim(),
    hasRealtimeData,
    forceVoice,
  };
}

function makeStyleCheckSnapshot(text: string, forceVoice: boolean = false): StyleCheckJobSnapshot {
  return {
    rawText: text,
    effectiveText: text,
    hasImages: false,
    imageInputCount: 0,
    imageUrls: [],
    hasRecords: false,
    recordUrls: [],
    forceVoice,
    isAtBot: false,
  };
}

export function analyzeStyleEvidence(evidenceText: string, explicitRealtime: boolean): StyleEvidenceAnalysis {
  const evidence = (evidenceText || '').trim();
  const freshness = extractRealtimeFreshnessLines(evidence, 6);
  const evidenceLines = extractEvidenceLines(evidence, 3);
  const hasFresh = /\bfresh\b/i.test(evidence) || freshness.some((line) => /\bfresh\b/i.test(line));
  const hasStale = /\bstale\b|过期|旧缓存|不能当实时结论/i.test(evidence)
    || freshness.some((line) => /\bstale\b|过期|旧缓存|不能当实时结论/i.test(line));
  const hasMiss = /\bmiss\b|无快照|没有成功快照|还没有成功快照/i.test(evidence)
    || freshness.some((line) => /\bmiss\b|无快照|没有成功快照|还没有成功快照/i.test(line));
  const hasEvidenceText = !!evidence;
  const staleOnly = hasStale && !hasFresh;
  const missOnly = hasMiss && !hasFresh && !hasStale;
  const hasSourceLikeEvidence = evidenceLines.length > 0 || /(?:CS API|HLTV|Liquipedia|VRS|webSearch|拉取|链接|https?:\/\/)/i.test(evidence);
  const hasCurrentRealtimeData = hasEvidenceText
    ? (hasFresh || (hasSourceLikeEvidence && !staleOnly && !missOnly))
    : explicitRealtime;
  const mode = hasCurrentRealtimeData
    ? '有当前实时证据'
    : staleOnly
      ? '仅旧缓存线索'
      : missOnly
        ? '本地无快照'
        : explicitRealtime
          ? '有实时证据'
          : '无实时证据';
  const boundary = staleOnly
    ? '证据只有 stale/旧缓存，按无当前实时依据处理；只能说旧快照/线索/需查最新。'
    : missOnly
      ? '证据显示 miss/无快照，不能说成没有比赛、没有赛果或没有变动。'
      : hasCurrentRealtimeData
        ? '只能说证据文本里明确出现的事实；没覆盖的点仍要收住。'
        : '没有实时证据支撑时，别报最新排名/比分/阵容/转会。';

  return {
    evidenceText: evidence,
    hasCurrentRealtimeData,
    hasEvidenceText,
    hasFresh,
    hasStale,
    hasMiss,
    staleOnly,
    freshness,
    evidenceLines,
    mode,
    boundary,
  };
}

function localizeStyleQualityIssue(issue: string): string {
  const map: Record<string, string> = {
    empty: '空回复',
    'source/template leak': '把知识库/模板/AI身份外显',
    'realtime evidence metadata leak': '把缓存/source/ttl等证据元数据外显',
    'identity impersonation claim': '冒充现实本人或声称授权',
    'unsupported original quote claim': '把拟态句说成未核验原话',
    'report-like heading': '报告式标题，不像群聊顺手接话',
    'list-like assistant style': '列表腔/助手腔偏重',
    'overused catchphrases': '口头禅堆叠',
    'low-information catchphrase': '空口头禅',
    'generic-template reply': '泛泛套话，没有接住当前消息',
    'too long': '文本过长',
    'too long for voice': '语音文本过长',
    'false realtime source claim': '假装刚查过实时来源',
    'unsupported rumor source claim': '拿传闻/群友说法背书',
    'unverified realtime claim': '没有证据却报当前事实',
  };
  return map[issue] || issue;
}

function formatStyleIssueList(issues: string[]): string {
  if (issues.length === 0) return '无';
  return issues.map((issue) => `${issue}(${localizeStyleQualityIssue(issue)})`).join(' / ');
}

function stylePreflightRiskLevel(rawQuality: ReplyQualityCheck, finalQuality: ReplyQualityCheck, evidence: StyleEvidenceAnalysis): string {
  if (rawQuality.ok && finalQuality.ok) return 'low 可直接发';
  if (finalQuality.ok) return 'medium 后处理可修复';
  const highRiskIssues = new Set([
    'identity impersonation claim',
    'unsupported original quote claim',
    'false realtime source claim',
    'unsupported rumor source claim',
    'unverified realtime claim',
  ]);
  if (finalQuality.issues.some((issue) => highRiskIssues.has(issue)) || evidence.staleOnly || evidence.hasMiss) {
    return 'high 需要重写/补证据';
  }
  return 'medium 建议重写短一点';
}

function stylePreflightFixActions(rawQuality: ReplyQualityCheck, finalQuality: ReplyQualityCheck, evidence: StyleEvidenceAnalysis, changed: boolean): string[] {
  const allIssues = new Set([...rawQuality.issues, ...finalQuality.issues]);
  const actions: string[] = [];
  if (allIssues.has('identity impersonation claim')) actions.push('身份边界: 改成“风格bot/不代表本人”');
  if (allIssues.has('unsupported original quote claim')) actions.push('原话边界: 改成“场景口吻/拟态模板”');
  if (allIssues.has('false realtime source claim')) actions.push('来源边界: 删掉“我刚查/HLTV显示”等假来源');
  if (allIssues.has('unsupported rumor source claim')) actions.push('传闻边界: 不用“听说/朋友说/群里说”背书');
  if (allIssues.has('unverified realtime claim')) actions.push('事实边界: 没准信就说“得查最新”');
  if (allIssues.has('source/template leak') || allIssues.has('realtime evidence metadata leak')) actions.push('外显清理: 删知识库/缓存/source/ttl 元数据');
  if (allIssues.has('report-like heading') || allIssues.has('list-like assistant style')) actions.push('口吻修复: 去标题/列表，改成一两句接弹幕');
  if (allIssues.has('overused catchphrases') || allIssues.has('low-information catchphrase') || allIssues.has('generic-template reply')) actions.push('真人感: 少堆口头禅，补当前消息里的具体点');
  if (allIssues.has('too long') || allIssues.has('too long for voice')) actions.push('长度: 压到短句，语音优先一两句');
  if (evidence.staleOnly) actions.push('证据降级: stale 只能说旧快照/线索');
  if (evidence.hasMiss && !evidence.hasFresh) actions.push('证据缺口: miss 不等于事实不存在');
  if (actions.length === 0 && changed) actions.push('后处理: 已做基础清洗/边界修复');
  if (actions.length === 0) actions.push('保持: 这句不用额外修复');
  return [...new Set(actions)].slice(0, 5);
}

function stylePreflightAdvice(rawQuality: ReplyQualityCheck, finalQuality: ReplyQualityCheck, evidence: StyleEvidenceAnalysis, scene: StyleSceneDecision, forceVoice: boolean): string[] {
  const advice: string[] = [];
  const issues = new Set([...rawQuality.issues, ...finalQuality.issues]);
  if (issues.has('identity impersonation claim')) advice.push('别说自己是现实主播、官方号或已授权，必要时只说风格bot。');
  if (issues.has('unsupported original quote claim')) advice.push('拟态短句可以用，但不要叫原话/经典语录/本人说过。');
  if (issues.has('false realtime source claim') || issues.has('unverified realtime claim')) advice.push('排名、比分、阵容、转会要么有最新来源，要么收成“我得查最新”。');
  if (issues.has('unsupported rumor source claim')) advice.push('传闻类只说没有可靠来源，不把群聊/朋友/爆料当证据。');
  if (issues.has('source/template leak') || issues.has('realtime evidence metadata leak')) advice.push('发群消息只保留自然结论，不外显知识库、缓存和 source 字段。');
  if (issues.has('report-like heading') || issues.has('list-like assistant style')) advice.push('删标题和列表，改成像 QQ 群里顺手接一句。');
  if (issues.has('low-information catchphrase') || issues.has('overused catchphrases') || issues.has('generic-template reply')) advice.push('少复读口头禅，必须接住当前消息里的一个名词、动作、图像细节或听写内容。');
  if (forceVoice) advice.push('语音版优先短句，有停顿感，别塞长说明。');
  if (evidence.staleOnly) advice.push('这次证据是旧缓存，不能报“现在/最新”。');
  if (evidence.hasMiss && !evidence.hasFresh) advice.push('miss 只说明本地没快照，不代表没有比赛/赛果/变动。');
  if (scene.scene === '身份边界') advice.push('身份场景默认不缓存，减少复读和冒充风险。');
  if (advice.length === 0) advice.push(finalQuality.ok ? '可以发；保持短、具体、别解释自己在模仿。' : '先按修复动作重写，再跑一次 /style check。');
  return [...new Set(advice)].slice(0, 5);
}

function styleEvidenceAction(evidence: StyleEvidenceAnalysis): string {
  if (!evidence.hasEvidenceText) return '';
  if (evidence.staleOnly) return '降级为旧快照线索，不能当当前事实。';
  if (evidence.hasMiss && !evidence.hasFresh) return '按无当前证据处理，不能反推事实不存在。';
  if (evidence.hasCurrentRealtimeData) return '可作当前证据，但只覆盖证据文本明确出现的事实。';
  return '证据不足，按无实时依据处理。';
}

function styleSubjectFromCacheKey(cacheKey: string): string {
  return cacheKey.replace(/^[a-z]+:/i, '').replace(/[_-]+/g, ' ').trim();
}

function styleTargetFromCacheKey(cacheKey: string): StyleCsEvidenceTarget | null {
  const key = cacheKey.trim();
  if (!key) return null;
  if (key === 'matches') return { kind: 'matches', subject: '', reason: '证据缓存键 matches' };
  if (key === 'results') return { kind: 'results', subject: '', reason: '证据缓存键 results' };
  if (key === 'ranking') return { kind: 'ranking', subject: '', reason: '证据缓存键 ranking' };
  const matchId = key.match(/^match:(\d{4,})$/i)?.[1];
  if (matchId) return { kind: 'match', subject: matchId, reason: `证据缓存键 match:${matchId}` };
  if (/^team:/i.test(key)) {
    const subject = styleSubjectFromCacheKey(key);
    return subject ? { kind: 'team', subject, reason: `证据缓存键 ${key}` } : null;
  }
  if (/^player:/i.test(key)) {
    const subject = styleSubjectFromCacheKey(key);
    return subject ? { kind: 'player', subject, reason: `证据缓存键 ${key}` } : null;
  }
  return null;
}

function cacheKeyFromStyleEvidence(evidenceText: string): string {
  const match = evidenceText.match(/(?:^|\n)\s*(?:缓存|当前缓存|cache)\s*[:：]\s*([a-z0-9:_-]+)/i);
  return match?.[1]?.trim() || '';
}

function findKnownCsName(text: string, names: string[]): string {
  const normalized = text.toLowerCase();
  return names.find((name) => normalized.includes(name.toLowerCase())) || '';
}

function inferStyleCsEvidenceTarget(rawText: string, evidence: StyleEvidenceAnalysis): StyleCsEvidenceTarget | null {
  const cacheKeyTarget = styleTargetFromCacheKey(cacheKeyFromStyleEvidence(evidence.evidenceText));
  if (cacheKeyTarget) return cacheKeyTarget;

  const text = rawText.trim();
  if (!text) return null;
  const explicitMatchId = text.match(/(?:match\s*id|matchid|比赛id|赛果id)\s*[=：:\s#-]*(\d{4,})/i)?.[1];
  const contextualMatchId = /(?:这场|单场|比赛|赛果|match)/i.test(text)
    ? text.match(/(?:^|[^\d])(\d{4,})(?:[^\d]|$)/)?.[1]
    : '';
  const matchId = explicitMatchId || contextualMatchId;
  if (matchId) return { kind: 'match', subject: matchId, reason: '文本里有 matchid' };
  if (/(?:排名|排行|第[一二三四五六七八九十\d]+|top\s*\d|VRS|Valve\s*rank)/i.test(text)) {
    return { kind: 'ranking', subject: '', reason: '文本在报排名/榜单' };
  }
  if (/(?:赛果|比分|战胜|淘汰|赢了|输了|刚结束|结果|几比几|\d{1,2}\s*[:：-]\s*\d{1,2})/i.test(text)) {
    return { kind: 'results', subject: '', reason: '文本在报赛果/比分' };
  }
  if (/(?:赛程|对阵|开打|开赛|正在打|今晚|今天).{0,20}(?:比赛|打|vs|对)/i.test(text) || /\bvs\b/i.test(text)) {
    return { kind: 'matches', subject: '', reason: '文本在报赛程/对阵' };
  }

  const player = findKnownCsName(text, [
    'donk', 'ZywOo', 'm0NESY', 's1mple', 'NiKo', 'ropz', 'sh1ro', 'device', 'jL', 'b1t', 'w0nderful',
    'flameZ', 'Spinx', 'broky', 'frozen', 'KSCERATO', 'XANTARES',
  ]);
  if (player && /(?:选手|状态|表现|rating|ADR|KAST|谁C|最C|数据|发挥|手感)/i.test(text)) {
    return { kind: 'player', subject: player, reason: `文本在问/报选手 ${player}` };
  }

  const team = findKnownCsName(text, [
    'NAVI', 'Vitality', 'Spirit', 'FaZe', 'MOUZ', 'G2', 'Falcons', 'Astralis', 'Liquid', 'FURIA',
    'Heroic', 'The MongolZ', 'MongolZ', 'TYLOO', 'Lynn Vision', 'Cloud9', 'Virtus.pro', 'VP',
  ]);
  if (team && /(?:阵容|转会|换人|签约|离队|下放|替补|首发|状态|表现|队伍|战队)/i.test(text)) {
    return { kind: 'team', subject: team, reason: `文本在问/报队伍 ${team}` };
  }
  return null;
}

function styleCommandArgsForTarget(target: StyleCsEvidenceTarget): string {
  if (target.kind === 'matches' || target.kind === 'results' || target.kind === 'ranking') return target.kind;
  if (target.kind === 'match') return `match ${target.subject}`.trim();
  if (target.kind === 'team') return `team ${target.subject}`.trim();
  return `player ${target.subject}`.trim();
}

function formatStyleEvidenceCommands(rawText: string, evidence: StyleEvidenceAnalysis): string {
  const target = inferStyleCsEvidenceTarget(rawText, evidence);
  const csTopic = detectCsTopicQuery(rawText);
  const hasCsIntent = csTopic.needsMatches || csTopic.needsRanking || csTopic.needsResults
    || /(?:CS2?|csgo|HLTV|hltv|比赛|赛程|赛果|比分|排名|阵容|转会|选手|队伍|战队|rating|ADR|KAST)/i.test(rawText);
  if (!target) {
    if (!hasCsIntent) return '';
    const intentText = rawText.replace(/\s+/g, ' ').slice(0, 60);
    return `证据命令: 目标不够明确，先 /cs intent ${intentText} 看路由，再按对应 /cs verify 目标补证据。`;
  }

  const args = styleCommandArgsForTarget(target);
  const evidenceCommand = `/cs evidence ${args}`;
  const verifyCommand = `/cs verify ${args}`;
  if (evidence.hasCurrentRealtimeData && !evidence.staleOnly && !(evidence.hasMiss && !evidence.hasFresh)) {
    return `证据命令: ${evidenceCommand}；${verifyCommand} 只读复核。目标: ${target.reason}`;
  }
  return `证据命令: ${verifyCommand}；管理员先 /cs warm plan ${args}，确认会 REFRESH 后再 /cs warm ${args}；最后 ${evidenceCommand}。目标: ${target.reason}`;
}

function defaultFactGuard(text: string): StyleFactGuardResult {
  return { text, reason: '' };
}

function localizeFactKind(kind: StyleFactKind, custom?: (kind: StyleFactKind) => string): string {
  if (custom) return custom(kind);
  if (kind === 'ranking') return '当前排名';
  if (kind === 'roster') return '当前阵容/转会';
  if (kind === 'match') return '当前比分/赛果/赛程';
  if (kind === 'player') return '当前选手数据/状态';
  if (kind === 'version') return '当前版本/地图池';
  return '当前事实';
}

export function formatStyleQualityPreflight(
  rawText: string,
  options: StyleQualityPreflightOptions = {},
): string {
  const raw = (rawText || '').trim();
  if (!raw) return '/style check <要检查的回复文本>';
  const forceVoice = options.forceVoice === true;
  const evidence = analyzeStyleEvidence(options.evidenceText || '', options.hasRealtimeData === true);
  const hasRealtimeData = evidence.hasCurrentRealtimeData;
  const job = makeStyleCheckSnapshot(raw, forceVoice);
  const csTopic = detectCsTopicQuery(raw);
  const realtimeIntent = csTopic.needsMatches || csTopic.needsRanking || csTopic.needsResults || /(?:最新|现在|当前|目前|今天|今日|刚查|HLTV|hltv|实时|排名|阵容|转会|比分|赛果)/.test(raw);
  const scene = buildStyleSceneDecision(job, '', realtimeIntent, hasRealtimeData);
  const rawQuality = assessReplyQuality(raw, job, hasRealtimeData);
  const postProcessed = postProcessReply(raw);
  const styleGuard = (options.guardReplyFacts || defaultFactGuard)(
    postProcessed,
    hasRealtimeData,
    evidence.freshness,
    evidence.hasStale,
  );
  const guarded = styleGuard.text;
  const finalQuality = assessReplyQuality(guarded, job, hasRealtimeData);
  const changed = guarded !== raw;
  const uncoveredFactKinds = hasRealtimeData && options.uncoveredFactKinds
    ? options.uncoveredFactKinds(postProcessed, evidence.freshness)
    : [];
  const factCoverageText = evidence.hasEvidenceText && hasRealtimeData
    ? (uncoveredFactKinds.length > 0
      ? `未覆盖 ${uncoveredFactKinds.map((kind) => localizeFactKind(kind, options.localizeFactKind)).join(' / ')}`
      : '当前句子的事实类型已有最新证据覆盖或未出现需覆盖事实')
    : '';
  const baseRiskLevel = stylePreflightRiskLevel(rawQuality, finalQuality, evidence);
  const riskLevel = styleGuard.reason && baseRiskLevel.startsWith('low')
    ? 'medium 发出前会修正事实边界'
    : baseRiskLevel;
  const fixActions = stylePreflightFixActions(rawQuality, finalQuality, evidence, changed);
  if (styleGuard.reason && fixActions.length < 5) fixActions.unshift('事实覆盖: 只说最新证据明确覆盖的事实类型');
  const advice = stylePreflightAdvice(rawQuality, finalQuality, evidence, scene, forceVoice);
  if (styleGuard.reason && advice.length < 5) advice.unshift('最新证据也要按类型使用，没覆盖的排名/阵容/赛果/选手数据别顺手补。');
  const evidenceAction = styleEvidenceAction(evidence);
  const evidenceCommands = formatStyleEvidenceCommands(raw, evidence);
  const voiceAnalysis = forceVoice && options.config && options.buildVoicePreflightAnalysis
    ? options.buildVoicePreflightAnalysis(options.config, guarded, options.apiReady === true)
    : null;
  const voicePreview = voiceAnalysis
    ? (voiceAnalysis.parts.slice(0, 2).map((part, index) => `${index + 1}.${previewText(part, 48)}`).join(' | ') || '无可念文本')
    : '';
  const lines = [
    '风格/真实性预检',
    `场景: ${scene.scene}${scene.needsRealtime ? '/需实时' : ''}${scene.signals.length ? ` (${scene.signals.join('/')})` : ''}`,
    `模式: ${evidence.mode}${forceVoice ? ' / 语音长度' : ''}`,
    `风险等级: ${riskLevel}`,
    evidence.hasEvidenceText ? `证据新鲜度: ${evidence.freshness.join(' / ') || '未看到fresh/stale/miss缓存行'}` : '',
    evidence.hasEvidenceText && evidence.evidenceLines.length > 0 ? `证据线索: ${evidence.evidenceLines.join(' / ')}` : '',
    evidence.hasEvidenceText ? `证据边界: ${evidence.boundary}` : '',
    factCoverageText ? `事实类型覆盖: ${factCoverageText}` : '',
    evidenceAction ? `证据动作: ${evidenceAction}` : '',
    evidenceCommands,
    `原文风险: ${formatStyleIssueList(rawQuality.issues)}`,
    `发出前风险: ${formatStyleIssueList(finalQuality.issues)}`,
    styleGuard.reason ? `事实修正: ${styleGuard.reason}` : '',
    `修复动作: ${fixActions.join('；')}`,
    `行动建议: ${advice.join('；')}`,
    ...(voiceAnalysis ? [
      `语音TTS: ${options.config?.enable_tts ? 'on' : 'off'} ${voiceAnalysis.stats.provider}${voiceAnalysis.stats.localReady ? '/local-ready' : ''} send=${voiceAnalysis.stats.sendMode}`,
      `语音分段: ${voiceAnalysis.parts.length}/4 清洗${voiceAnalysis.cleaned.length}字/单段${voiceAnalysis.maxChars}字${voiceAnalysis.likelyTruncated ? ' 可能截断' : ''}`,
      `语音风险: ${voiceAnalysis.risks.length ? voiceAnalysis.risks.join(' / ') : '无明显风险'}`,
      `语音预览: ${voicePreview}`,
    ] : []),
    changed ? `修复预览: ${guarded.slice(0, 180)}` : `文本预览: ${guarded.slice(0, 180)}`,
    rawQuality.ok && finalQuality.ok
      ? '判断: 这句基本能发。'
      : finalQuality.ok
        ? '判断: 原句有问题，但当前后处理能救回来。'
        : '判断: 这句还容易像模板/假来源，建议重写短一点。',
    '边界: 风格拟态不是本人原话；只有当前证据能支撑当前事实，旧缓存/无快照都要收住。',
    '参数: 加 --realtime 表示你确实有实时证据；加 --voice 按语音长度检查；也可用“待发文本 || 证据/缓存行”预检真实证据，并给出 /cs verify / /cs warm 下一步命令。',
  ].filter(Boolean);
  return lines.join('\n');
}
