import type { DailyCard, SkinCard } from './fun-data';
import {
  csClutches,
  csEconomies,
  csMaps,
  csReviews,
  csRoles,
  csShotcalls,
  csSkins,
  csTactics,
  csTeams,
  csUtilities,
  csWeapons,
} from './fun-data';
import { compactManifestValue } from './authorized-image-manifest';

export type DailyCardKind = 'team' | 'map' | 'weapon' | 'skin' | 'role' | 'loadout' | 'utility' | 'tactic' | 'clutch' | 'economy' | 'shotcall' | 'review';
export type CsImageProbeKind = DailyCardKind | 'player' | 'knife' | 'mokoko' | 'genshin' | 'all';

export interface DailyCsKindMeta {
  kind: DailyCardKind;
  scoreKey: string;
  seedKey: string;
  fuzzyKey?: string;
  label: string;
  imageTags: string[];
  commands: string[];
  naturalPattern: RegExp;
  imageProbePattern: RegExp;
  manifestAliases: string[];
  cards: DailyCard[];
}

export function normalizeDailyCsText(text: string): string {
  return text.toLowerCase().replace(/^\//, '').replace(/\s+/g, '').replace(/[：:，。！？!?、,.]/g, '');
}

export const dailyCsKindMetas: DailyCsKindMeta[] = [
  {
    kind: 'team',
    scoreKey: 'csteam',
    seedKey: 'csteam',
    fuzzyKey: 'csteam',
    label: '战队',
    imageTags: ['poster', 'stage', 'keyvisual', 'wallpaper'],
    commands: ['csteam', 'csteamday', 'todayteam', '今日队伍', '每日队伍', '抽队伍', '今日战队', '每日战队'],
    naturalPattern: /(cs队伍|cs2队伍|队伍签|战队|主队|今日队伍|每日队伍)/,
    imageProbePattern: /^(team|队伍|战队|csteam|今日队伍|今日战队)$/,
    manifestAliases: ['team', 'csteam', 'squad', '战队', '队伍', '每日战队', '今日队伍'],
    cards: csTeams,
  },
  {
    kind: 'map',
    scoreKey: 'csmap',
    seedKey: 'csmap',
    fuzzyKey: 'csmap',
    label: '地图',
    imageTags: ['map', 'scene', 'wallpaper', 'screenshot'],
    commands: ['csmap', 'mapday', 'todaymap', '今日地图', '每日地图', '抽地图'],
    naturalPattern: /(cs地图|cs2地图|地图签|今日地图|每日地图|哪张图)/,
    imageProbePattern: /^(map|地图|csmap|今日地图)$/,
    manifestAliases: ['map', 'csmap', '地图', '每日地图', '今日地图'],
    cards: csMaps,
  },
  {
    kind: 'weapon',
    scoreKey: 'csweapon',
    seedKey: 'csweapon',
    fuzzyKey: 'csweapon',
    label: '武器',
    imageTags: ['inspect', 'showcase', 'render', 'wallpaper'],
    commands: ['csweapon', 'weaponday', 'todayweapon', '今日武器', '每日武器', '抽武器', '今日枪械'],
    naturalPattern: /(cs武器|cs2武器|枪械|武器签|今日武器|每日武器|今天用什么枪)/,
    imageProbePattern: /^(weapon|gun|枪|武器|枪械|csweapon|今日武器)$/,
    manifestAliases: ['weapon', 'gun', 'csweapon', '武器', '枪', '枪械'],
    cards: csWeapons,
  },
  {
    kind: 'skin',
    scoreKey: 'csskin',
    seedKey: 'csskin',
    label: '皮肤',
    imageTags: ['inspect', 'showcase', 'skin', 'render'],
    commands: ['csskin', 'cskin', 'skinsday', 'todayskin', '今日皮肤', '每日皮肤', '抽皮肤'],
    naturalPattern: /(cs皮肤|cs2皮肤|枪皮肤|武器皮肤|皮肤签|今日皮肤|每日皮肤|今天什么皮肤)/,
    imageProbePattern: /^(skin|skins|皮肤|csskin|今日皮肤)$/,
    manifestAliases: ['skin', 'skins', 'csskin', '皮肤', '饰品'],
    cards: csSkins as SkinCard[],
  },
  {
    kind: 'role',
    scoreKey: 'csrole',
    seedKey: 'csrole',
    fuzzyKey: 'csrole',
    label: '定位',
    imageTags: ['poster', 'action', 'scene', 'wallpaper'],
    commands: ['csrole', 'roleday', 'todayrole', '今日定位', '每日定位', '抽定位', '今日位置'],
    naturalPattern: /(cs定位|cs2定位|位置|定位签|今日定位|每日定位|今天打什么位)/,
    imageProbePattern: /^(role|position|定位|位置|csrole|今日定位)$/,
    manifestAliases: ['role', 'position', 'csrole', '定位', '位置'],
    cards: csRoles,
  },
  {
    kind: 'loadout',
    scoreKey: 'csloadout',
    seedKey: 'csteam_pack',
    fuzzyKey: 'csloadout',
    label: '套餐',
    imageTags: ['poster', 'stage', 'keyvisual', 'wallpaper'],
    commands: ['csloadout', 'cspack', 'csdaily', '今日cs', '每日cs', '今日cs2', '每日cs2', '今日套餐', '每日套餐', '今日套装', '每日套装'],
    naturalPattern: /(cs套餐|cs2套餐|今日套餐|每日套餐|今日套装|每日套装|今天怎么打|今天打啥)/,
    imageProbePattern: /^(loadout|pack|套餐|套装|今日cs|csloadout)$/,
    manifestAliases: ['loadout', 'pack', 'package', '套餐', '套装', '今日cs'],
    cards: csTeams,
  },
  {
    kind: 'utility',
    scoreKey: 'csutility',
    seedKey: 'csutility',
    fuzzyKey: 'csutility',
    label: '道具',
    imageTags: ['utility', 'lineup', 'scene', 'showcase'],
    commands: ['csutility', 'csnade', 'todaynade', '今日道具', '每日道具', '抽道具', '今日投掷物'],
    naturalPattern: /(cs道具|cs2道具|投掷物|道具签|今日道具|每日道具|今天丢什么)/,
    imageProbePattern: /^(utility|nade|道具|投掷物|csutility)$/,
    manifestAliases: ['utility', 'nade', 'grenade', 'csutility', '道具', '投掷物'],
    cards: csUtilities,
  },
  {
    kind: 'tactic',
    scoreKey: 'cstactic',
    seedKey: 'cstactic',
    fuzzyKey: 'cstactic',
    label: '战术',
    imageTags: ['tactic', 'scene', 'poster', 'action'],
    commands: ['cstactic', 'csstrat', 'todaystrat', '今日战术', '每日战术', '抽战术'],
    naturalPattern: /(cs战术|cs2战术|战术签|今日战术|每日战术|今天怎么打|今天打什么战术)/,
    imageProbePattern: /^(tactic|strat|战术|cstactic)$/,
    manifestAliases: ['tactic', 'strat', 'strategy', 'cstactic', '战术'],
    cards: csTactics,
  },
  {
    kind: 'clutch',
    scoreKey: 'csclutch',
    seedKey: 'csclutch',
    fuzzyKey: 'csclutch',
    label: '残局',
    imageTags: ['clutch', 'action', 'scene', 'poster'],
    commands: ['csclutch', 'todayclutch', '今日残局', '每日残局', '抽残局'],
    naturalPattern: /(cs残局|cs2残局|残局签|今日残局|每日残局|今天残局|残局怎么打)/,
    imageProbePattern: /^(clutch|残局|csclutch)$/,
    manifestAliases: ['clutch', 'csclutch', '残局'],
    cards: csClutches,
  },
  {
    kind: 'economy',
    scoreKey: 'cseconomy',
    seedKey: 'cseconomy',
    fuzzyKey: 'cseconomy',
    label: '经济局',
    imageTags: ['economy', 'buy-menu', 'strategy', 'poster'],
    commands: ['cseco', 'cseconomy', 'csmoney', 'todayeco', '今日经济', '每日经济', '今日经济局', '每日经济局', '抽经济局'],
    naturalPattern: /(cs经济|cs2经济|经济局|经济签|今日经济|每日经济|今天怎么买|今天起什么|eco)/,
    imageProbePattern: /^(economy|eco|经济|经济局|cseco|cseconomy)$/,
    manifestAliases: ['economy', 'eco', 'money', 'cseco', 'cseconomy', '经济', '经济局'],
    cards: csEconomies,
  },
  {
    kind: 'shotcall',
    scoreKey: 'csshotcall',
    seedKey: 'csshotcall',
    fuzzyKey: 'csshotcall',
    label: '指挥口令',
    imageTags: ['igl', 'tactic', 'comms', 'poster'],
    commands: ['cscall', 'csshotcall', 'csigl', 'todaycall', '今日指挥', '每日指挥', '今日口令', '每日口令', '今日指挥口令'],
    naturalPattern: /(cs指挥|cs2指挥|指挥口令|口令签|今日指挥|每日指挥|今日口令|每日口令|今天怎么指挥)/,
    imageProbePattern: /^(shotcall|call|iglcall|指挥|口令|指挥口令|cscall|csshotcall)$/,
    manifestAliases: ['shotcall', 'call', 'iglcall', 'cscall', 'csshotcall', '指挥', '口令', '指挥口令'],
    cards: csShotcalls,
  },
  {
    kind: 'review',
    scoreKey: 'csreview',
    seedKey: 'csreview',
    fuzzyKey: 'csreview',
    label: '复盘切片',
    imageTags: ['demo', 'review', 'timeline', 'poster'],
    commands: ['csreview', 'csdemo', 'todayreview', '今日复盘', '每日复盘', '今日demo', '每日demo', '今日切片', '每日切片'],
    naturalPattern: /(cs复盘|cs2复盘|demo|切片|复盘签|今日复盘|每日复盘|今日demo|每日demo|今天复盘什么)/,
    imageProbePattern: /^(review|demo|复盘|切片|复盘切片|csreview|csdemo)$/,
    manifestAliases: ['review', 'demo', 'vod', 'csreview', 'csdemo', '复盘', 'demo复盘', '切片'],
    cards: csReviews,
  },
];

const dailyCsKindMetaByKind = new Map<DailyCardKind, DailyCsKindMeta>(dailyCsKindMetas.map((meta) => [meta.kind, meta]));

export function dailyCsMetaFor(kind: DailyCardKind): DailyCsKindMeta {
  const meta = dailyCsKindMetaByKind.get(kind);
  if (!meta) throw new Error(`unknown daily CS kind: ${kind}`);
  return meta;
}

export function dailyCsCardsFor(kind: DailyCardKind): DailyCard[] {
  return dailyCsMetaFor(kind).cards;
}

export function normalizeCsImageKind(input: string): CsImageProbeKind {
  const text = normalizeDailyCsText(input || '');
  if (/^(all|全部|全量|所有)$/.test(text)) return 'all';
  if (/^(player|选手|csplayer|今日选手)$/.test(text)) return 'player';
  if (/^(knife|刀|发刀|csknife|今日发刀)$/.test(text)) return 'knife';
  if (/^(mokoko|木柜子|mygo|avemujica|角色|每日木柜子)$/.test(text)) return 'mokoko';
  if (/^(genshin|ys|原神|原神角色|每日原神)$/.test(text)) return 'genshin';
  const meta = dailyCsKindMetas.find((item) => item.imageProbePattern.test(text));
  return meta?.kind || 'team';
}

export function isDailyCardRequest(command: string | null, rawText: string, kind: DailyCardKind): boolean {
  const meta = dailyCsMetaFor(kind);
  if (command && meta.commands.includes(command)) return true;
  const text = normalizeDailyCsText(rawText);
  if (!text) return false;
  if (kind === 'loadout' && ['今日cs', '每日cs', '今天cs', '今日cs2', '每日cs2', '今天cs2'].includes(text)) return true;
  const hasDaily = /(抽|今日|每日|今天|本日|来个|给我来个)/.test(text);
  if (!hasDaily) return false;
  return meta.naturalPattern.test(text);
}

export const dailyImageKindAliases: Record<string, string[]> = {
  player: ['player', 'csplayer', 'dailyplayer', '选手', '每日选手', '今日选手'],
  knife: ['knife', 'csknife', '刀', '发刀', '刀皮'],
  mokoko: ['mokoko', 'mygo', 'avemujica', 'bandori', '木柜子', '迷子', '母鸡卡'],
  genshin: ['genshin', 'ys', '原神', '提瓦特'],
  duel: ['duel', 'dailyduel', '紫禁之巅', '决战'],
  fact: ['fact', 'cold', 'coldfact', '冷知识'],
  book: ['book', 'excerpt', '书摘'],
  poem: ['poem', '古诗词', '诗词'],
};

for (const meta of dailyCsKindMetas) dailyImageKindAliases[meta.kind] = meta.manifestAliases;

export function imageKindAliases(kind: string): string[] {
  const normalized = compactManifestValue(kind);
  const aliases = dailyImageKindAliases[normalized] || [normalized];
  return [...new Set([normalized, ...aliases.map(compactManifestValue)])].filter(Boolean);
}
