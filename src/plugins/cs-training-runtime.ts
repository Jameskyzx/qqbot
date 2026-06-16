import {
  areaLabel,
  cleanTrainingText,
  clampMinutes,
  logsForUser,
  normalizeTrainingArea,
  type CsTrainingLogEntry,
  type TrainingArea,
} from './cs-training-store';
import { csMaps } from './fun-data';

export type TrainingWeaknessKey = 'death' | 'trade' | 'utility' | 'aim' | 'clutch' | 'map' | 'review';

export interface TrainingWeaknessSignal {
  key: TrainingWeaknessKey;
  label: string;
  count: number;
  minutes: number;
  sample: string;
}

export interface TrainingLogInput {
  area: TrainingArea;
  minutes: number;
  map: string;
  weapon: string;
  note: string;
}

export interface TrainingAnalysis {
  parsed: TrainingLogInput;
  weaknesses: TrainingWeaknessKey[];
}

interface TrainingCardLike {
  key: string;
  name: string;
  title: string;
}

const trainingWeaknessSpecs: Record<TrainingWeaknessKey, {
  label: string;
  patterns: RegExp[];
  advice: string;
}> = {
  death: {
    label: '死亡质量',
    patterns: [/死亡|死了|暴毙|白给|先死|首死|被抓|掉人|送了|干拉死|没换到/i],
    advice: '先截3个死亡回合，分清是干拉、被抓timing还是没等补枪；下一局只改一个死法。',
  },
  trade: {
    label: '补枪交换',
    patterns: [/补枪|交易|trade|二身位|同步|跟不上|拉不开|距离太远|换不到|没补上/i],
    advice: '把二身位距离拉到能2秒内补枪，突破时先喊“我出/你补”，别各打各的。',
  },
  utility: {
    label: '道具时机',
    patterns: [/道具|投掷物|烟|闪|火|雷|没闪|白了自己|封烟|烟没|忘丢|没丢|丢晚|丢早|nade|utility/i],
    advice: '每张图只挑2颗高频烟闪火，练到能说清目的、落点和出手时机，再进实战。',
  },
  aim: {
    label: '急停预瞄',
    patterns: [/急停|预瞄|拉枪|控枪|压枪|爆头线|枪法|定位|peek|干拉|空枪|马枪|反应/i],
    advice: '先把急停和预瞄线校准，DM里少追击杀数，多看第一枪是不是干净。',
  },
  clutch: {
    label: '残局回防',
    patterns: [/残局|回防|下包|拆包|保枪|1v\d?|clutch|postplant|时间不够|没钳/i],
    advice: '残局先数人数、道具和时间；能等队友就等，不能打就保枪，别把优势打成单挑。',
  },
  map: {
    label: '地图信息',
    patterns: [/控图|默认|中路|香蕉道|长箱|短箱|a点|b点|包点|站位|架点|信息|timing|被绕|地图理解/i],
    advice: '复盘开局30秒的信息链：谁拿空间、谁补道具、谁防绕后，先把默认打明白。',
  },
  review: {
    label: '复盘闭环',
    patterns: [/复盘|demo|录像|回看|死亡回合|截\d?|看录像|检讨/i],
    advice: '复盘别只说“枪软”，每次写一个原因和一个下局动作，第二天再看有没有复发。',
  },
};

function compactTrainingCompare(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]/g, '');
}

function detectTrainingCardName(text: string, cards: TrainingCardLike[]): string {
  const compact = compactTrainingCompare(text);
  for (const card of cards) {
    const names = [card.key, card.name, card.title.replace(/^今日CS/, '')];
    if (names.some((name) => {
      const normalized = compactTrainingCompare(name);
      return normalized && compact.includes(normalized);
    })) {
      return card.name;
    }
  }
  return '';
}

function detectTrainingWeapon(text: string): string {
  const compact = compactTrainingCompare(text);
  if (/ak|ak47|ak-47/.test(compact)) return 'AK-47';
  if (/m4|a1s|m4a1/.test(compact)) return 'M4A1-S';
  if (/awp|大狙|狙/.test(compact)) return 'AWP';
  if (/deagle|沙鹰/.test(compact)) return 'Desert Eagle';
  return detectTrainingCardName(text, csMaps as TrainingCardLike[]);
}

function detectTrainingArea(text: string): TrainingArea {
  const compact = compactTrainingCompare(text);
  if (/(复盘|demo|录像|死亡回合|回看)/.test(compact)) return 'review';
  if (/(道具|烟|闪|火|雷|投掷物|nade|utility)/i.test(text)) return 'utility';
  if (/(残局|回防|下包|保枪|1v|clutch)/i.test(text)) return 'clutch';
  if (/(定位|突破|辅助|锚点|自由人|指挥|狙击手|role)/i.test(text)) return 'role';
  if (/(实战|天梯|排位|官匹|faceit|premier|match)/i.test(text)) return 'match';
  if (/(练枪|枪法|急停|预瞄|拉枪|控枪|爆头|死斗|dm|bot|ak|awp|m4|沙鹰)/i.test(text)) return 'aim';
  if (/(地图|控图|默认|mirage|inferno|nuke|ancient|anubis|dust2|overpass)/i.test(text)) return 'map';
  return 'aim';
}

export function detectTrainingWeaknesses(text: string): TrainingWeaknessKey[] {
  const normalized = cleanTrainingText(text, 240).toLowerCase();
  if (!normalized) return [];
  return (Object.keys(trainingWeaknessSpecs) as TrainingWeaknessKey[])
    .filter((key) => trainingWeaknessSpecs[key].patterns.some((pattern) => pattern.test(normalized)));
}

function primaryTrainingWeaknessText(keys: TrainingWeaknessKey[]): string {
  return keys.map((key) => trainingWeaknessSpecs[key].label).join(' / ');
}

function weaknessLogCommand(parsed: TrainingLogInput | null): string {
  if (!parsed) return '/cstrain log 30 Mirage AK 急停';
  const noteCompact = compactTrainingCompare(parsed.note);
  const mapPart = parsed.map && !noteCompact.includes(compactTrainingCompare(parsed.map)) ? parsed.map : '';
  const weaponCompact = compactTrainingCompare(parsed.weapon);
  const weaponPart = parsed.weapon
    && !noteCompact.includes(weaponCompact)
    && !(weaponCompact === 'ak47' && noteCompact.includes('ak'))
    && !(weaponCompact === 'm4a1s' && noteCompact.includes('m4'))
    ? parsed.weapon
    : '';
  const parts = [
    '/cstrain log',
    parsed.area,
    String(parsed.minutes),
    mapPart,
    weaponPart,
    parsed.note || '',
  ].filter(Boolean);
  return cleanTrainingText(parts.join(' '), 120);
}

export function parseTrainingLogInput(args: string[]): TrainingLogInput | null {
  const raw = args.join(' ').trim();
  if (!raw) return null;
  const minutesMatch = raw.match(/(?:^|\s)(\d{1,3})(?:\s*(?:分钟|min|m))?(?=\s|$)/i);
  const minutes = minutesMatch ? clampMinutes(minutesMatch[1]) : 30;
  const withoutMinutes = minutesMatch
    ? `${raw.slice(0, minutesMatch.index).trim()} ${raw.slice((minutesMatch.index || 0) + minutesMatch[0].length).trim()}`.trim()
    : raw;
  if (!withoutMinutes && !minutesMatch) return null;
  const area = normalizeTrainingArea(args[0]);
  const detectedArea = area === 'aim' && !/^(?:aim|枪法|练枪)$/i.test(args[0] || '')
    ? detectTrainingArea(raw)
    : area;
  const map = detectTrainingCardName(raw, csMaps as TrainingCardLike[]);
  const weapon = detectTrainingWeapon(raw);
  const note = cleanTrainingText(withoutMinutes || raw, 100);
  return { area: detectedArea, minutes, map, weapon, note };
}

export function analyzeTrainingLogInput(args: string[]): TrainingAnalysis | null {
  const parsed = parseTrainingLogInput(args);
  if (!parsed) return null;
  const weaknesses = detectTrainingWeaknesses([parsed.note, parsed.map, parsed.weapon, parsed.area].join(' '));
  return { parsed, weaknesses };
}

export function collectTrainingWeaknessSignals(logs: CsTrainingLogEntry[]): TrainingWeaknessSignal[] {
  const signals = new Map<TrainingWeaknessKey, TrainingWeaknessSignal>();
  for (const log of logs) {
    const keys = detectTrainingWeaknesses([log.note, log.map, log.weapon, log.area].join(' '));
    for (const key of keys) {
      const spec = trainingWeaknessSpecs[key];
      const existing = signals.get(key);
      if (existing) {
        existing.count += 1;
        existing.minutes += log.minutes;
        if (!existing.sample && log.note) existing.sample = log.note;
      } else {
        signals.set(key, {
          key,
          label: spec.label,
          count: 1,
          minutes: log.minutes,
          sample: log.note,
        });
      }
    }
  }
  return [...signals.values()].sort((a, b) => b.count - a.count || b.minutes - a.minutes || a.label.localeCompare(b.label, 'zh-CN'));
}

export function summarizeTrainingLogs(logs: CsTrainingLogEntry[]): {
  sessions: number;
  minutes: number;
  byArea: Partial<Record<TrainingArea, number>>;
  topArea: TrainingArea | null;
  missing: TrainingArea[];
  weaknesses: TrainingWeaknessSignal[];
  recent: CsTrainingLogEntry[];
} {
  const byArea: Partial<Record<TrainingArea, number>> = {};
  let minutes = 0;
  for (const log of logs) {
    minutes += log.minutes;
    byArea[log.area] = (byArea[log.area] || 0) + log.minutes;
  }
  const topArea = (Object.entries(byArea).sort((a, b) => b[1] - a[1])[0]?.[0] || null) as TrainingArea | null;
  const missing = (['aim', 'utility', 'review', 'match'] as TrainingArea[]).filter((area) => !byArea[area]);
  return { sessions: logs.length, minutes, byArea, topArea, missing, weaknesses: collectTrainingWeaknessSignals(logs), recent: logs.slice(0, 5) };
}

export function formatTrainingWeaknessSignals(signals: TrainingWeaknessSignal[], limit = 3): string {
  return signals.slice(0, limit).map((signal) => `${signal.label}${signal.count}次`).join(' / ');
}

export function buildTrainingAdvice(summary: ReturnType<typeof summarizeTrainingLogs>): string {
  if (summary.sessions === 0) return '还没训练记录，先用 /cstrain log 30 Mirage AK 急停 记一条，后面就能按你短板调计划。';
  const topWeakness = summary.weaknesses[0];
  if (topWeakness) {
    const sample = topWeakness.sample ? `你日志里写过“${cleanTrainingText(topWeakness.sample, 28)}”，` : '';
    return `${sample}${trainingWeaknessSpecs[topWeakness.key].advice}`;
  }
  if (summary.minutes < 90) return '训练频率还偏低，先别追花活，连续三天把热身+一项重点练完。';
  if (summary.topArea === 'aim' && summary.missing.includes('utility')) return '最近练枪偏多，道具偏少；今天补一组烟闪火，别只靠枪法救坏决策。';
  if (summary.missing.includes('review')) return '最近缺复盘；今天至少截3个死亡回合，看补枪距离和道具时机。';
  if (summary.missing.includes('match')) return '最近实战记录少；练完打一局，把训练目标带进回合里，不然就是靶场幻觉。';
  if (summary.topArea === 'utility') return '最近道具有练到，今天把道具和第一枪连起来，别只会站出生点背点位。';
  return '训练结构还行，今天重点是少贪枪、练完复盘，别让训练变成打卡截图。';
}

export function buildCsTrainingHistoryHint(chatType: 'group' | 'private', chatId: number | string, userId: number): string {
  const logs = logsForUser(chatType, chatId, userId, 14);
  if (logs.length === 0) return '';
  const summary = summarizeTrainingLogs(logs);
  const areaParts = (Object.entries(summary.byArea) as [TrainingArea, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([area, minutes]) => `${areaLabel(area)}${minutes}m`)
    .join(' / ');
  const weaknessParts = formatTrainingWeaknessSignals(summary.weaknesses);
  return [
    `训练历史：近14天${summary.sessions}次/${summary.minutes}分钟${areaParts ? `，${areaParts}` : ''}`,
    weaknessParts ? `日志短板：${weaknessParts}` : '',
    `个人短板：${buildTrainingAdvice(summary)}`,
  ].filter(Boolean).join('\n');
}

export function formatTrainingLogEntry(entry: CsTrainingLogEntry): string {
  const parts = [
    areaLabel(entry.area),
    `${entry.minutes}分钟`,
    entry.map || '',
    entry.weapon || '',
  ].filter(Boolean);
  return `${parts.join(' / ')}${entry.note ? ` | ${entry.note}` : ''}`;
}

export function formatCsTrainingStats(chatType: 'group' | 'private', chatId: number | string, userId: number): string {
  const logs = logsForUser(chatType, chatId, userId, 14);
  const summary = summarizeTrainingLogs(logs);
  if (summary.sessions === 0) {
    return [
      'CS训练记录',
      '近14天还没有记录。',
      '用法：/cstrain log 30 Mirage AK 急停',
      '也可以：/cstrain log 道具 20 Inferno 烟闪',
    ].join('\n');
  }
  const areaParts = (Object.entries(summary.byArea) as [TrainingArea, number][])
    .sort((a, b) => b[1] - a[1])
    .map(([area, minutes]) => `${areaLabel(area)}${minutes}m`)
    .join(' / ');
  return [
    'CS训练记录',
    `近14天: ${summary.sessions}次 / ${summary.minutes}分钟`,
    `分布: ${areaParts}`,
    summary.weaknesses.length ? `日志短板: ${formatTrainingWeaknessSignals(summary.weaknesses)}` : '',
    `建议: ${buildTrainingAdvice(summary)}`,
    '',
    '最近记录:',
    ...summary.recent.map((entry, index) => `${index + 1}. ${formatTrainingLogEntry(entry)}`),
    '',
    '/cstrain clear 可以清空你在当前会话的训练记录',
  ].filter((line) => line !== '').join('\n');
}

export function formatCsTrainingAnalysis(analysis: TrainingAnalysis): string {
  const weaknessText = primaryTrainingWeaknessText(analysis.weaknesses) || '暂时没识别到明确短板';
  const advice = analysis.weaknesses
    .slice(0, 3)
    .map((key, index) => `${index + 1}. ${trainingWeaknessSpecs[key].advice}`);
  return [
    'CS训练日志分析',
    `识别重点: ${weaknessText}`,
    `推断分类: ${areaLabel(analysis.parsed.area)} / ${analysis.parsed.minutes}分钟${analysis.parsed.map ? ` / ${analysis.parsed.map}` : ''}${analysis.parsed.weapon ? ` / ${analysis.parsed.weapon}` : ''}`,
    analysis.parsed.note ? `原始摘要: ${analysis.parsed.note}` : '',
    advice.length ? '建议动作:' : '',
    ...advice,
    advice.length ? '' : '建议动作: 先补一句具体问题，比如“死亡多、补枪慢、没闪、回防乱”，我再给你拆训练项。',
    `要写入训练历史可以发: ${weaknessLogCommand(analysis.parsed)}`,
    '真话边界：这里只分析你发的文字日志，不读取demo/截图，也不当作实时赛事事实。',
  ].filter((line) => line !== '').join('\n');
}

export function trainingCommandUsage(): string {
  return [
    'CS训练记录用法',
    '/cstrain - 今日训练计划',
    '/cstrain log 30 Mirage AK 急停',
    '/cstrain log 道具 20 Inferno 烟闪',
    '/cstrain analyze Mirage 死亡8次 补枪距离太远 没闪',
    '/cstrain stats - 看近14天训练分布',
    '/cstrain clear - 清空当前会话你的训练记录',
  ].join('\n');
}
