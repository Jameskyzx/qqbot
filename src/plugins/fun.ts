import * as fs from 'fs';
import * as path from 'path';
import { MessageSegment, Plugin, PluginContext } from '../types';
import { createLogger } from '../logger';
import { getRandomKnowledgeLine } from './knowledge-base';
import { getCacheStats, getImageDataUrl } from './image-cache';
import { webSearch } from './web-search';
import { fetchOngoingMatches, fetchTeamRanking, fetchRecentResults } from './hltv-api';
import { detectFuzzyCommand } from './fuzzy-command';
import { getLiquipediaImageStats, resolvePlayerImage, resolveTeamImage } from './liquipedia-image';
import { resolveFandomFileImage, resolveFandomPageImage } from './fandom-image';
import { getCsgoSkinsApiStats, resolveCsgoSkinImage } from './csgo-skins-api';
import { buildDailyCardImageDataUrl, type DailyCardImageKind } from './daily-card-image';
import {
  dailyCsKindMetas,
  dailyCsMetaFor,
  imageKindAliases,
  isDailyCardRequest,
  normalizeCsImageKind,
  type CsImageProbeKind,
  type DailyCardKind,
} from './daily-cs-metadata';
import {
  compactDailyImageFields,
  dailyImagePairSecondSlugCandidates,
  dailyImageSlugCandidates,
  dailyLocalPackCardsFromDirs,
  manifestSearchValues,
  preferBeautyManifestImages,
  uniqueManifestCardsByUrl,
} from './daily-image-matching';
import { getCsPredictTrainingHint } from './cs-predict';
import { buildUserProfileDailyCsHint } from './user-profile';
import {
  cleanTrainingText,
  clearTrainingLogs,
  loadTrainingStore,
  saveTrainingStore,
  setTrainingStorePathForTests,
  type CsTrainingLogEntry,
  type TrainingArea,
} from './cs-training-store';
import {
  analyzeTrainingLogInput,
  buildCsTrainingHistoryHint,
  detectTrainingWeaknesses,
  formatCsTrainingAnalysis,
  formatCsTrainingStats,
  formatTrainingLogEntry,
  parseTrainingLogInput,
  trainingCommandUsage,
  type TrainingLogInput,
} from './cs-training-runtime';
import {
  csPlayers,
  csTeams,
  csMaps,
  csWeapons,
  csRoles,
  csUtilities,
  csTactics,
  csClutches,
  csEconomies,
  csShotcalls,
  csReviews,
  csSkins,
  csKnives,
  knifeSkins,
  knifeSkinAvailableFor,
  knifeSkinPoolFor,
  dailyCharacters,
  dailyGenshinCharacters,
  dailyFacts,
  dailyBookExcerpts,
  dailyPoems,
  dailyMovieQuotes,
  dailyMusicFacts,
  dailyHistoryEvents,
  dailyScienceFacts,
  duelWeapons,
} from './fun-data';
import {
  type AuthorizedImageManifestCard,
  clearImageManifestCache,
  compactManifestValue,
  getImageManifestSignature,
  getImageManifestCacheStats,
  loadImageManifest,
  loadImageManifestByKinds,
} from './authorized-image-manifest';

const logger = createLogger('Fun');

function randomPick(items: string[]): string {
  return items[Math.floor(Math.random() * items.length)];
}

function styleLine(): string {
  return getRandomKnowledgeLine('style') || randomPick([
    '这波有说法',
    '可以 有点东西',
    '我晕了 这也能开出来',
    '先别急 看结果',
  ]);
}

interface CSPlayer {
  nick: string;
  name: string;
  team: string;
  role: string;
  note: string;
  style?: string;
  avoid?: string;
  image: string;
  imageSource: 'liquipedia' | 'wikimedia';
  aliases?: string[];
  tags?: string[];
}

interface DailyCard {
  key: string;
  title: string;
  name: string;
  subtitle: string;
  scoreLabel: string;
  advice: string;
  avoid: string;
  line: string;
  image?: string;
  imageLabel?: string;
  liquipediaPage?: string;
  playerImageFallback?: string;
  fandomFile?: string;
  fandomPage?: string;
}

type CsQuizKind = 'map' | 'weapon' | 'utility' | 'tactic' | 'clutch';

type FandomWiki = 'counterstrike' | 'bandori' | 'genshin';

const DAILY_BEAUTY_MIN_IMAGES_PER_ITEM = 200;
const DAILY_IMAGE_CANDIDATE_LIMIT = 200;
const DAILY_BEAUTY_MATCH_CACHE_MAX = 6000;

interface SkinCard extends DailyCard {
  weapon: string;
  rarity: string;
}

interface KnifeCard extends DailyCard {
  aliases: string[];
  skinFilePrefixes: string[];
}

interface KnifeSkin {
  key: string;
  name: string;
  rarity: string;
  advice: string;
  avoid: string;
  line: string;
  fileSuffixes: string[];
}

interface DailyCharacter {
  key: string;
  title: string;
  name: string;
  band: 'MyGO!!!!!' | 'Ave Mujica';
  role: string;
  voice: string;
  note: string;
  page: string;
  file?: string;
  aliases?: string[];
  era?: string;
  imageMood?: string;
}

interface DailyGenshinCharacter {
  key: string;
  title: string;
  name: string;
  page: string;
  note: string;
  tag: string;
  cn?: string;
  element?: string;
  region?: string;
  weapon?: string;
  aliases?: string[];
}

interface DailyTextCard {
  key: string;
  title: string;
  name: string;
  subtitle: string;
  body: string;
  advice: string;
  line: string;
  scoreLabel: string;
}

interface DailyDuelWeapon {
  key: string;
  name: string;
  style: string;
  power: number;
  tempo: number;
  line: string;
  image?: string;
  fandomFile?: string;
}

type BestdoriCardImage = AuthorizedImageManifestCard;

interface DailyImageManifestTarget {
  kind: string;
  label: string;
  count: number;
  ok: boolean;
  minImages: number;
  fields: Record<string, string>;
  tags: string[];
}

interface ImageCandidate {
  url: string;
  label: string;
  source:
    | 'liquipedia-team'
    | 'csgo-api-skin'
    | 'fandom-page'
    | 'fandom-file'
    | 'representative-player-dynamic'
    | 'representative-player-static'
    | 'liquipedia-player'
    | 'bestdori-card'
    | 'authorized-image'
    | 'static-url';
}

interface CsQuiz {
  kind: CsQuizKind;
  title: string;
  context: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  answer: string;
  comment: string;
  score: number;
}

let imageDataUrlResolver: (url: string) => Promise<string | null> = getImageDataUrl;
let playerImageResolver: (player: string) => Promise<string | null> = resolvePlayerImage;
let teamImageResolver: (page: string, teamName: string) => Promise<string | null> = resolveTeamImage;
let fandomImageResolver: (filename: string, wiki?: FandomWiki) => Promise<string | null> = resolveFandomFileImage;
let fandomPageImageResolver: (title: string, wiki?: FandomWiki) => Promise<string | null> = resolveFandomPageImage;
let csgoSkinImageResolver: (weapon: string, skin: string) => Promise<string | null> = resolveCsgoSkinImage;

function trainingDisplayName(ctx: PluginContext): string {
  return cleanTrainingText(ctx.event.sender.card || ctx.event.sender.nickname || `user${ctx.event.user_id}`, 24);
}

function addTrainingLog(ctx: PluginContext, parsed: TrainingLogInput): CsTrainingLogEntry {
  const store = loadTrainingStore();
  const createdAt = Date.now();
  const entry: CsTrainingLogEntry = {
    id: `${createdAt.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    chatType: ctx.chatType,
    chatId: Number(ctx.chatId),
    groupId: ctx.groupId,
    userId: ctx.event.user_id,
    displayName: trainingDisplayName(ctx),
    area: parsed.area,
    minutes: parsed.minutes,
    map: parsed.map,
    weapon: parsed.weapon,
    note: parsed.note,
    createdAt,
  };
  store.logs.push(entry);
  saveTrainingStore(store);
  return entry;
}

function todayKey(): string {
  return new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
}

function dailySeedForKind(kind: string, userId: number, scopeId: number = 0): number {
  return Math.abs(hashCode(`${todayKey()}_${kind}_${scopeId}_${userId}`));
}

function dailyPlayerFor(userId: number, groupId: number = 0): CSPlayer {
  const seed = dailySeedForKind('csplayer', userId, groupId);
  return csPlayers[seed % csPlayers.length];
}

function dailyPlayerScore(userId: number, groupId: number = 0): number {
  return (dailySeedForKind('csplayer_score', userId, groupId) % 100) + 1;
}

function dailyCardFor(kind: string, userId: number, scopeId: number, cards: DailyCard[]): DailyCard {
  return cards[dailySeedForKind(kind, userId, scopeId) % cards.length];
}

function dailySkinFor(userId: number, scopeId: number): SkinCard {
  return csSkins[dailySeedForKind('csskin', userId, scopeId) % csSkins.length];
}

function dailyKnifeFor(userId: number, scopeId: number): KnifeCard {
  return csKnives[dailySeedForKind('csknife', userId, scopeId) % csKnives.length];
}

function dailyKnifeSkinFor(userId: number, scopeId: number, knife?: KnifeCard): KnifeSkin {
  const selectedKnife = knife || dailyKnifeFor(userId, scopeId);
  const pool = knifeSkinPoolFor(selectedKnife);
  return pool[dailySeedForKind(`csknife_skin_${selectedKnife.key}`, userId, scopeId) % pool.length];
}

function dailyCharacterFor(userId: number, scopeId: number): DailyCharacter {
  return dailyCharacters[dailySeedForKind('mokoko', userId, scopeId) % dailyCharacters.length];
}

function dailyGenshinFor(userId: number, scopeId: number): DailyGenshinCharacter {
  return dailyGenshinCharacters[dailySeedForKind('genshin', userId, scopeId) % dailyGenshinCharacters.length];
}

function dailyFactFor(userId: number, scopeId: number): DailyTextCard {
  return dailyFacts[dailySeedForKind('daily_fact', userId, scopeId) % dailyFacts.length];
}

function dailyBookExcerptFor(userId: number, scopeId: number): DailyTextCard {
  return dailyBookExcerpts[dailySeedForKind('daily_book', userId, scopeId) % dailyBookExcerpts.length];
}

function dailyPoemFor(userId: number, scopeId: number): DailyTextCard {
  return dailyPoems[dailySeedForKind('daily_poem', userId, scopeId) % dailyPoems.length];
}

function dailyMovieQuoteFor(userId: number, scopeId: number): DailyTextCard {
  return dailyMovieQuotes[dailySeedForKind('daily_movie', userId, scopeId) % dailyMovieQuotes.length];
}

function dailyMusicFactFor(userId: number, scopeId: number): DailyTextCard {
  return dailyMusicFacts[dailySeedForKind('daily_music', userId, scopeId) % dailyMusicFacts.length];
}

function dailyHistoryEventFor(userId: number, scopeId: number): DailyTextCard {
  return dailyHistoryEvents[dailySeedForKind('daily_history', userId, scopeId) % dailyHistoryEvents.length];
}

function dailyScienceFactFor(userId: number, scopeId: number): DailyTextCard {
  return dailyScienceFacts[dailySeedForKind('daily_science', userId, scopeId) % dailyScienceFacts.length];
}

function dailyDuelPlayerWeaponFor(userId: number, scopeId: number): DailyDuelWeapon {
  return duelWeapons[dailySeedForKind('daily_duel_user_weapon', userId, scopeId) % duelWeapons.length];
}

function dailyDuelBotWeaponFor(userId: number, scopeId: number): DailyDuelWeapon {
  return duelWeapons[dailySeedForKind('daily_duel_bot_weapon', userId, scopeId) % duelWeapons.length];
}

function dailyScoreForKind(kind: string, userId: number, scopeId: number): number {
  return (dailySeedForKind(`${kind}_score`, userId, scopeId) % 100) + 1;
}

function scoreLine(score: number): string {
  if (score >= 95) return '签位：神中神';
  if (score >= 80) return '签位：很能打';
  if (score >= 60) return '签位：有说法';
  if (score >= 35) return '签位：先稳一手';
  return '签位：今天收着点';
}

function scoreAdvice(score: number): string {
  if (score >= 90) return '今天可以主动要空间，但别赢一回合就开香槟。';
  if (score >= 75) return '节奏可以稍微提一点，关键是补枪别掉。';
  if (score >= 55) return '正常打就行，别急着证明自己。';
  if (score >= 35) return '先把默认和信息打明白，别上来就赌。';
  return '今天少硬拉，多等队友，先把回合打完整。';
}

function dailyPick<T>(items: T[], kind: string, userId: number, scopeId: number = 0): T {
  return items[dailySeedForKind(kind, userId, scopeId) % items.length];
}

function dailyExecutionLines(kind: string, label: string, userId: number, scopeId: number): string[] {
  const rhythm = dailyPick([
    '先稳住信息，再做动作',
    '少一点即兴，多一点闭环',
    '先把基本盘打满，再找节目效果',
    '慢半拍观察，快半拍执行',
    '今天不靠嘴硬，靠一次小完成',
  ], `${kind}:rhythm`, userId, scopeId);
  const action = dailyPick([
    `围绕「${label}」做一个 15 分钟小任务，做完就收，不要开无限支线。`,
    `把「${label}」拆成一个能马上执行的动作，别停在收藏和感叹。`,
    `今天只抓一个关键词：${label}。先记下来，晚上看它有没有真的出现。`,
    `用「${label}」给今天定一个小规则：少说空话，多留证据。`,
    `如果今天状态散，就回到「${label}」这条线，别让注意力乱飘。`,
  ], `${kind}:action:${label}`, userId, scopeId);
  const checkpoint = dailyPick([
    '验收标准：能说清今天做了什么、少踩了哪个坑。',
    '验收标准：晚上复盘时能写出一句具体变化。',
    '验收标准：不是看起来很忙，而是有一个小结果。',
    '验收标准：别靠感觉结账，留一句记录。',
    '验收标准：如果没完成，至少知道卡在哪一步。',
  ], `${kind}:checkpoint`, userId, scopeId);
  return [`今日节奏：${rhythm}`, `今日动作：${action}`, checkpoint];
}

function buildGenshinRichLines(character: DailyGenshinCharacter, score: number, userId: number, scopeId: number): string[] {
  const elementTipMap: Record<string, string> = {
    火: '元素提示：火系签偏主动，今天适合把拖着的事点燃一下，但别烧穿资源。',
    水: '元素提示：水系签偏流转，今天重点看循环、回复和衔接，不要单点硬冲。',
    风: '元素提示：风系签偏机动，今天适合整理路线、扩散信息、把散事卷起来。',
    雷: '元素提示：雷系签偏节奏，今天适合提速处理卡点，但别被情绪导电。',
    草: '元素提示：草系签偏反应链，今天适合补底层条件，等它自己开花。',
    冰: '元素提示：冰系签偏控制，今天先降温再判断，别在上头时做决定。',
    岩: '元素提示：岩系签偏结构，今天把护盾、底盘和长期资源先垒好。',
  };
  const weaponTipMap: Record<string, string> = {
    单手剑: '武器提示：单手剑签讲究手感和节奏，今天别贪一口气打完。',
    双手剑: '武器提示：双手剑签适合处理重任务，先蓄力，再落下。',
    长柄武器: '武器提示：长柄签看站位和距离，今天别把节奏捅得太散。',
    弓: '武器提示：弓签适合远距离规划，先瞄准关键点，不用处处贴脸。',
    法器: '武器提示：法器签偏机制和循环，今天别只看面板，看看触发条件。',
  };
  const route = dailyPick([
    '清树脂 -> 做一段探索 -> 整理背包',
    '补天赋材料 -> 检查武器等级 -> 留一点摩拉',
    '先跑委托 -> 再清周常 -> 最后看尘歌壶',
    '配队试转一轮 -> 看循环卡点 -> 只改一个变量',
    '先看任务列表 -> 清一个旧坑 -> 不开三个新坑',
    '打本前先确认浓缩树脂，别进本才发现资源尴尬',
  ], `genshin:route:${character.key}`, userId, scopeId);
  const focus = dailyPick([
    '培养顺序别乱，等级、武器、天赋、圣遗物按短板补。',
    '今天别被词条上头牵走，先保主词条和套装逻辑。',
    '探索时先标点，别靠记忆和方向感硬撑。',
    '深渊前先热手一轮，别把第一间当试错场。',
    '剧情任务慢慢读，别把世界观当跳过按钮。',
    '抽卡前先看原石和计划，这条签不是消费建议。',
  ], `genshin:focus:${character.key}`, userId, scopeId);
  const scoreMood = score >= 80 ? '今天共鸣很高，适合主动推进一个旧目标。'
    : score >= 55 ? '今天共鸣中等，稳扎稳打就有收益。'
      : '今天共鸣偏保守，适合清小事、留资源、少上头。';
  return [
    character.region ? `地区氛围：${character.region} 线索，今天按这个气质挑一个小目标。` : '',
    character.element ? elementTipMap[character.element] || `元素提示：${character.element} 签，今天先看机制再看热闹。` : '',
    character.weapon ? weaponTipMap[character.weapon] || `武器提示：${character.weapon} 签，打法别只看表面。` : '',
    `今日路线：${route}`,
    `养成重点：${focus}`,
    `共鸣解读：${scoreMood}`,
    ...dailyExecutionLines('genshin', character.name, userId, scopeId),
  ].filter(Boolean);
}

function buildMokokoRichLines(character: DailyCharacter, score: number, userId: number, scopeId: number): string[] {
  const stage = dailyPick([
    '今天适合把话说慢一点，先确认情绪再确认结论。',
    '今天适合做个靠谱队友，别把压力全丢给别人猜。',
    '今天适合留一个小台阶，别把关系推进死胡同。',
    '今天适合把该回的消息回掉，拖太久会变成新问题。',
    '今天适合认真听完一句话，再决定要不要反驳。',
  ], `mokoko:stage:${character.key}`, userId, scopeId);
  const bandCue = character.band === 'MyGO!!!!!'
    ? 'MyGO!!!!!签偏真实感：别急着体面，先把想法说清。'
    : 'Ave Mujica签偏舞台感：气势可以有，但别把自己藏太深。';
  const mood = score >= 80 ? '今天角色气场很足，可以主动开一个话题。'
    : score >= 55 ? '今天适合正常发挥，别突然消失。'
      : '今天先稳住边界，少做临场情绪决策。';
  return [
    `乐队提示：${bandCue}`,
    character.era ? `关系线提示：${character.era}，今天别只看舞台结果，也看前因后果。` : '',
    character.imageMood ? `卡面方向：优先 ${character.imageMood}；本地 Bestdori 卡面越多越好看。` : '',
    `今日场景：${stage}`,
    `指数解读：${mood}`,
    ...dailyExecutionLines('mokoko', character.name, userId, scopeId),
  ].filter(Boolean);
}

function dailyTextKindName(kind: string): string {
  if (kind === 'fact') return '冷知识';
  if (kind === 'book') return '书摘';
  if (kind === 'poem') return '古诗词';
  return '日签';
}

function buildDailyTextRichLines(kind: string, card: DailyTextCard, score: number, userId: number, scopeId: number): string[] {
  const kindName = dailyTextKindName(kind);
  const lens = kind === 'fact'
    ? dailyPick([
      '从机制看，不要只记结论。',
      '从反直觉点看，先问它违反了哪条日常经验。',
      '从应用看，这个知识能解释一个生活里的小现象。',
      '从历史和材料看，很多怪事都有很现实的成本。',
      '从观察方式看，换个尺度答案会变。',
    ], `text:${kind}:lens:${card.key}`, userId, scopeId)
    : kind === 'book'
      ? dailyPick([
        '先读字面，再读它在今天能落到哪里。',
        '不要把古句当摆设，给它找一个今天的动作。',
        '把这句当提醒，不当命令。',
        '读它的气质，也读它的限制。',
        '好句子别只收藏，今天拿来用一次。',
      ], `text:${kind}:lens:${card.key}`, userId, scopeId)
      : dailyPick([
        '先抓画面，再抓情绪。',
        '先看时间、地点、动作，再看心事。',
        '诗词不是答案，是给今天换一个镜头。',
        '把一句诗放进今天的天气里试试看。',
        '读慢一点，让画面自己出来。',
      ], `text:${kind}:lens:${card.key}`, userId, scopeId);
  const question = dailyPick([
    `追问：${card.name} 这条最反常的地方是什么？`,
    `追问：如果把它放到今天，最该提醒你的是什么？`,
    `追问：这条${kindName}能不能解释你最近遇到的一件小事？`,
    `追问：你会把它讲给谁听，为什么是那个人？`,
    `追问：它的关键词如果只留两个，会是哪两个？`,
  ], `text:${kind}:question:${card.key}`, userId, scopeId);
  const scoreMood = score >= 80 ? '今天很适合拿来开话题。'
    : score >= 55 ? '今天适合当一个小提醒。'
      : '今天适合轻轻看一眼，不必硬悟。';
  return [
    `阅读角度：${lens}`,
    `分数解读：${scoreMood}`,
    question,
    ...dailyExecutionLines(kind, card.name, userId, scopeId),
  ];
}

function buildCsPlayerRichLines(player: CSPlayer, score: number | undefined, userId: number, scopeId: number): string[] {
  const trigger = dailyPick([
    '第一波别急着找击杀，先确认队友补枪距离。',
    '今天盯一个死亡回合，别打完就忘。',
    '如果开局不顺，先降速拿信息，不要连续赌。',
    '优势局别急着上嘴脸，先把人数优势兑现。',
    '今天每次转点前多问一句：信息够不够。',
  ], `player:trigger:${player.nick}`, userId, scopeId);
  const roleLine = /awp|狙/i.test(player.role)
    ? '狙位提示：第一枪可以慢，换位必须快。'
    : /igl|指挥/i.test(player.role)
      ? '指挥提示：先把默认讲清楚，再谈临场变招。'
      : /support|anchor|辅助|包点/i.test(player.role)
        ? '团队提示：脏活不丢人，站住包点就是价值。'
        : '步枪提示：正面可以硬，但别把补枪链拉断。';
  const scoreMood = typeof score === 'number' ? scoreAdvice(score) : '今天按签位风格来一小局就行。';
  return [
    roleLine,
    `今日触发器：${trigger}`,
    `状态解读：${scoreMood}`,
    ...dailyExecutionLines('csplayer', player.nick, userId, scopeId),
  ];
}

function buildDuelRichLines(userWeapon: DailyDuelWeapon, botWeapon: DailyDuelWeapon, outcome: ReturnType<typeof duelOutcome>, userId: number, scopeId: number): string[] {
  const verb = dailyPick([
    '手撕',
    '架死',
    '贴脸带走',
    '反手教育',
    '极限翻盘',
    '节目效果拉满',
    '一波打穿',
    '靠气势硬吃',
  ], `duel:verb:${userWeapon.key}:${botWeapon.key}`, userId, scopeId);
  const scene = outcome.winner === 'user'
    ? `名场面：你用 ${userWeapon.name} ${verb} 机器的 ${botWeapon.name}，紫禁之巅今天你站中间。`
    : outcome.winner === 'bot'
      ? `名场面：机器用 ${botWeapon.name} ${verb} 你的 ${userWeapon.name}，这把素材味有点重。`
      : `名场面：${userWeapon.name} 和 ${botWeapon.name} 对到最后同时沉默，裁判都不知道怎么圆。`;
  const swing = dailyPick([
    '胜负手：出手时机比武器面板更关键。',
    '胜负手：谁先露破绽，谁就先变成背景板。',
    '胜负手：今天不是比伤害，是比谁更不慌。',
    '胜负手：距离感决定一切，近了远了都要命。',
    '胜负手：气势很重要，但最后还得看命中。',
  ], `duel:swing:${userWeapon.key}:${botWeapon.key}`, userId, scopeId);
  const rematch = dailyPick([
    '复仇建议：明天换个角度开，不要用同一套嘴硬。',
    '复仇建议：先练预瞄，再谈玄学。',
    '复仇建议：把今天的败因写成一句话，别只喊不服。',
    '复仇建议：如果赢了也别太飘，紫禁之巅每天刷新。',
    '复仇建议：输赢都算节目效果，别把心态打没。',
  ], `duel:rematch:${userWeapon.key}:${botWeapon.key}`, userId, scopeId);
  return [scene, swing, rematch];
}

function sourceName(source: CSPlayer['imageSource']): string {
  return source === 'liquipedia' ? 'Liquipedia' : 'Wikimedia';
}

function compactBriefBlock(title: string, value: string, maxChars: number): string {
  const cleaned = (value || '').replace(/\n{3,}/g, '\n\n').trim();
  if (!cleaned) return `${title}: 暂无准信`;
  return [`【${title}】`, cleaned.slice(0, maxChars)].join('\n');
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => {
      const timer = setTimeout(() => resolve(fallback), timeoutMs);
      timer.unref();
    }),
  ]);
}

async function buildCsBrief(): Promise<string> {
  const [matches, results, ranking] = await Promise.all([
    withTimeout(fetchOngoingMatches().catch(() => ''), 6500, ''),
    withTimeout(fetchRecentResults().catch(() => ''), 6500, ''),
    withTimeout(fetchTeamRanking().catch(() => ''), 6500, ''),
  ]);
  const pulledAt = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
  return [
    `CS短报 | ${pulledAt}`,
    compactBriefBlock('当前/即将比赛', matches, 700),
    compactBriefBlock('最近赛果', results, 650),
    compactBriefBlock('排名快照', ranking, 500),
    '机器短评：实时东西会变，开喷前先看来源时间，别拿旧数据硬打新版本。',
  ].join('\n\n');
}

function buildSceneTemplate(query: string): string {
  const line = getRandomKnowledgeLine('scene', query) || getRandomKnowledgeLine('style', query);
  if (!line) return '场景库暂时没货。把授权切片笔记放 knowledge/inbox/，再用 /kb ingest 进候选。';
  const blueprint = sceneBlueprintFor(query, line);
  const topic = query.trim() || blueprint.label;
  return [
    `直播场景 | ${topic}`,
    `触发：${blueprint.trigger}`,
    `反应：${blueprint.reaction}`,
    `判断：${blueprint.judgment}`,
    `短句：${blueprint.shortLines.join(' / ')}`,
    `素材：${line}`,
    '禁用：不要当逐字原话；不要长段复述；事实、赛果、阵容、转会先看实时来源。',
  ].join('\n');
}

interface SceneBlueprint {
  label: string;
  trigger: string;
  reaction: string;
  judgment: string;
  shortLines: string[];
}

function normalizeSceneQuery(input: string): string {
  return input.toLowerCase().replace(/^\//, '').replace(/\s+/g, '').replace(/[：:，。！？!?、,.]/g, '');
}

function sceneBlueprintFor(query: string, sourceLine: string): SceneBlueprint {
  const text = `${normalizeSceneQuery(query)} ${normalizeSceneQuery(sourceLine)}`;
  if (/礼物|老板|gift|舰长|醒目|sc|superchat/.test(text)) {
    return {
      label: '礼物感谢',
      trigger: '群友送礼、连送或大额礼物，需要先点名感谢，再接一个 CS 经济梗。',
      reaction: '先短感谢，不谄媚；数量多再抬强度，最后轻轻玩梗收住。',
      judgment: '这是拟态感谢模板，不说成现实直播原话，也不假装平台真的收款。',
      shortLines: ['老板大气', '这波经济补上了', '火力支援到了'],
    };
  }
  if (/白给|送|eco|经济|强起|保枪/.test(text)) {
    return {
      label: '经济局白给',
      trigger: '经济劣势、单走送枪、补枪距离断，或者优势方打成逐个白给。',
      reaction: '第一句先压住“这波不对劲”，第二句点出送在哪，第三句给可执行判断。',
      judgment: '穷不是白给的理由；短枪要靠道具和补枪，优势方也别一个人开香槟。',
      shortLines: ['先别急', '这枪送得太干脆了', '穷不是白给的理由'],
    };
  }
  if (/残局|clutch|1v|一打|回防|拆包|下包/.test(text)) {
    return {
      label: '残局处理',
      trigger: '1vX、回防、时间压力、假拆真拉、包点信息不完整。',
      reaction: '先报人数和时间，再说信息差，最后评价这波是纪律赢还是操作硬抬。',
      judgment: '残局别急着找人头，先确认包点、时间和对方可能位置。',
      shortLines: ['别急找人', '信息先拿明白', '这把靠纪律赢'],
    };
  }
  if (/道具|烟|闪|火|雷|utility|投掷|封烟/.test(text)) {
    return {
      label: '道具失误',
      trigger: '烟闪火雷没服务 timing，闪到队友，封烟反而帮对面。',
      reaction: '先说可见失误，再解释这颗道具本来该服务谁，最后给一句复盘建议。',
      judgment: '道具是好道具，人得会用；别把节目效果打成回合成本。',
      shortLines: ['这烟对面笑了', '道具是好道具', '人要会用'],
    };
  }
  if (/优势|翻盘|开香槟|被翻|逆转|comeback/.test(text)) {
    return {
      label: '优势被翻',
      trigger: '人数、经济或比分领先后开始松，补枪/清点/道具交换断掉。',
      reaction: '先提醒先别开香槟，再点出哪个环节开始不对劲，最后给回合纪律。',
      judgment: 'CS 最怕觉得稳；优势不是免死金牌，细节断一环就要还回去。',
      shortLines: ['先别开香槟', '这把开始不对劲了', '优势不是免死金牌'],
    };
  }
  if (/弹幕|嘴硬|理解|质疑|云|逆天/.test(text)) {
    return {
      label: '弹幕斗嘴',
      trigger: '群友只看比分不看回合，或者用离谱理解强行洗一波操作。',
      reaction: '先短促反问，再补一个被忽略的信息点，最后把话落回回合本身。',
      judgment: '可以嘴硬，但要讲证据；喷理解不喷现实身份。',
      shortLines: ['你认真的吗', '先看回合别只看比分', '这理解要回炉一下'],
    };
  }
  if (/选手|状态|rating|adr|新人|老将|队伍|阵容|转会|排名/.test(text)) {
    return {
      label: '选手/队伍评价',
      trigger: '聊选手状态、队伍阵容、排名、转会、角色定位或近期数据。',
      reaction: '先查实时来源，再给短判断；没证据就说变得快，别硬编。',
      judgment: '公开事实以 CS API、HLTV/Liquipedia、官方公告等来源为准，风格评价和事实分开。',
      shortLines: ['这事得看最新来源', '别让我硬编', '数据先摆出来'],
    };
  }
  if (/图片|识图|战绩图|截图|语音|听写|录音/.test(text)) {
    return {
      label: '多模态接话',
      trigger: '群友发图、战绩截图或语音消息，需要按实际可见/听写内容回复。',
      reaction: '先说看见或听写到什么；看不清、没听写就直说，不补不存在的细节。',
      judgment: '多模态只按真实输入说话，截图数据和语音内容都要留边界。',
      shortLines: ['我看图里是', '这块看不清', '听写到的是这个'],
    };
  }
  if (/身份|本人|授权|bot|机器人|ai/.test(text)) {
    return {
      label: '身份边界',
      trigger: '群友问是不是本人、是不是机器人、是否代表现实主播。',
      reaction: '日常轻嘴硬带过；明确追问本人/授权/代表性时说明这是群 bot。',
      judgment: '学的是直播反应节奏和 CS 话题知识，不冒充现实本人。',
      shortLines: ['你管我是不是', '接着说事', '不代表本人表态'],
    };
  }
  return {
    label: '随机场景',
    trigger: '弹幕抛来一个话题，需要先接情绪，再给一句具体判断。',
    reaction: '少铺垫，先抓最关键的信息点；能查实时就查，不能查就留边界。',
    judgment: '像直播间接话，不像背模板；一句玩梗后必须回到事实或操作判断。',
    shortLines: ['这波有说法', '先别急', '我看这事不简单'],
  };
}

function dailyCardImagePlan(card: DailyCard): string {
  const parts: string[] = [];
  if (card.liquipediaPage) parts.push('Liquipedia队伍图');
  if (card.fandomPage) parts.push('Counter-Strike Wiki页面主图');
  if (card.fandomFile) parts.push('Counter-Strike Wiki/Fandom');
  if (card.playerImageFallback) parts.push(`代表选手${card.playerImageFallback}`);
  if (card.image) parts.push('静态真实图URL');
  return parts.length > 0
    ? `图片路径：${parts.join(' -> ')}；都拿不到时给日签图`
    : '图片路径：Counter-Strike Wiki/Fandom；都拿不到时给日签图';
}

function playerRoleAdvice(player: CSPlayer, score?: number): { style: string; avoid: string } {
  const role = player.role.toLowerCase();
  let style = '先把默认和信息打清楚，别急着演集锦。';
  let avoid = '别为了节目效果把回合送出去。';

  if (/awper|狙/.test(role)) {
    style = '先架关键枪，拿到首杀就换位置，别恋战。';
    avoid = '别空一枪还站原地等审判。';
  } else if (/igl|指挥|coach/.test(role)) {
    style = '先把队友节奏摆明白，暂停后第一波要有东西。';
    avoid = '别五个人各玩各的还说是默认。';
  } else if (/entry|突破/.test(role)) {
    style = '第一身位可以主动要空间，但补枪距离一定要拉近。';
    avoid = '别死了没信息，也没人能补。';
  } else if (/lurker|自由/.test(role)) {
    style = '慢一点等 timing，侧翼到位再出手。';
    avoid = '别绕到最后队友全没了。';
  } else if (/support|辅助/.test(role)) {
    style = '道具给明白，补位及时，脏活干干净净。';
    avoid = '别闪队友比闪对面还准。';
  } else if (/anchor|锚/.test(role)) {
    style = '包点先站住，拖时间就是价值，别急着前压。';
    avoid = '别听到脚步就把道具全交完。';
  } else if (/rifler|步枪|rifle/.test(role)) {
    style = '准星放稳，第一波交换别掉，关键枪别急。';
    avoid = '别让好枪法去救坏决策。';
  }

  if (typeof score === 'number') {
    if (score >= 85) style = `${style} 今天签位高，可以稍微主动一点。`;
    else if (score <= 35) style = `${style} 今天先收着打，别急着证明自己。`;
  }

  return {
    style: player.style || style,
    avoid: player.avoid || avoid,
  };
}

function normalizeDrawText(text: string): string {
  return text.toLowerCase().replace(/^\//, '').replace(/\s+/g, '').replace(/[：:，。！？!?、,.]/g, '');
}

function isCsPlayerStatusRequest(command: string | null, args: string[], rawText: string): boolean {
  const first = (args[0] || '').toLowerCase();
  if (command === 'csplayer' && ['status', '状态'].includes(first)) return true;
  return /^(?:\/)?(?:csplayer|每日选手|今日选手|抽选手)(?:状态|status)$/.test(normalizeDrawText(rawText));
}

function isDailyImageAuditRequest(command: string | null, args: string[], rawText: string): boolean {
  const first = (args[0] || '').toLowerCase();
  if (['dailyimage', 'dailyimages', 'dailyimg', '每日图片', '图片池'].includes(command || '')) {
    return !first || ['audit', 'status', 'check', 'cache', 'template', 'todo', 'help', 'usage', '审计', '状态', '检查', '缓存', '模板', '待补', '帮助', '用法'].includes(first);
  }
  return /^(?:\/)?(?:dailyimage|dailyimages|dailyimg|每日图片|图片池)(?:audit|status|check|cache|template|todo|help|usage|审计|状态|检查|缓存|模板|待补|帮助|用法)?$/.test(normalizeDrawText(rawText));
}

type DailyImageCommandAction = 'audit' | 'status' | 'cache' | 'template' | 'help';

function dailyImageCommandAction(args: string[], rawText: string): DailyImageCommandAction {
  const first = normalizeDrawText(args[0] || '');
  const raw = normalizeDrawText(rawText);
  if (['help', 'usage', '帮助', '用法'].includes(first) || /(帮助|用法)$/.test(raw)) return 'help';
  if (['cache', '缓存'].includes(first) || /(cache|缓存)$/.test(raw)) return 'cache';
  if (['template', 'todo', '模板', '待补'].includes(first) || /(template|todo|模板|待补)$/.test(raw)) return 'template';
  if (['status', 'check', '状态', '检查'].includes(first) || /(status|check|状态|检查)$/.test(raw)) return 'status';
  return 'audit';
}

function isCsImageCommand(command: string | null, rawText: string): boolean {
  if (['csimage', 'csimg', 'cs图', '图片测试'].includes(command || '')) return true;
  return /^(?:\/)?(?:csimage|csimg|cs图|图片测试)/.test(normalizeDrawText(rawText));
}

function isDailyCardKind(kind: CsImageProbeKind): kind is DailyCardKind {
  return dailyCsKindMetas.some((meta) => meta.kind === kind);
}

function isCsPlayerDrawRequest(command: string | null, rawText: string): boolean {
  if (['csplayer', 'playerday', 'todayplayer', '今日选手', '每日选手', '抽选手'].includes(command || '')) return true;
  const text = normalizeDrawText(rawText);
  if (!text) return false;
  if (['今日选手', '每日选手', '今日cs选手', '每日cs选手', '抽选手', '抽个选手', '抽个cs选手', '今天抽谁'].includes(text)) return true;
  const hasDrawWord = /(抽|今日|每日|今天|本日|来个|给我来个)/.test(text);
  const hasPlayerWord = /(cs选手|cs2选手|职业哥|职业选手|选手签|今日哥们|每日哥们)/.test(text);
  return hasDrawWord && hasPlayerWord;
}

function isDailyKnifeRequest(command: string | null, rawText: string): boolean {
  if (['csknife', 'knife', 'csdao', '今日发刀', '每日发刀', '发刀', '抽刀', 'd'].includes(command || '')) return true;
  const raw = rawText.trim().toLowerCase();
  if (/^\.d(?:\s|$)/i.test(raw)) return true;
  const text = normalizeDrawText(rawText);
  if (!text) return false;
  if (['今日发刀', '每日发刀', '发刀', '抽刀', '来把刀', '给我发刀', '今天发刀', '今天抽刀'].includes(text)) return true;
  const hasDraw = /(今日|每日|今天|抽|来个|来把|给我|发)/.test(text);
  return hasDraw && /(刀|刀签|爪子|蝴蝶|蝴蝶刀|廓尔喀|发刀)/.test(text);
}

function isDailyMokokoRequest(command: string | null, rawText: string): boolean {
  if (['mokoko', 'mygo', 'avemujica', 'ave', '木柜子', '每日木柜子', '今日木柜子', '抽木柜子'].includes(command || '')) return true;
  const text = normalizeDrawText(rawText);
  if (!text) return false;
  if (['每日木柜子', '今日木柜子', '木柜子', '抽木柜子', '今天木柜子', '今日mygo', '今日avemujica'].includes(text)) return true;
  const hasDaily = /(今日|每日|今天|抽|来个|给我)/.test(text);
  return hasDaily && /(木柜子|mygo|avemujica|ave|mujica|迷子|母鸡卡)/.test(text);
}

function isDailyGenshinRequest(command: string | null, rawText: string): boolean {
  if (['genshin', 'ys', '原神', '原神角色', '每日原神', '今日原神', '每日原神角色', '今日原神角色'].includes(command || '')) return true;
  const text = normalizeDrawText(rawText);
  if (!text) return false;
  if (['每日原神', '今日原神', '每日原神角色', '今日原神角色', '抽原神角色', '今天原神角色'].includes(text)) return true;
  const hasDaily = /(今日|每日|今天|抽|来个|给我)/.test(text);
  return hasDaily && /(原神|genshin|提瓦特)/.test(text) && /(角色|人物|谁|抽)/.test(text);
}

function isDailyFactRequest(command: string | null, rawText: string): boolean {
  if (['fact', 'cold', 'coldfact', '冷知识', '每日冷知识', '今日冷知识'].includes(command || '')) return true;
  const text = normalizeDrawText(rawText);
  if (!text) return false;
  return ['每日冷知识', '今日冷知识', '冷知识', '来个冷知识', '今天冷知识'].includes(text)
    || (/(今日|每日|今天|来个|给我)/.test(text) && /(冷知识|小知识|奇怪知识|小众知识)/.test(text));
}

function isDailyBookRequest(command: string | null, rawText: string): boolean {
  if (['book', 'excerpt', 'quote', '书摘', '每日书摘', '今日书摘'].includes(command || '')) return true;
  const text = normalizeDrawText(rawText);
  if (!text) return false;
  return ['每日书摘', '今日书摘', '书摘', '来个书摘', '今天书摘'].includes(text)
    || (/(今日|每日|今天|来个|给我)/.test(text) && /(书摘|摘抄|读书|书句)/.test(text));
}

function isDailyPoemRequest(command: string | null, rawText: string): boolean {
  if (['poem', 'poetry', '古诗', '古诗词', '诗词', '每日古诗词', '今日古诗词'].includes(command || '')) return true;
  const text = normalizeDrawText(rawText);
  if (!text) return false;
  return ['每日古诗词', '今日古诗词', '每日古诗', '今日古诗', '古诗词', '来首诗'].includes(text)
    || (/(今日|每日|今天|来个|给我|来首)/.test(text) && /(古诗词|古诗|诗词|唐诗|宋词)/.test(text));
}

function isDailyMovieRequest(command: string | null, rawText: string): boolean {
  if (['movie', 'film', '影视', '台词', '影视台词', '每日影视台词', '今日影视台词'].includes(command || '')) return true;
  const text = normalizeDrawText(rawText);
  if (!text) return false;
  return ['每日影视台词', '今日影视台词', '影视台词', '来句台词', '今天影视', '每日台词', '今日台词'].includes(text)
    || (/(今日|每日|今天|来个|给我|来句)/.test(text) && /(台词|影视|电影|剧台词|经典台词)/.test(text));
}

function isDailyMusicRequest(command: string | null, rawText: string): boolean {
  if (['music', 'musicfact', '音乐', '音乐知识', '每日音乐知识', '今日音乐知识'].includes(command || '')) return true;
  const text = normalizeDrawText(rawText);
  if (!text) return false;
  return ['每日音乐知识', '今日音乐知识', '音乐知识', '来个音乐知识', '今天音乐'].includes(text)
    || (/(今日|每日|今天|来个|给我)/.test(text) && /(音乐知识|乐理|音乐冷知识|音乐小知识)/.test(text));
}

function isDailyHistoryRequest(command: string | null, rawText: string): boolean {
  if (['history', 'today', '历史', '历史今天', '历史上的今天', '今天历史'].includes(command || '')) return true;
  const text = normalizeDrawText(rawText);
  if (!text) return false;
  return ['历史上的今天', '历史今天', '今天历史', '每日历史', '来个历史'].includes(text)
    || (/(今日|每日|今天|来个|给我)/.test(text) && /(历史|历史今天|历史上的今天)/.test(text));
}

function isDailyScienceRequest(command: string | null, rawText: string): boolean {
  if (['science', 'sci', '科学', '科学知识', '每日科学', '今日科学'].includes(command || '')) return true;
  const text = normalizeDrawText(rawText);
  if (!text) return false;
  return ['每日科学', '今日科学', '科学知识', '来个科学知识', '科普知识'].includes(text)
    || (/(今日|每日|今天|来个|给我)/.test(text) && /(科学|科普|科学知识|科学小知识)/.test(text));
}

function isDailyDuelRequest(command: string | null, rawText: string): boolean {
  if (['duel', '决斗', '紫禁之巅', '决战紫禁之巅', '每日决战紫禁之巅', '今日决战紫禁之巅'].includes(command || '')) return true;
  const text = normalizeDrawText(rawText);
  if (!text) return false;
  return ['决战紫禁之巅', '每日决战紫禁之巅', '今日决战紫禁之巅', '紫禁之巅'].includes(text)
    || (/(今日|每日|今天|来个|给我)/.test(text) && /(决战|决斗|紫禁之巅|单挑)/.test(text));
}

function isCsTrainingRequest(command: string | null, rawText: string): boolean {
  if (['cstrain', 'cstraining', 'cspractice', 'cs训练', '练枪任务', '练枪计划'].includes(command || '')) return true;
  const text = normalizeDrawText(rawText);
  if (!text || /(语音|声音|克隆|朗读|tts|stt)/.test(text)) return false;
  if ([
    '今日cs训练',
    '每日cs训练',
    '今天cs训练',
    '今日cs2训练',
    '每日cs2训练',
    '今天怎么练枪',
    '今天练什么枪',
    '今天练什么道具',
    '来个cs训练',
    '来个练枪任务',
    '给我安排cs训练',
    'cs训练计划',
    'cs练枪计划',
    '练枪任务',
  ].includes(text)) return true;
  const hasDailyIntent = /(今日|每日|今天|本日|来个|安排|给我)/.test(text);
  const hasTrainingIntent = /(cs训练|cs2训练|练枪|练道具|训练计划|练习计划|道具练习)/.test(text);
  return hasDailyIntent && hasTrainingIntent;
}

function isCsTrainingCommand(command: string | null): boolean {
  return ['cstrain', 'cstraining', 'cspractice', 'cs训练', '练枪任务', '练枪计划'].includes(command || '');
}

function isCsQuizRequest(command: string | null, rawText: string): boolean {
  if (['csquiz', 'cschallenge', 'cs小考', 'cs考题', 'cs问答', 'cs挑战', '今日cs题', '每日cs题'].includes(command || '')) return true;
  const text = normalizeDrawText(rawText);
  if (!text || /(语音|声音|克隆|朗读|tts|stt)/.test(text)) return false;
  if ([
    'csquiz',
    'cschallenge',
    'cs小考',
    'cs2小考',
    'cs考题',
    'cs2考题',
    'cs问答',
    'cs2问答',
    'cs挑战',
    'cs2挑战',
    '今日cs题',
    '每日cs题',
    '今日cs小考',
    '每日cs小考',
    '今日cs问答',
    '每日cs问答',
    '今天cs小考',
    '今天cs考题',
    '今天cs问答',
    '今天考我cs',
    '今天cs考我',
    '来个cs问答',
    '来个cs小考',
    '来个cs挑战',
    '给我来个cs题',
  ].includes(text)) return true;
  const hasDailyIntent = /(今日|每日|今天|本日|来个|给我|考我|挑战|小考)/.test(text);
  const hasQuizIntent = /(cs小考|cs2小考|cs题|cs2题|cs考题|cs2考题|cs问答|cs2问答|cs挑战|cs2挑战|cs答题|cs2答题|cs考我|cs2考我)/.test(text);
  return hasDailyIntent && hasQuizIntent;
}

function buildImageFailureLine(): string {
  const stats = getCacheStats();
  return stats.lastError ? `\n图片没发出来：${stats.lastError}` : '\n图片没发出来，先看文字签。';
}

function imageDataUrlToSegment(dataUrl: string): MessageSegment {
  return { type: 'image', data: { file: dataUrl.replace(/^data:image\/[^;]+;base64,/, 'base64://') } };
}

async function tryImageDataUrl(url: string, label: string): Promise<string | null> {
  try {
    return await imageDataUrlResolver(url);
  } catch (err) {
    logger.warn(`[fun] 图片解析失败 ${label}:`, err);
    return null;
  }
}

function shortUrl(url: string): string {
  return url.length > 96 ? `${url.slice(0, 92)}...` : url;
}

function isSkinCard(card?: DailyCard): card is SkinCard {
  return Boolean(card && typeof (card as SkinCard).weapon === 'string' && typeof (card as SkinCard).rarity === 'string');
}

async function buildImageCandidates(url?: string, fallbackPlayerNick?: string, fallbackCard?: DailyCard): Promise<ImageCandidate[]> {
  const candidateUrls: ImageCandidate[] = [];

  if (isSkinCard(fallbackCard)) {
    try {
      const skinUrl = await Promise.race([
        csgoSkinImageResolver(fallbackCard.weapon, fallbackCard.name),
        new Promise<null>((r) => setTimeout(() => r(null), 6000)),
      ]);
      if (skinUrl) {
        candidateUrls.push({
          url: skinUrl,
          label: `${fallbackCard.name}/csgo-api-skin`,
          source: 'csgo-api-skin',
        });
      }
    } catch (err) {
      logger.warn(`[fun] ${fallbackCard.name} CSGO-API皮肤图解析失败:`, err);
    }
  }

  if (fallbackCard?.liquipediaPage) {
    try {
      const dynamicUrl = await Promise.race([
        teamImageResolver(fallbackCard.liquipediaPage, fallbackCard.name),
        new Promise<null>((r) => setTimeout(() => r(null), 6000)),
      ]);
      if (dynamicUrl) {
        candidateUrls.push({
          url: dynamicUrl,
          label: `${fallbackCard.name}/team-dynamic`,
          source: 'liquipedia-team',
        });
      }
    } catch (err) {
      logger.warn(`[fun] ${fallbackCard.name} Liquipedia队伍图解析失败:`, err);
    }
  }

  if (fallbackCard?.fandomFile) {
    try {
      const fandomUrl = await Promise.race([
        fandomImageResolver(fallbackCard.fandomFile, 'counterstrike'),
        new Promise<null>((r) => setTimeout(() => r(null), 6000)),
      ]);
      if (fandomUrl) {
        candidateUrls.push({
          url: fandomUrl,
          label: `${fallbackCard.name}/fandom-file`,
          source: 'fandom-file',
        });
      }
    } catch (err) {
      logger.warn(`[fun] ${fallbackCard.name} Fandom图片解析失败:`, err);
    }
  }

  if (fallbackCard?.fandomPage) {
    try {
      const fandomUrl = await Promise.race([
        fandomPageImageResolver(fallbackCard.fandomPage, 'counterstrike'),
        new Promise<null>((r) => setTimeout(() => r(null), 6000)),
      ]);
      if (fandomUrl) {
        candidateUrls.push({
          url: fandomUrl,
          label: `${fallbackCard.name}/fandom-page`,
          source: 'fandom-page',
        });
      }
    } catch (err) {
      logger.warn(`[fun] ${fallbackCard.name} Fandom页面图解析失败:`, err);
    }
  }

  if (fallbackCard?.playerImageFallback) {
    const representative = csPlayers.find((player) =>
      player.nick.toLowerCase() === fallbackCard.playerImageFallback!.toLowerCase()
      || player.aliases?.some((alias) => alias.toLowerCase() === fallbackCard.playerImageFallback!.toLowerCase()),
    );
    if (representative) {
      try {
        const dynamicUrl = await Promise.race([
          playerImageResolver(representative.nick),
          new Promise<null>((r) => setTimeout(() => r(null), 5000)),
        ]);
        if (dynamicUrl) {
          candidateUrls.push({
            url: dynamicUrl,
            label: `${fallbackCard.name}/${representative.nick}-fallback-dynamic`,
            source: 'representative-player-dynamic',
          });
        }
      } catch (err) {
        logger.warn(`[fun] ${fallbackCard.name} 代表选手图动态解析失败:`, err);
      }
      candidateUrls.push({
        url: representative.image,
        label: `${fallbackCard.name}/${representative.nick}-fallback-static`,
        source: 'representative-player-static',
      });
    }
  }

  if (fallbackPlayerNick) {
    try {
      const dynamicUrl = await Promise.race([
        playerImageResolver(fallbackPlayerNick),
        new Promise<null>((r) => setTimeout(() => r(null), 5000)),
      ]);
      if (dynamicUrl) {
        candidateUrls.push({
          url: dynamicUrl,
          label: `${fallbackPlayerNick}/player-dynamic`,
          source: 'liquipedia-player',
        });
      }
    } catch (err) {
      logger.warn(`[fun] ${fallbackPlayerNick} Liquipedia动态查图失败:`, err);
    }
  }

  if (url) {
    candidateUrls.push({
      url,
      label: fallbackPlayerNick || fallbackCard?.name || url,
      source: 'static-url',
    });
  }

  const seen = new Set<string>();
  return candidateUrls.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

async function probeImageCandidates(title: string, candidates: ImageCandidate[], fallbackCard?: DailyCard, score?: number): Promise<MessageSegment[]> {
  const lines = [
    `CS真实图片测试 | ${title}`,
    `候选真实图: ${candidates.length}`,
  ];
  let image: MessageSegment | null = null;
  for (const candidate of candidates.slice(0, 8)) {
    const dataUrl = await tryImageDataUrl(candidate.url, candidate.label);
    if (dataUrl) {
      lines.push(`OK ${candidate.source} ${candidate.label}`);
      lines.push(shortUrl(candidate.url));
      if (!image) image = imageDataUrlToSegment(dataUrl);
      break;
    }
    lines.push(`FAIL ${candidate.source} ${candidate.label}`);
  }
  if (!image && fallbackCard) {
    lines.push('已生成日签图。');
    image = localDailyCardImage(fallbackCard, score);
  }
  const stats = getCacheStats();
  if (!image && stats.lastError) lines.push(`最近错误: ${stats.lastError}`);
  return [
    { type: 'text', data: { text: lines.join('\n') } },
    ...(image ? [image] : []),
  ];
}

async function probeDailyCard(kind: CsImageProbeKind, userId: number, scopeId: number): Promise<MessageSegment[]> {
  if (kind === 'player') {
    const player = dailyPlayerFor(userId, scopeId);
    const candidates = await buildCsPlayerImageCandidates(player, userId, scopeId);
    return probeImageCandidates(`今日选手 ${player.nick}`, candidates);
  }
  if (kind === 'knife') {
    const knife = dailyKnifeFor(userId, scopeId);
    const skin = dailyKnifeSkinFor(userId, scopeId, knife);
    const score = dailyScoreForKind('csknife', userId, scopeId);
    const card: DailyCard = {
      key: `probe-${knife.key}-${skin.key}`,
      title: '今日发刀',
      name: `${knife.name} | ${skin.name}`,
      subtitle: knife.subtitle,
      scoreLabel: '刀运指数',
      advice: `${knife.advice} ${skin.advice}`,
      avoid: `${knife.avoid} ${skin.avoid}`,
      line: `${knife.line} ${skin.line}`,
    };
    return probeImageCandidates(`今日发刀 ${knife.name} | ${skin.name}`, await buildKnifeImageCandidates(knife, skin, userId, scopeId), card, score);
  }
  if (kind === 'mokoko') {
    const character = dailyCharacterFor(userId, scopeId);
    const score = dailyScoreForKind('mokoko', userId, scopeId);
    const card: DailyCard = {
      key: `probe-${character.key}`,
      title: character.title,
      name: character.name,
      subtitle: `${character.band} / ${character.role}`,
      scoreLabel: '木柜子指数',
      advice: character.note,
      avoid: '这是角色抽签，不是CS事实。',
      line: character.voice,
    };
    return probeImageCandidates(`每日木柜子 ${character.name}`, await buildCharacterImageCandidates(character, userId, scopeId), card, score);
  }
  if (kind === 'genshin') {
    const character = dailyGenshinFor(userId, scopeId);
    const score = dailyScoreForKind('genshin', userId, scopeId);
    const card: DailyCard = {
      key: `probe-genshin-${character.key}`,
      title: character.title,
      name: character.name,
      subtitle: character.tag,
      scoreLabel: '共鸣指数',
      advice: character.note,
      avoid: '这是每日角色签，不是抽卡建议。',
      line: character.tag,
    };
    return probeImageCandidates(`每日原神角色 ${character.name}`, await buildGenshinImageCandidates(character, userId, scopeId), card, score);
  }
  if (kind === 'all') {
    const kinds: CsImageProbeKind[] = ['player', ...dailyCsKindMetas.map((meta) => meta.kind), 'knife', 'mokoko', 'genshin'];
    const lines = ['CS真实图片批量测试'];
    for (const item of kinds) {
      if (item === 'player') {
        const player = dailyPlayerFor(userId, scopeId);
        const candidates = await buildCsPlayerImageCandidates(player, userId, scopeId);
        let ok = false;
        for (const candidate of candidates.slice(0, 4)) {
          if (await tryImageDataUrl(candidate.url, candidate.label)) {
            ok = true;
            lines.push(`OK player ${player.nick} -> ${candidate.source}`);
            break;
          }
        }
        if (!ok) lines.push(`FAIL player ${player.nick}`);
        continue;
      }
      if (item === 'knife') {
        const knife = dailyKnifeFor(userId, scopeId);
        const skin = dailyKnifeSkinFor(userId, scopeId, knife);
        const candidates = await buildKnifeImageCandidates(knife, skin, userId, scopeId);
        let ok = false;
        for (const candidate of candidates.slice(0, 4)) {
          if (await tryImageDataUrl(candidate.url, candidate.label)) {
            ok = true;
            lines.push(`OK knife ${knife.name} | ${skin.name} -> ${candidate.source}`);
            break;
          }
        }
        if (!ok) lines.push(`FAIL knife ${knife.name} | ${skin.name}`);
        continue;
      }
      if (item === 'mokoko') {
        const character = dailyCharacterFor(userId, scopeId);
        const candidates = await buildCharacterImageCandidates(character, userId, scopeId);
        let ok = false;
        for (const candidate of candidates.slice(0, 4)) {
          if (await tryImageDataUrl(candidate.url, candidate.label)) {
            ok = true;
            lines.push(`OK mokoko ${character.name} -> ${candidate.source}`);
            break;
          }
        }
        if (!ok) lines.push(`FAIL mokoko ${character.name}`);
        continue;
      }
      if (item === 'genshin') {
        const character = dailyGenshinFor(userId, scopeId);
        const candidates = await buildGenshinImageCandidates(character, userId, scopeId);
        let ok = false;
        for (const candidate of candidates.slice(0, 4)) {
          if (await tryImageDataUrl(candidate.url, candidate.label)) {
            ok = true;
            lines.push(`OK genshin ${character.name} -> ${candidate.source}`);
            break;
          }
        }
        if (!ok) lines.push(`FAIL genshin ${character.name}`);
        continue;
      }
      if (!isDailyCardKind(item)) continue;
      const meta = dailyCsMetaFor(item);
      const card = dailyCardFor(meta.seedKey, userId, scopeId, meta.cards);
      const candidates = await buildDailyCardImageCandidates(item, card, userId, scopeId);
      let ok = false;
      for (const candidate of candidates.slice(0, 4)) {
        if (await tryImageDataUrl(candidate.url, candidate.label)) {
          ok = true;
          lines.push(`OK ${item} ${card.name} -> ${candidate.source}`);
          break;
        }
      }
      if (!ok) lines.push(`FAIL ${item} ${card.name}`);
    }
    const stats = getCacheStats();
    lines.push(`图片缓存: ${stats.count}/${stats.maxFiles} 命中${stats.hits}/${stats.misses} 失败${stats.downloadFailures}`);
    if (stats.lastError) lines.push(`最近错误: ${stats.lastError}`);
    return [{ type: 'text', data: { text: lines.join('\n') } }];
  }
  if (!isDailyCardKind(kind)) return [{ type: 'text', data: { text: '不支持这个图片测试类型。' } }];
  const meta = dailyCsMetaFor(kind);
  const card = dailyCardFor(meta.seedKey, userId, scopeId, meta.cards);
  const score = dailyScoreForKind(meta.scoreKey, userId, scopeId);
  const candidates = await buildDailyCardImageCandidates(kind, card, userId, scopeId);
  return probeImageCandidates(`${card.title} ${card.name}`, candidates, card, score);
}

function readableDailyImageLabel(card: DailyCard): string {
  const candidates = [card.imageLabel, card.name, card.key, card.subtitle, card.title].filter(Boolean) as string[];
  return candidates.find((item) => /[a-zA-Z0-9]/.test(item)) || candidates[0] || 'DAILY';
}

function inferDailyCardImageKind(card: DailyCard): DailyCardImageKind {
  const text = `${card.key} ${card.title} ${card.name} ${card.subtitle}`.toLowerCase();
  if (/player|选手/.test(text)) return 'player';
  if (/team|队伍|战队/.test(text)) return 'team';
  if (/map|地图|mirage|inferno|nuke|ancient|anubis|dust|overpass/.test(text)) return 'map';
  if (/knife|发刀|刀/.test(text)) return 'knife';
  if (/skin|皮肤/.test(text)) return 'skin';
  if (/weapon|武器|ak|m4|awp|deagle|mp9|mac-10|galil/.test(text)) return 'weapon';
  if (/role|定位|entry|support|anchor|lurker|igl|awper/.test(text)) return 'role';
  if (/utility|道具|flash|smoke|molotov|grenade|kit/.test(text)) return 'utility';
  if (/tactic|战术|default|explode|split|fake|contact|forcebuy/.test(text)) return 'tactic';
  if (/clutch|残局|retake|postplant|save/.test(text)) return 'clutch';
  if (/economy|eco|money|经济|经济局|强起|半起|奖励局|英雄步枪/.test(text)) return 'economy';
  if (/shotcall|call|igl|指挥|口令|集合令|暂停重置/.test(text)) return 'shotcall';
  if (/review|demo|vod|复盘|切片|首死|时间轴/.test(text)) return 'review';
  if (/mokoko|mygo|ave mujica|木柜子/.test(text)) return 'mokoko';
  if (/genshin|原神/.test(text)) return 'genshin';
  if (/fact|冷知识/.test(text)) return 'fact';
  if (/book|书摘/.test(text)) return 'book';
  if (/poem|古诗|诗词/.test(text)) return 'poem';
  if (/duel|紫禁之巅| vs /.test(text)) return 'duel';
  if (/quiz|小考/.test(text)) return 'quiz';
  if (/train|训练/.test(text)) return 'training';
  return 'daily';
}

function localDailyCardImage(card: DailyCard, score?: number, kind?: DailyCardImageKind): MessageSegment {
  const label = readableDailyImageLabel(card);
  const dataUrl = buildDailyCardImageDataUrl({
    title: card.title,
    label,
    subtitle: card.subtitle,
    score: typeof score === 'number' ? `${card.scoreLabel} ${score}/100` : card.scoreLabel,
    seed: `${todayKey()}_${card.key}_${card.title}`,
    footer: 'WANJIER DAILY CS',
    kind: kind || inferDailyCardImageKind(card),
  });
  return imageDataUrlToSegment(dataUrl);
}

async function imageSegmentOrNote(url?: string, fallbackPlayerNick?: string, fallbackCard?: DailyCard, score?: number): Promise<MessageSegment[]> {
  if (!url && !fallbackPlayerNick && !fallbackCard) return [];

  const candidateUrls = await buildImageCandidates(url, fallbackPlayerNick, fallbackCard);

  for (const candidate of candidateUrls) {
    const dataUrl = await tryImageDataUrl(candidate.url, candidate.label);
    if (dataUrl) {
      if (candidate.label.includes('/team-dynamic')) logger.info(`[fun] ${fallbackCard?.name} 用Liquipedia队伍图成功`);
      else if (candidate.label.includes('/fandom-file')) logger.info(`[fun] ${fallbackCard?.name} 用Fandom图片成功`);
      else if (candidate.label.includes('-fallback-')) logger.info(`[fun] ${fallbackCard?.name} 用代表选手图成功`);
      else if (candidate.label.includes('/player-dynamic')) logger.info(`[fun] ${fallbackPlayerNick} 用Liquipedia动态查图成功`);
      return [imageDataUrlToSegment(dataUrl)];
    }
  }

  if (fallbackPlayerNick) {
    try {
      const query = `${fallbackPlayerNick} CS2 player photo site:wikipedia.org OR site:wikimedia.org`;
      const result = await webSearch(query, 3000, 600, 60);
      if (result) {
        const imgMatch = result.match(/https?:\/\/upload\.wikimedia\.org\/[^\s)"<>]+\.(?:jpg|jpeg|png|webp)/i);
        if (imgMatch) {
          const dataUrl = await tryImageDataUrl(imgMatch[0], `${fallbackPlayerNick}/search`);
          if (dataUrl) {
            logger.info(`[fun] ${fallbackPlayerNick} 用webSearch找图成功`);
            return [imageDataUrlToSegment(dataUrl)];
          }
        }
      }
    } catch (err) { /* */ }
  }

  if (fallbackCard) {
    logger.info(`[fun] ${fallbackCard.title}/${fallbackCard.name} 使用日签图`);
    return [localDailyCardImage(fallbackCard, score)];
  }

  if (fallbackPlayerNick) {
    logger.info(`[fun] ${fallbackPlayerNick} 使用选手日签图`);
    return [localDailyCardImage({
      key: `player-${fallbackPlayerNick}`,
      title: '今日CS选手',
      name: fallbackPlayerNick,
      subtitle: '图片源暂时没连上，先给今日签位图',
      scoreLabel: '签位',
      advice: '图片池补好后会自动优先发对应图片。',
      avoid: '别把签位图当选手照片。',
      line: '图没拉下来，但签不能断。',
      imageLabel: fallbackPlayerNick,
    }, score)];
  }

  return [{ type: 'text', data: { text: buildImageFailureLine() } }];
}

function sameWeaponName(a: string, b: string): boolean {
  const normalize = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return normalize(a) === normalize(b);
}

function dailySkinForWeapon(weapon: DailyCard, userId: number, scopeId: number): SkinCard {
  const matching = csSkins.filter((skin) => sameWeaponName(skin.weapon, weapon.name));
  const pool = matching.length > 0 ? matching : csSkins;
  return pool[dailySeedForKind(`csskin_${weapon.key}`, userId, scopeId) % pool.length];
}

function localSkinCard(skin: SkinCard): DailyCard {
  return {
    ...skin,
    imageLabel: skin.name,
  };
}

function knifeSkinFileCandidates(knife: KnifeCard, skin: KnifeSkin): string[] {
  const files: string[] = [];
  for (const prefix of knife.skinFilePrefixes) {
    for (const suffix of skin.fileSuffixes) {
      files.push(`${prefix}_${suffix}.png`);
      files.push(`${prefix}_${suffix.replace(/_/g, '-')}.png`);
    }
  }
  return [...new Set(files)];
}

async function buildKnifeImageCandidates(knife: KnifeCard, skin: KnifeSkin, userId: number = 0, scopeId: number = 0): Promise<ImageCandidate[]> {
  const candidateUrls: ImageCandidate[] = dailyBeautyKnifeCandidates(knife, skin, userId, scopeId);
  try {
    const skinUrl = await Promise.race([
      csgoSkinImageResolver(knife.name, skin.name),
      new Promise<null>((r) => setTimeout(() => r(null), 6000)),
    ]);
    if (skinUrl) {
      candidateUrls.push({
        url: skinUrl,
        label: `${knife.name}/${skin.name}/csgo-api-skin`,
        source: 'csgo-api-skin',
      });
    }
  } catch (err) {
    logger.warn(`[fun] ${knife.name} ${skin.name} CSGO-API刀皮图片解析失败:`, err);
  }
  for (const filename of knifeSkinFileCandidates(knife, skin).slice(0, 10)) {
    try {
      const fandomUrl = await Promise.race([
        fandomImageResolver(filename, 'counterstrike'),
        new Promise<null>((r) => setTimeout(() => r(null), 5000)),
      ]);
      if (fandomUrl) {
        candidateUrls.push({
          url: fandomUrl,
          label: `${knife.name}/${skin.name}/${filename}`,
          source: 'fandom-file',
        });
      }
    } catch (err) {
      logger.warn(`[fun] ${knife.name} ${skin.name} 刀皮图片解析失败:`, err);
    }
  }
  candidateUrls.push(...await buildImageCandidates(knife.image, undefined, knife));
  const seen = new Set<string>();
  return candidateUrls.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

async function imageFromCandidatesOrCard(candidates: ImageCandidate[], fallbackCard: DailyCard, score: number): Promise<MessageSegment[]> {
  for (const candidate of candidates) {
    const dataUrl = await tryImageDataUrl(candidate.url, candidate.label);
    if (dataUrl) return [imageDataUrlToSegment(dataUrl)];
  }
  return [localDailyCardImage(fallbackCard, score)];
}

const BESTDORI_CARD_MANIFEST_PATH = path.resolve(__dirname, '..', '..', 'data', 'bestdori-cards.json');
const PLAYER_IMAGE_MANIFEST_PATH = path.resolve(__dirname, '..', '..', 'data', 'daily-player-images.json');
const GENSHIN_IMAGE_MANIFEST_PATH = path.resolve(__dirname, '..', '..', 'data', 'genshin-character-images.json');
const DAILY_BEAUTY_IMAGE_MANIFEST_PATH = path.resolve(__dirname, '..', '..', 'data', 'daily-beauty-images.json');
const DAILY_IMAGE_PACK_ROOT = path.resolve(__dirname, '..', '..', 'authorized-images', 'daily-beauty');
let bestdoriCardManifestPathOverride = '';
let playerImageManifestPathOverride = '';
let genshinImageManifestPathOverride = '';
let dailyBeautyImageManifestPathOverride = '';
let dailyImagePackRootOverride = '';
let dailyBeautyMatchCacheHits = 0;
let dailyBeautyMatchCacheMisses = 0;
let dailyBeautyMatchCacheEvictions = 0;
const dailyBeautyMatchCache = new Map<string, BestdoriCardImage[]>();

function bestdoriCardManifestPath(): string {
  return bestdoriCardManifestPathOverride || process.env.BESTDORI_CARD_MANIFEST_PATH || BESTDORI_CARD_MANIFEST_PATH;
}

function loadBestdoriCardImages(): BestdoriCardImage[] {
  return loadImageManifest(bestdoriCardManifestPath(), 'bestdori');
}

function playerImageManifestPath(): string {
  return playerImageManifestPathOverride || process.env.DAILY_PLAYER_IMAGE_MANIFEST_PATH || PLAYER_IMAGE_MANIFEST_PATH;
}

function genshinImageManifestPath(): string {
  return genshinImageManifestPathOverride || process.env.GENSHIN_IMAGE_MANIFEST_PATH || GENSHIN_IMAGE_MANIFEST_PATH;
}

function dailyBeautyImageManifestPath(): string {
  return dailyBeautyImageManifestPathOverride || process.env.DAILY_BEAUTY_IMAGE_MANIFEST_PATH || DAILY_BEAUTY_IMAGE_MANIFEST_PATH;
}

function dailyImagePackRoot(): string {
  return dailyImagePackRootOverride || process.env.DAILY_IMAGE_PACK_ROOT || DAILY_IMAGE_PACK_ROOT;
}

function loadPlayerManifestImages(): BestdoriCardImage[] {
  return loadImageManifest(playerImageManifestPath(), 'players');
}

function loadGenshinManifestImages(): BestdoriCardImage[] {
  return loadImageManifest(genshinImageManifestPath(), 'genshin');
}

function loadDailyBeautyImages(): BestdoriCardImage[] {
  return loadImageManifest(dailyBeautyImageManifestPath(), 'daily-beauty');
}

function clearDailyBeautyMatchCache(): void {
  dailyBeautyMatchCache.clear();
  dailyBeautyMatchCacheHits = 0;
  dailyBeautyMatchCacheMisses = 0;
  dailyBeautyMatchCacheEvictions = 0;
}

function setDailyBeautyMatchCache(key: string, cards: BestdoriCardImage[]): BestdoriCardImage[] {
  dailyBeautyMatchCache.set(key, cards);
  if (dailyBeautyMatchCache.size > DAILY_BEAUTY_MATCH_CACHE_MAX) {
    const firstKey = dailyBeautyMatchCache.keys().next().value;
    if (firstKey) {
      dailyBeautyMatchCache.delete(firstKey);
      dailyBeautyMatchCacheEvictions++;
    }
  }
  return cards;
}

function dailyBeautyMatchCacheStats(): { size: number; max: number; hits: number; misses: number; evictions: number } {
  return {
    size: dailyBeautyMatchCache.size,
    max: DAILY_BEAUTY_MATCH_CACHE_MAX,
    hits: dailyBeautyMatchCacheHits,
    misses: dailyBeautyMatchCacheMisses,
    evictions: dailyBeautyMatchCacheEvictions,
  };
}

function dailyLocalImagePackRootSignature(): string {
  const root = dailyImagePackRoot();
  try {
    if (!fs.existsSync(root)) return `${root}:missing`;
    const stat = fs.statSync(root);
    return `${root}:${stat.mtimeMs}:${stat.size}`;
  } catch {
    return `${root}:error`;
  }
}

function dailyLocalPackDirsFor(kind: string, values: unknown[]): string[] {
  const root = dailyImagePackRoot();
  const kindRoot = path.join(root, compactManifestValue(kind) || kind);
  return dailyImageSlugCandidates(values).map((slug) => path.join(kindRoot, slug));
}

function dailyLocalPackDirsForPair(kind: string, firstValues: unknown[], secondValues: unknown[]): string[] {
  const root = dailyImagePackRoot();
  const kindRoot = path.join(root, compactManifestValue(kind) || kind);
  const first = dailyImageSlugCandidates(firstValues);
  const second = dailyImagePairSecondSlugCandidates(first, secondValues);
  const dirs: string[] = [];
  for (const a of first) {
    for (const b of second) {
      dirs.push(path.join(kindRoot, a, b));
      dirs.push(path.join(kindRoot, `${a}-${b}`));
    }
  }
  return [...new Set(dirs)];
}

function dailyBeautyManifestImagesFor(kind: string, values: unknown[]): BestdoriCardImage[] {
  const keys = values.map(compactManifestValue).filter(Boolean);
  if (keys.length === 0) return [];
  const manifestPath = dailyBeautyImageManifestPath();
  const signature = getImageManifestSignature(manifestPath, 'daily-beauty');
  const localPackSignature = dailyLocalImagePackRootSignature();
  const cacheKey = `single:${signature}:${localPackSignature}:${imageKindAliases(kind).join('|')}:${keys.join('|')}`;
  const cached = dailyBeautyMatchCache.get(cacheKey);
  if (cached) {
    dailyBeautyMatchCacheHits++;
    dailyBeautyMatchCache.delete(cacheKey);
    dailyBeautyMatchCache.set(cacheKey, cached);
    return cached;
  }
  dailyBeautyMatchCacheMisses++;
  const kindCards = loadImageManifestByKinds(dailyBeautyImageManifestPath(), 'daily-beauty', imageKindAliases(kind));
  const matches = kindCards.filter((card) => {
    const cardValues = manifestSearchValues(card);
    return cardValues.some((value) => keys.some((key) => value === key || value.includes(key) || key.includes(value)));
  });
  const localMatches = dailyLocalPackCardsFromDirs(kind, String(values.find(Boolean) || kind), dailyLocalPackDirsFor(kind, values));
  return setDailyBeautyMatchCache(cacheKey, preferBeautyManifestImages([...matches, ...localMatches]));
}

function manifestValueMatches(cardValues: string[], keys: unknown[]): boolean {
  const normalizedKeys = keys.map(compactManifestValue).filter(Boolean);
  if (normalizedKeys.length === 0) return false;
  return cardValues.some((value) => normalizedKeys.some((key) => value === key || value.includes(key) || key.includes(value)));
}

function dailyBeautyManifestImagesForPair(kind: string, firstValues: unknown[], secondValues: unknown[]): BestdoriCardImage[] {
  const firstKeys = firstValues.map(compactManifestValue).filter(Boolean);
  const secondKeys = secondValues.map(compactManifestValue).filter(Boolean);
  if (firstKeys.length === 0 || secondKeys.length === 0) return [];
  const manifestPath = dailyBeautyImageManifestPath();
  const signature = getImageManifestSignature(manifestPath, 'daily-beauty');
  const localPackSignature = dailyLocalImagePackRootSignature();
  const cacheKey = `pair:${signature}:${localPackSignature}:${imageKindAliases(kind).join('|')}:${firstKeys.join('|')}:${secondKeys.join('|')}`;
  const cached = dailyBeautyMatchCache.get(cacheKey);
  if (cached) {
    dailyBeautyMatchCacheHits++;
    dailyBeautyMatchCache.delete(cacheKey);
    dailyBeautyMatchCache.set(cacheKey, cached);
    return cached;
  }
  dailyBeautyMatchCacheMisses++;
  const kindCards = loadImageManifestByKinds(manifestPath, 'daily-beauty', imageKindAliases(kind));
  const matches = kindCards.filter((card) => {
    const cardValues = manifestSearchValues(card);
    return manifestValueMatches(cardValues, firstKeys) && manifestValueMatches(cardValues, secondKeys);
  });
  const label = `${String(firstValues.find(Boolean) || kind)} ${String(secondValues.find(Boolean) || '')}`.trim();
  const localMatches = dailyLocalPackCardsFromDirs(kind, label, dailyLocalPackDirsForPair(kind, firstValues, secondValues));
  return setDailyBeautyMatchCache(cacheKey, preferBeautyManifestImages([...matches, ...localMatches]));
}

function dailyBeautyCandidatesFromCards(kind: string, label: string, cards: BestdoriCardImage[], userId: number, scopeId: number, limit = DAILY_IMAGE_CANDIDATE_LIMIT): ImageCandidate[] {
  return rotateManifestCards(cards, `daily_beauty_${kind}_${compactManifestValue(label)}`, userId, scopeId, limit)
    .filter((card) => card.url)
    .map((card, index): ImageCandidate => ({
      url: String(card.url),
      label: `${label}/beauty/${card.title || index + 1}`,
      source: 'authorized-image',
    }));
}

function dailyBeautyKindFallbackImagesFor(kind: string, label: string, exactCards: BestdoriCardImage[]): BestdoriCardImage[] {
  const excluded = new Set(exactCards.map((card) => String(card.url || '')).filter(Boolean));
  const kindCards = loadImageManifestByKinds(dailyBeautyImageManifestPath(), 'daily-beauty', imageKindAliases(kind))
    .filter((card) => card.url && !excluded.has(String(card.url)));
  const sharedLocal = dailyLocalPackCardsFromDirs(
    kind,
    `${label} shared`,
    dailyLocalPackDirsFor(kind, ['_shared', 'shared', 'general', 'default', '通用', kind]),
  ).filter((card) => card.url && !excluded.has(String(card.url)));
  return uniqueManifestCardsByUrl(preferBeautyManifestImages([...kindCards, ...sharedLocal]));
}

function dailyBeautyCandidatesFromExactAndFallback(
  kind: string,
  label: string,
  exactCards: BestdoriCardImage[],
  userId: number,
  scopeId: number,
  limit = DAILY_IMAGE_CANDIDATE_LIMIT,
): ImageCandidate[] {
  const exact = dailyBeautyCandidatesFromCards(kind, label, exactCards, userId, scopeId, limit);
  const fallbackThreshold = Math.min(12, limit);
  if (exactCards.length >= fallbackThreshold || exact.length >= limit) return exact;
  const fallbackLimit = Math.max(0, limit - exact.length);
  const fallback = dailyBeautyCandidatesFromCards(
    kind,
    `${label}/same-kind`,
    dailyBeautyKindFallbackImagesFor(kind, label, exactCards),
    userId,
    scopeId,
    fallbackLimit,
  );
  return [...exact, ...fallback];
}

function dailyBeautyCandidatesFor(kind: string, label: string, values: unknown[], userId: number, scopeId: number, limit = DAILY_IMAGE_CANDIDATE_LIMIT): ImageCandidate[] {
  return dailyBeautyCandidatesFromExactAndFallback(kind, label, dailyBeautyManifestImagesFor(kind, values), userId, scopeId, limit);
}

function dailyBeautyImageCountFor(kind: string, values: unknown[]): number {
  return dailyBeautyManifestImagesFor(kind, values).length;
}

function dailyBeautySkinImagesFor(skin: SkinCard): BestdoriCardImage[] {
  return dailyBeautyManifestImagesForPair('skin', [skin.weapon], [skin.key, skin.name, `${skin.weapon} ${skin.name}`, `${skin.weapon} | ${skin.name}`]);
}

function dailyBeautyKnifeImagesFor(knife: KnifeCard, skin: KnifeSkin): BestdoriCardImage[] {
  return dailyBeautyManifestImagesForPair(
    'knife',
    [knife.key, knife.name, ...knife.aliases],
    [skin.key, skin.name, `${knife.name} ${skin.name}`, `${knife.name} | ${skin.name}`],
  );
}

function dailyBeautySkinCandidates(skin: SkinCard, userId: number, scopeId: number): ImageCandidate[] {
  const label = `${skin.weapon} ${skin.name}`;
  return dailyBeautyCandidatesFromExactAndFallback('skin', label, dailyBeautySkinImagesFor(skin), userId, scopeId);
}

function dailyBeautyKnifeCandidates(knife: KnifeCard, skin: KnifeSkin, userId: number, scopeId: number): ImageCandidate[] {
  const label = `${knife.name} ${skin.name}`;
  return dailyBeautyCandidatesFromExactAndFallback('knife', label, dailyBeautyKnifeImagesFor(knife, skin), userId, scopeId);
}

function formatBeautyCoverage(name: string, count: number): string {
  const status = count >= DAILY_BEAUTY_MIN_IMAGES_PER_ITEM ? 'OK' : '不足';
  return `${name}${count}/${DAILY_BEAUTY_MIN_IMAGES_PER_ITEM}${status}`;
}

function currentDailyBeautyCoverageLines(userId: number, scopeId: number): string[] {
  const player = dailyPlayerFor(userId, scopeId);
  const weapon = dailyCardFor('csweapon', userId, scopeId, csWeapons);
  const skin = dailySkinForWeapon(weapon, userId, scopeId);
  const knife = dailyKnifeFor(userId, scopeId);
  const knifeSkin = dailyKnifeSkinFor(userId, scopeId, knife);
  const mokoko = dailyCharacterFor(userId, scopeId);
  const genshin = dailyGenshinFor(userId, scopeId);
  const fact = dailyFactFor(userId, scopeId);
  const book = dailyBookExcerptFor(userId, scopeId);
  const poem = dailyPoemFor(userId, scopeId);
  const duelWeapon = dailyDuelPlayerWeaponFor(userId, scopeId);
  const dailyCsRows = dailyCsKindMetas
    .filter((meta) => meta.kind !== 'loadout' && meta.kind !== 'skin')
    .map((meta) => {
      const card = dailyCardFor(meta.seedKey, userId, scopeId, meta.cards);
      return formatBeautyCoverage(meta.label, dailyBeautyImageCountFor(meta.kind, dailyCardManifestSearchValues(card)));
    });
  const rows = [
    formatBeautyCoverage('选手', dailyBeautyImageCountFor('player', [player.nick, player.name, ...(player.aliases || [])])),
    ...dailyCsRows.slice(0, 3),
    formatBeautyCoverage('皮肤', dailyBeautySkinImagesFor(skin).length),
    ...dailyCsRows.slice(3),
    formatBeautyCoverage('刀皮', dailyBeautyKnifeImagesFor(knife, knifeSkin).length),
    formatBeautyCoverage('木柜子', dailyBeautyImageCountFor('mokoko', mokokoSearchValues(mokoko))),
    formatBeautyCoverage('原神', dailyBeautyImageCountFor('genshin', genshinSearchValues(genshin))),
    formatBeautyCoverage('冷知识', dailyBeautyImageCountFor('fact', [fact.key, fact.title, fact.name, fact.subtitle, fact.body, fact.line])),
    formatBeautyCoverage('书摘', dailyBeautyImageCountFor('book', [book.key, book.title, book.name, book.subtitle, book.body, book.line])),
    formatBeautyCoverage('古诗词', dailyBeautyImageCountFor('poem', [poem.key, poem.title, poem.name, poem.subtitle, poem.body, poem.line])),
    formatBeautyCoverage('紫禁之巅', dailyBeautyImageCountFor('duel', [duelWeapon.key, duelWeapon.name, duelWeapon.style])),
  ];
  return [
    `美图最低标准: 每个对象${DAILY_BEAUTY_MIN_IMAGES_PER_ITEM}张起`,
    `当前签位美图覆盖: ${rows.join(' / ')}`,
    '图片隔离: daily-beauty清单必须写kind和对象标识，不能跨功能混用',
  ];
}

function dailyCardManifestFields(card: DailyCard): Record<string, string> {
  const skinCard = isSkinCard(card) ? card : null;
  return compactDailyImageFields({
    key: card.key,
    name: card.name,
    itemName: card.imageLabel || card.name,
    weapon: skinCard?.weapon,
    skin: skinCard?.name,
  });
}

function dailyTextManifestFields(card: DailyTextCard): Record<string, string> {
  return compactDailyImageFields({
    key: card.key,
    name: card.name,
    itemName: card.name,
    title: card.title,
  });
}

function dailyImageTarget(kind: string, label: string, fields: Record<string, string>, count: number, tags: string[] = ['poster', 'wallpaper', 'artwork']): DailyImageManifestTarget {
  return {
    kind,
    label,
    count,
    ok: count >= DAILY_BEAUTY_MIN_IMAGES_PER_ITEM,
    minImages: DAILY_BEAUTY_MIN_IMAGES_PER_ITEM,
    fields,
    tags,
  };
}

function dailyImageManifestTargets(): DailyImageManifestTarget[] {
  const targets: DailyImageManifestTarget[] = [];
  for (const player of csPlayers) {
    targets.push(dailyImageTarget(
      'player',
      player.nick,
      compactDailyImageFields({ key: player.nick, nick: player.nick, name: player.name }),
      dailyBeautyImageCountFor('player', [player.nick, player.name, ...(player.aliases || [])]),
      ['poster', 'action', 'stage', 'wallpaper'],
    ));
  }
  for (const meta of dailyCsKindMetas.filter((item) => item.kind !== 'skin' && item.kind !== 'loadout')) {
    for (const card of meta.cards) {
      targets.push(dailyImageTarget(meta.kind, card.name, dailyCardManifestFields(card), dailyBeautyImageCountFor(meta.kind, dailyCardManifestSearchValues(card)), meta.imageTags));
    }
  }
  for (const skin of csSkins) {
    targets.push(dailyImageTarget('skin', skin.name, compactDailyImageFields({
      key: skin.key,
      weapon: skin.weapon,
      skin: skin.name,
      name: skin.name,
      itemName: skin.name,
    }), dailyBeautySkinImagesFor(skin).length, ['inspect', 'showcase', 'skin', 'render']));
  }
  for (const knife of csKnives) {
    for (const skin of knifeSkinPoolFor(knife)) {
      targets.push(dailyImageTarget('knife', `${knife.name} | ${skin.name}`, compactDailyImageFields({
        key: knife.key,
        name: knife.name,
        skin: skin.name,
        itemKey: skin.key,
        itemName: `${knife.name} | ${skin.name}`,
      }), dailyBeautyKnifeImagesFor(knife, skin).length, ['inspect', 'showcase', 'knife', 'skin']));
    }
  }
  for (const character of dailyCharacters) {
    targets.push(dailyImageTarget('mokoko', character.name, compactDailyImageFields({
      key: character.key,
      name: character.name,
      characterKey: character.key,
      characterName: character.name,
      itemName: character.name,
    }), dailyBeautyImageCountFor('mokoko', mokokoSearchValues(character)), ['card', 'artwork', 'stage', 'keyvisual', 'bestdori']));
  }
  for (const character of dailyGenshinCharacters) {
    targets.push(dailyImageTarget('genshin', character.name, compactDailyImageFields({
      key: character.key,
      name: character.name,
      characterKey: character.key,
      characterName: character.cn ? `${character.cn} / ${character.name}` : character.name,
      itemName: character.name,
      element: character.element || '',
      region: character.region || '',
      weapon: character.weapon || '',
    }), dailyBeautyImageCountFor('genshin', genshinSearchValues(character)), ['splash', 'artwork', 'card', 'wallpaper', 'official']));
  }
  for (const fact of dailyFacts) {
    targets.push(dailyImageTarget('fact', fact.name, dailyTextManifestFields(fact), dailyBeautyImageCountFor('fact', [fact.key, fact.title, fact.name, fact.subtitle, fact.body, fact.line]), ['poster', 'scene', 'illustration', 'wallpaper']));
  }
  for (const book of dailyBookExcerpts) {
    targets.push(dailyImageTarget('book', book.name, dailyTextManifestFields(book), dailyBeautyImageCountFor('book', [book.key, book.title, book.name, book.subtitle, book.body, book.line]), ['cover', 'artwork', 'scene', 'poster']));
  }
  for (const poem of dailyPoems) {
    targets.push(dailyImageTarget('poem', poem.name, dailyTextManifestFields(poem), dailyBeautyImageCountFor('poem', [poem.key, poem.title, poem.name, poem.subtitle, poem.body, poem.line]), ['scene', 'landscape', 'wallpaper', 'artwork']));
  }
  for (const weapon of duelWeapons) {
    targets.push(dailyImageTarget('duel', weapon.name, compactDailyImageFields({
      key: weapon.key,
      name: weapon.name,
      itemName: weapon.name,
    }), dailyBeautyImageCountFor('duel', [weapon.key, weapon.name, weapon.style]), ['poster', 'action', 'showcase', 'scene']));
  }
  return targets;
}

function dailyBeautyAuditRows(): Array<{ kind: string; label: string; count: number; ok: boolean }> {
  return dailyImageManifestTargets().map((target) => ({
    kind: target.kind,
    label: target.label,
    count: target.count,
    ok: target.ok,
  }));
}

function buildDailyImageAuditReport(limit: number = 30): string {
  const rows = dailyBeautyAuditRows();
  const missing = rows.filter((row) => !row.ok).sort((a, b) => a.count - b.count || a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label));
  const okCount = rows.length - missing.length;
  const shown = missing.slice(0, Math.max(1, Math.min(limit, 80)));
  const lines = [
    '每日图片池全量审计',
    `标准: 每个具体对象${DAILY_BEAUTY_MIN_IMAGES_PER_ITEM}张起，不能混池`,
    `通用每日美图: ${loadDailyBeautyImages().length}张`,
    `达标: ${okCount}/${rows.length}`,
    `未达标: ${missing.length}`,
    '隔离规则: daily-beauty必须写kind和对象标识；刀皮/枪皮按武器+皮肤成对匹配',
    '套餐说明: 今日CS套餐使用战队图+枪皮图，分别按team/skin审计',
  ];
  if (missing.length > 0) {
    lines.push(`未达标前${shown.length}项:`);
    for (const row of shown) lines.push(`${row.kind} ${row.label}: ${row.count}/${DAILY_BEAUTY_MIN_IMAGES_PER_ITEM}`);
    if (missing.length > shown.length) lines.push(`还有${missing.length - shown.length}项未展示，可补齐清单后再查。`);
  } else {
    lines.push('全部对象都达到200张起步。');
  }
  return lines.join('\n');
}

function formatDailyImageTargetFields(target: DailyImageManifestTarget): string {
  return Object.entries(target.fields)
    .filter(([key]) => ['key', 'nick', 'name', 'weapon', 'skin', 'characterKey', 'characterName', 'itemKey', 'itemName'].includes(key))
    .map(([key, value]) => `${key}=${value}`)
    .slice(0, 5)
    .join(' ');
}

function buildDailyImageTemplateReport(limit: number = 12): string {
  const targets = dailyImageManifestTargets();
  const missing = targets
    .filter((target) => !target.ok)
    .sort((a, b) => (a.minImages - a.count) - (b.minImages - b.count) || a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label));
  const shown = missing.slice(0, Math.max(1, Math.min(limit, 40)));
  const lines = [
    '每日图片待补清单',
    `对象总数: ${targets.length}`,
    `未达标: ${missing.length}`,
    '模板文件: data/daily-beauty-images.todo.json',
    'VPS更新: npm run update 会自动写模板、审计、构建、重启',
  ];
  if (shown.length > 0) {
    lines.push(`待补前${shown.length}项:`);
    for (const target of shown) {
      lines.push(`${target.kind} ${target.label}: 还差${Math.max(0, target.minImages - target.count)}张 ${formatDailyImageTargetFields(target)}`);
    }
    if (missing.length > shown.length) lines.push(`还有${missing.length - shown.length}项未展示，模板文件里会放全量缺口。`);
  } else {
    lines.push('当前没有待补项。');
  }
  return lines.join('\n');
}

function buildDailyImageStatusReport(userId: number, scopeId: number, limit: number = 12): string {
  const rows = dailyBeautyAuditRows();
  const missing = rows.filter((row) => !row.ok).sort((a, b) => a.count - b.count || a.kind.localeCompare(b.kind) || a.label.localeCompare(b.label));
  return [
    '每日图片池状态',
    `对象总数: ${rows.length}`,
    `达标: ${rows.length - missing.length}/${rows.length}`,
    `未达标: ${missing.length}`,
    `通用每日美图: ${loadDailyBeautyImages().length}张`,
    ...dailyImageManifestCacheLines(),
    playerCoverageLine(),
    bestdoriCoverageLine(),
    genshinCoverageLine(),
    ...currentDailyBeautyCoverageLines(userId, scopeId),
    missing.length > 0
      ? `优先补: ${missing.slice(0, Math.max(1, Math.min(limit, 20))).map((row) => `${row.kind} ${row.label} ${row.count}/${DAILY_BEAUTY_MIN_IMAGES_PER_ITEM}`).join(' | ')}`
      : '全部对象都达到200张起步。',
    'VPS只跑: npm run update',
  ].join('\n');
}

function buildDailyImageCacheReport(): string {
  return [
    '每日图片缓存状态',
    ...dailyImageManifestCacheLines(),
    '改完清单后不用重启；文件大小或修改时间变化会自动重载。',
  ].join('\n');
}

function buildDailyImageHelp(): string {
  return [
    '每日图片池命令',
    '/dailyimage audit [数量] - 全量审计所有对象是否各自200张起',
    '/dailyimage status - 当前签位和全局图片池状态',
    '/dailyimage cache - 本地清单缓存和匹配缓存状态',
    '/dailyimage template [数量] - 看待补清单摘要',
    '/csplayer status - 当前抽签结果的图片覆盖',
    'VPS只跑: npm run update',
    '脚本会自动拉代码、构建、自检、审计、写 data/daily-beauty-images.todo.json、重启服务。',
  ].join('\n');
}

function dailyImageManifestCacheLines(): string[] {
  loadBestdoriCardImages();
  loadPlayerManifestImages();
  loadGenshinManifestImages();
  loadDailyBeautyImages();
  const stats = getImageManifestCacheStats();
  const hits = stats.reduce((sum, item) => sum + item.hits, 0);
  const reloads = stats.reduce((sum, item) => sum + item.reloads, 0);
  const memoryKB = stats.reduce((sum, item) => sum + item.approxMemoryKB, 0);
  const urlCount = stats.reduce((sum, item) => sum + item.uniqueUrls, 0);
  const matchStats = dailyBeautyMatchCacheStats();
  const lines = [`清单缓存: ${stats.length}份 URL${urlCount} 内存约${memoryKB}KB 命中${hits} 重载${reloads}`];
  lines.push(`美图匹配缓存: ${matchStats.size}/${matchStats.max} 命中${matchStats.hits}/${matchStats.misses} 淘汰${matchStats.evictions}`);
  const localRoot = dailyImagePackRoot();
  const localRel = path.relative(process.cwd(), localRoot).replace(/\\/g, '/') || localRoot;
  lines.push(`本地授权图片包: ${fs.existsSync(localRoot) ? '已发现' : '未发现'} ${localRel}`);
  for (const item of stats.slice(0, 4)) {
    const rel = path.relative(process.cwd(), item.path).replace(/\\/g, '/');
    lines.push(`${item.key}: ${item.exists ? `${item.cards}张/${item.kinds}类/${item.uniqueUrls}URL` : '未放清单'} hit${item.hits} reload${item.reloads} ${rel}${item.lastError ? ` 错误=${item.lastError.slice(0, 48)}` : ''}`);
  }
  return lines;
}

function bestdoriCoverageLine(): string {
  const items = dailyCharacters.map((character) => `${character.key}:${bestdoriCardsForCharacter(character).length}`);
  const total = items.reduce((sum, item) => sum + Number(item.split(':')[1] || 0), 0);
  return `Bestdori角色卡面覆盖: total${total} ${items.join(' ')}`;
}

function playerCoverageLine(): string {
  const counts = csPlayers.map((player) => playerManifestImagesFor(player).length);
  const total = counts.reduce((sum, count) => sum + count, 0);
  const covered = counts.filter((count) => count > 0).length;
  const min = counts.length > 0 ? Math.min(...counts) : 0;
  const max = counts.length > 0 ? Math.max(...counts) : 0;
  return `选手兼容图覆盖: ${covered}/${csPlayers.length} total${total} min${min} max${max}`;
}

function genshinCoverageLine(): string {
  const counts = dailyGenshinCharacters.map((character) => genshinManifestImagesFor(character).length);
  const total = counts.reduce((sum, count) => sum + count, 0);
  const covered = counts.filter((count) => count > 0).length;
  const min = counts.length > 0 ? Math.min(...counts) : 0;
  const max = counts.length > 0 ? Math.max(...counts) : 0;
  return `原神兼容图覆盖: ${covered}/${dailyGenshinCharacters.length} total${total} min${min} max${max}`;
}

function bestdoriCardsForCharacter(character: DailyCharacter): BestdoriCardImage[] {
  const keys = [character.key, character.name, character.page, ...(character.aliases || [])]
    .flatMap((item) => String(item || '').split('/'))
    .map(compactManifestValue)
    .filter(Boolean);
  return loadBestdoriCardImages().filter((card) => {
    const values = [card.key, card.name, card.characterKey, card.characterName, card.title, ...(Array.isArray(card.tags) ? card.tags : [])]
      .map(compactManifestValue)
      .filter(Boolean);
    return values.some((value) => keys.some((key) => value === key || value.includes(key) || key.includes(value)));
  });
}

function rotateManifestCards(cards: BestdoriCardImage[], seedKey: string, userId: number, scopeId: number, limit = DAILY_IMAGE_CANDIDATE_LIMIT): BestdoriCardImage[] {
  if (cards.length === 0) return [];
  const start = dailySeedForKind(seedKey, userId, scopeId) % cards.length;
  return Array.from({ length: Math.min(cards.length, limit) }, (_unused, index) => cards[(start + index) % cards.length]);
}

function playerManifestImagesFor(player: CSPlayer): BestdoriCardImage[] {
  const keys = [player.nick, player.name, ...(player.aliases || [])]
    .map(compactManifestValue)
    .filter(Boolean);
  return preferBeautyManifestImages(loadPlayerManifestImages().filter((card) => {
    const values = [card.key, card.nick, card.name, card.characterKey, card.characterName]
      .map(compactManifestValue)
      .filter(Boolean);
    return values.some((value) => keys.some((key) => value === key || value.includes(key) || key.includes(value)));
  }));
}

function genshinManifestImagesFor(character: DailyGenshinCharacter): BestdoriCardImage[] {
  const keys = [character.key, character.name, character.cn, character.page, character.element, character.region, character.weapon, ...(character.aliases || [])]
    .map(compactManifestValue)
    .filter(Boolean);
  return preferBeautyManifestImages(loadGenshinManifestImages().filter((card) => {
    const values = [card.key, card.name, card.characterKey, card.characterName, card.itemName, card.title, ...(Array.isArray(card.tags) ? card.tags : [])]
      .map(compactManifestValue)
      .filter(Boolean);
    return values.some((value) => keys.some((key) => value === key || value.includes(key) || key.includes(value)));
  }));
}

function mokokoSearchValues(character: DailyCharacter): unknown[] {
  return [
    character.key,
    character.name,
    character.page,
    character.band,
    character.role,
    character.voice,
    character.era,
    character.imageMood,
    ...(character.aliases || []),
  ];
}

function genshinSearchValues(character: DailyGenshinCharacter): unknown[] {
  return [
    character.key,
    character.name,
    character.cn,
    character.page,
    character.tag,
    character.element,
    character.region,
    character.weapon,
    ...(character.aliases || []),
  ];
}

async function buildCsPlayerImageCandidates(player: CSPlayer, userId: number = 0, scopeId: number = 0): Promise<ImageCandidate[]> {
  const beautyCandidates = dailyBeautyCandidatesFor(
    'player',
    player.nick,
    [player.nick, player.name, ...(player.aliases || [])],
    userId,
    scopeId,
  );
  const manifestCandidates = rotateManifestCards(playerManifestImagesFor(player), `csplayer_manifest_${player.nick}`, userId, scopeId)
    .filter((card) => card.url)
    .map((card, index): ImageCandidate => ({
      url: String(card.url),
      label: `${player.nick}/authorized-player/${card.title || index + 1}`,
      source: 'authorized-image',
    }));
  return [
    ...beautyCandidates,
    ...manifestCandidates,
    ...await buildImageCandidates(player.image, player.nick),
  ];
}

function dailyCardManifestSearchValues(card: DailyCard): unknown[] {
  const skinCard = isSkinCard(card) ? card : null;
  return [
    card.key,
    card.name,
    card.imageLabel,
    card.subtitle,
    card.liquipediaPage,
    card.fandomPage,
    card.fandomFile,
    card.playerImageFallback,
    skinCard?.weapon,
    skinCard ? `${skinCard.weapon} ${skinCard.name}` : '',
    skinCard ? `${skinCard.weapon} | ${skinCard.name}` : '',
  ];
}

async function buildDailyCardImageCandidates(kind: string, card: DailyCard, userId: number = 0, scopeId: number = 0): Promise<ImageCandidate[]> {
  const beautyCandidates = kind === 'skin' && isSkinCard(card)
    ? dailyBeautySkinCandidates(card, userId, scopeId)
    : dailyBeautyCandidatesFor(kind, card.name, dailyCardManifestSearchValues(card), userId, scopeId);
  return [
    ...beautyCandidates,
    ...await buildImageCandidates(card.image, undefined, card),
  ];
}

async function buildCharacterImageCandidates(character: DailyCharacter, userId: number = 0, scopeId: number = 0): Promise<ImageCandidate[]> {
  const candidateUrls: ImageCandidate[] = [];
  const bestdoriCards = bestdoriCardsForCharacter(character);
  if (bestdoriCards.length > 0) {
    for (const card of rotateManifestCards(bestdoriCards, `mokoko_bestdori_${character.key}`, userId, scopeId)) {
      if (card.url) {
        candidateUrls.push({
          url: card.url,
          label: `${character.name}/bestdori-card/${card.title || candidateUrls.length + 1}`,
          source: 'bestdori-card',
        });
      }
    }
  }
  candidateUrls.push(...dailyBeautyCandidatesFor(
    'mokoko',
    character.name,
    mokokoSearchValues(character),
    userId,
    scopeId,
  ));
  if (character.file) {
    try {
      const fileUrl = await Promise.race([
        fandomImageResolver(character.file, 'bandori'),
        new Promise<null>((r) => setTimeout(() => r(null), 5000)),
      ]);
      if (fileUrl) {
        candidateUrls.push({
          url: fileUrl,
          label: `${character.name}/bandori-file`,
          source: 'fandom-file',
        });
      }
    } catch (err) {
      logger.warn(`[fun] ${character.name} Bandori文件图解析失败:`, err);
    }
  }
  try {
    const pageUrl = await Promise.race([
      fandomPageImageResolver(character.page, 'bandori'),
      new Promise<null>((r) => setTimeout(() => r(null), 5000)),
    ]);
    if (pageUrl) {
      candidateUrls.push({
        url: pageUrl,
        label: `${character.name}/bandori-page`,
        source: 'fandom-page',
      });
    }
  } catch (err) {
    logger.warn(`[fun] ${character.name} Bandori页面图解析失败:`, err);
  }
  const seen = new Set<string>();
  return candidateUrls.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

async function buildGenshinImageCandidates(character: DailyGenshinCharacter, userId: number = 0, scopeId: number = 0): Promise<ImageCandidate[]> {
  const candidateUrls: ImageCandidate[] = dailyBeautyCandidatesFor(
    'genshin',
    character.name,
    genshinSearchValues(character),
    userId,
    scopeId,
  );
  const manifestCards = rotateManifestCards(genshinManifestImagesFor(character), `genshin_manifest_${character.key}`, userId, scopeId);
  for (const card of manifestCards) {
    if (!card.url) continue;
    candidateUrls.push({
      url: card.url,
      label: `${character.name}/authorized-genshin/${card.title || candidateUrls.length + 1}`,
      source: 'authorized-image',
    });
  }
  const fileCandidates = [
    `Character ${character.name} Card.png`,
    `${character.name} Card.png`,
    `Character ${character.name} Portrait.png`,
    `${character.name} Icon.png`,
    ...(character.cn ? [
      `Character ${character.cn} Card.png`,
      `${character.cn} Card.png`,
      `Character ${character.cn} Portrait.png`,
      `${character.cn} Icon.png`,
    ] : []),
  ];
  const resolvedFiles = await Promise.all(fileCandidates.map(async (filename) => {
    try {
      return {
        filename,
        url: await Promise.race([
          fandomImageResolver(filename, 'genshin'),
          new Promise<null>((r) => setTimeout(() => r(null), 3500)),
        ]),
      };
    } catch (err) {
      logger.warn(`[fun] ${character.name} Genshin文件图解析失败:`, err);
      return { filename, url: null };
    }
  }));
  for (const item of resolvedFiles) {
    if (!item.url) continue;
    candidateUrls.push({
      url: item.url,
      label: `${character.name}/genshin-file/${item.filename}`,
      source: 'fandom-file',
    });
  }
  try {
    const pageUrl = await Promise.race([
      fandomPageImageResolver(character.page, 'genshin'),
      new Promise<null>((r) => setTimeout(() => r(null), 5000)),
    ]);
    if (pageUrl) {
      candidateUrls.push({
        url: pageUrl,
        label: `${character.name}/genshin-page`,
        source: 'fandom-page',
      });
    }
  } catch (err) {
    logger.warn(`[fun] ${character.name} Genshin页面图解析失败:`, err);
  }
  const seen = new Set<string>();
  return candidateUrls.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

async function buildDuelImageCandidates(weapon: DailyDuelWeapon, userId: number = 0, scopeId: number = 0): Promise<ImageCandidate[]> {
  const candidates: ImageCandidate[] = dailyBeautyCandidatesFor(
    'duel',
    weapon.name,
    [weapon.key, weapon.name, weapon.style],
    userId,
    scopeId,
  );
  if (weapon.image) {
    candidates.push({ url: weapon.image, label: `${weapon.name}/static`, source: 'static-url' });
  }
  if (weapon.fandomFile) {
    try {
      const fandomUrl = await Promise.race([
        fandomImageResolver(weapon.fandomFile, 'counterstrike'),
        new Promise<null>((r) => setTimeout(() => r(null), 5000)),
      ]);
      if (fandomUrl) candidates.push({ url: fandomUrl, label: `${weapon.name}/${weapon.fandomFile}`, source: 'fandom-file' });
    } catch (err) {
      logger.warn(`[fun] ${weapon.name} 紫禁之巅图片解析失败:`, err);
    }
  }
  const seen = new Set<string>();
  return candidates.filter((item) => {
    if (!item.url || seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

async function buildCsPlayerMessage(userId: number, player: CSPlayer, score?: number, scopeId: number = 0): Promise<MessageSegment[]> {
  const scoreText = typeof score === 'number' ? `${scoreLine(score)} ${score}/100` : '';
  const roleAdvice = playerRoleAdvice(player, score);
  const text = [
    `今日CS选手 | ${player.nick}`,
    scoreText,
    `${player.team} / ${player.role}`,
    `真名：${player.name}`,
    `今天打法：${roleAdvice.style}`,
    `别急点：${roleAdvice.avoid}`,
    `今日短评：${player.note}`,
    ...buildCsPlayerRichLines(player, score, userId, scopeId),
  ].filter(Boolean).join('\n');
  const message: MessageSegment[] = [
    { type: 'at', data: { qq: String(userId) } },
    { type: 'text', data: { text: ` ${text}` } },
  ];
  message.push(...await imageFromCandidatesOrCard(await buildCsPlayerImageCandidates(player, userId, scopeId), {
    key: `player-${player.nick}`,
    title: '今日CS选手',
    name: player.nick,
    subtitle: `${player.team} / ${player.role}`,
    scoreLabel: '签位',
    advice: roleAdvice.style,
    avoid: roleAdvice.avoid,
    line: player.note,
    imageLabel: player.nick,
  }, typeof score === 'number' ? score : dailyPlayerScore(userId, scopeId)));
  return message;
}

async function buildPrivateCsPlayerMessage(player: CSPlayer, score?: number, userId: number = 0, scopeId: number = 0): Promise<MessageSegment[]> {
  const message = (await buildCsPlayerMessage(userId, player, score, scopeId)).filter((seg) => seg.type !== 'at');
  return message;
}

async function buildDailyCardMessage(userId: number, card: DailyCard, score: number, isPrivate: boolean, kind: string = 'daily', scopeId: number = 0): Promise<MessageSegment[]> {
  const text = [
    `${card.title} | ${card.name}`,
    card.subtitle,
    `${card.scoreLabel}：${score}/100`,
    `今天打法：${card.advice}`,
    `别急点：${card.avoid}`,
    `今日短评：${card.line}`,
    ...dailyExecutionLines(kind, card.name, userId, scopeId),
  ].join('\n');
  const message: MessageSegment[] = [];
  if (!isPrivate) message.push({ type: 'at', data: { qq: String(userId) } });
  message.push({ type: 'text', data: { text: isPrivate ? text : ` ${text}` } });
  message.push(...await imageFromCandidatesOrCard(await buildDailyCardImageCandidates(kind, card, userId, scopeId), card, score));
  return message;
}

async function buildSkinMessage(userId: number, skin: SkinCard, score: number, isPrivate: boolean, scopeId: number = 0): Promise<MessageSegment[]> {
  const text = [
    `${skin.title} | ${skin.name}`,
    `${skin.weapon} / ${skin.rarity}`,
    skin.subtitle,
    `${skin.scoreLabel}：${score}/100`,
    `今天打法：${skin.advice}`,
    `别急点：${skin.avoid}`,
    `今日短评：${skin.line}`,
    ...dailyExecutionLines('skin', skin.name, userId, scopeId),
  ].join('\n');
  const message: MessageSegment[] = [];
  if (!isPrivate) message.push({ type: 'at', data: { qq: String(userId) } });
  message.push({ type: 'text', data: { text: isPrivate ? text : ` ${text}` } });
  message.push(...await imageFromCandidatesOrCard(await buildDailyCardImageCandidates('skin', localSkinCard(skin), userId, scopeId), localSkinCard(skin), score));
  return message;
}

async function buildWeaponMessage(userId: number, weapon: DailyCard, skin: SkinCard, score: number, isPrivate: boolean, scopeId: number = 0): Promise<MessageSegment[]> {
  const text = [
    `${weapon.title} | ${weapon.name}`,
    weapon.subtitle,
    `${weapon.scoreLabel}：${score}/100`,
    `配套皮肤：${skin.name} (${skin.rarity})`,
    `今天打法：${weapon.advice}`,
    `皮肤加成：${skin.advice}`,
    `别急点：${weapon.avoid}`,
    `今日短评：${weapon.line}`,
    ...dailyExecutionLines('weapon', `${weapon.name} + ${skin.name}`, userId, scopeId),
  ].join('\n');
  const message: MessageSegment[] = [];
  if (!isPrivate) message.push({ type: 'at', data: { qq: String(userId) } });
  message.push({ type: 'text', data: { text: isPrivate ? text : ` ${text}` } });
  message.push(...await imageFromCandidatesOrCard(await buildDailyCardImageCandidates('weapon', weapon, userId, scopeId), weapon, score));
  message.push(...await imageFromCandidatesOrCard(await buildDailyCardImageCandidates('skin', localSkinCard(skin), userId, scopeId), localSkinCard(skin), score));
  return message;
}

async function buildKnifeMessage(userId: number, knife: KnifeCard, skin: KnifeSkin, score: number, isPrivate: boolean, scopeId: number = 0): Promise<MessageSegment[]> {
  const card: DailyCard = {
    key: `knife-${knife.key}-${skin.key}`,
    title: '今日发刀',
    name: `${knife.name} | ${skin.name}`,
    subtitle: `${knife.subtitle} / ${skin.rarity}`,
    scoreLabel: '刀运指数',
    advice: `${knife.advice} ${skin.advice}`,
    avoid: `${knife.avoid} ${skin.avoid}`,
    line: `${knife.line} ${skin.line}`,
    imageLabel: `${knife.name} ${skin.name}`,
  };
  const text = [
    `${card.title} | ${knife.name}`,
    `皮肤：${skin.name} (${skin.rarity})`,
    knife.subtitle,
    `${card.scoreLabel}：${score}/100`,
    `今天打法：${card.advice}`,
    `别急点：${card.avoid}`,
    `今日短评：${card.line}`,
    ...dailyExecutionLines('knife', `${knife.name} ${skin.name}`, userId, scopeId),
  ].join('\n');
  const message: MessageSegment[] = [];
  if (!isPrivate) message.push({ type: 'at', data: { qq: String(userId) } });
  message.push({ type: 'text', data: { text: isPrivate ? text : ` ${text}` } });
  message.push(...await imageFromCandidatesOrCard(await buildKnifeImageCandidates(knife, skin, userId, scopeId), card, score));
  return message;
}

async function buildMokokoMessage(userId: number, character: DailyCharacter, score: number, isPrivate: boolean, scopeId: number = 0): Promise<MessageSegment[]> {
  const card: DailyCard = {
    key: `mokoko-${character.key}`,
    title: character.title,
    name: character.name,
    subtitle: `${character.band} / ${character.role}`,
    scoreLabel: '木柜子指数',
    advice: character.note,
    avoid: '别把每日木柜子当CS事实，这条是纯角色抽签。',
    line: `${character.band} ${character.role}，CV：${character.voice}`,
    imageLabel: character.name,
  };
  const text = [
    `${character.title} | ${character.name}`,
    `${character.band} / ${character.role}`,
    `CV：${character.voice}`,
    character.era ? `关系线：${character.era}` : '',
    `木柜子指数：${score}/100`,
    `今日短评：${character.note}`,
    character.imageMood ? `配图偏好：${character.imageMood}` : '',
    ...buildMokokoRichLines(character, score, userId, scopeId),
  ].filter(Boolean).join('\n');
  const message: MessageSegment[] = [];
  if (!isPrivate) message.push({ type: 'at', data: { qq: String(userId) } });
  message.push({ type: 'text', data: { text: isPrivate ? text : ` ${text}` } });
  message.push(...await imageFromCandidatesOrCard(await buildCharacterImageCandidates(character, userId, scopeId), card, score));
  return message;
}

async function buildGenshinMessage(userId: number, character: DailyGenshinCharacter, score: number, isPrivate: boolean, scopeId: number = 0): Promise<MessageSegment[]> {
  const card: DailyCard = {
    key: `genshin-${character.key}`,
    title: character.title,
    name: character.cn ? `${character.cn} / ${character.name}` : character.name,
    subtitle: [character.tag, character.element, character.region, character.weapon].filter(Boolean).join(' / '),
    scoreLabel: '共鸣指数',
    advice: character.note,
    avoid: '别把今日角色当抽卡建议，先看钱包和版本安排。',
    line: `${character.tag}，今天把节奏打稳一点。`,
    imageLabel: character.cn ? `${character.cn} ${character.name}` : character.name,
  };
  const text = [
    `${character.title} | ${character.cn ? `${character.cn} / ${character.name}` : character.name}`,
    [character.element ? `元素：${character.element}` : '', character.region ? `地区：${character.region}` : '', character.weapon ? `武器：${character.weapon}` : ''].filter(Boolean).join(' / '),
    character.aliases?.length ? `别名：${character.aliases.slice(0, 4).join(' / ')}` : '',
    `今日关键词：${character.tag}`,
    `共鸣指数：${score}/100`,
    `今日短评：${character.note}`,
    ...buildGenshinRichLines(character, score, userId, scopeId),
    '提醒：这只是每日角色签，不是抽卡建议。',
  ].filter(Boolean).join('\n');
  const message: MessageSegment[] = [];
  if (!isPrivate) message.push({ type: 'at', data: { qq: String(userId) } });
  message.push({ type: 'text', data: { text: isPrivate ? text : ` ${text}` } });
  message.push(...await imageFromCandidatesOrCard(await buildGenshinImageCandidates(character, userId, scopeId), card, score));
  return message;
}

function dailyTextCardAsImageCard(card: DailyTextCard): DailyCard {
  return {
    key: card.key,
    title: card.title,
    name: card.name,
    subtitle: card.subtitle,
    scoreLabel: card.scoreLabel,
    advice: card.advice,
    avoid: '',
    line: card.line,
    imageLabel: card.name,
  };
}

async function buildDailyTextImageCandidates(kind: string, card: DailyTextCard, userId: number = 0, scopeId: number = 0): Promise<ImageCandidate[]> {
  return dailyBeautyCandidatesFor(
    kind,
    card.name,
    [card.key, card.title, card.name, card.subtitle, card.body, card.line],
    userId,
    scopeId,
  );
}

async function buildDailyTextCardMessage(userId: number, card: DailyTextCard, score: number, isPrivate: boolean, kind: string = 'text', scopeId: number = 0): Promise<MessageSegment[]> {
  const text = [
    `${card.title} | ${card.name}`,
    card.subtitle,
    `${card.scoreLabel}：${score}/100`,
    card.body,
    `今日短评：${card.line}`,
    `可以试试：${card.advice}`,
    ...buildDailyTextRichLines(kind, card, score, userId, scopeId),
  ].join('\n');
  const message: MessageSegment[] = [];
  if (!isPrivate) message.push({ type: 'at', data: { qq: String(userId) } });
  message.push({ type: 'text', data: { text: isPrivate ? text : ` ${text}` } });
  const imageCard = dailyTextCardAsImageCard(card);
  message.push(...await imageFromCandidatesOrCard(await buildDailyTextImageCandidates(kind, card, userId, scopeId), imageCard, score));
  return message;
}

function duelOutcome(userWeapon: DailyDuelWeapon, botWeapon: DailyDuelWeapon, userId: number, scopeId: number): {
  winner: 'user' | 'bot' | 'draw';
  title: string;
  detail: string;
  userRoll: number;
  botRoll: number;
} {
  const chaos = dailySeedForKind(`daily_duel_chaos_${userWeapon.key}_${botWeapon.key}`, userId, scopeId) % 41;
  const userRoll = userWeapon.power + Math.floor(userWeapon.tempo / 3) + (chaos % 21);
  const botRoll = botWeapon.power + Math.floor(botWeapon.tempo / 3) + ((chaos * 7) % 21);
  if (Math.abs(userRoll - botRoll) <= 4) {
    return {
      winner: 'draw',
      title: '平局收场',
      detail: `${userWeapon.name} 和 ${botWeapon.name} 打到最后谁也没服，紫禁之巅只剩一地节目效果。`,
      userRoll,
      botRoll,
    };
  }
  if (userRoll > botRoll) {
    return {
      winner: 'user',
      title: '你赢了',
      detail: `${userWeapon.name} ${userWeapon.style}，硬是压过了机器的 ${botWeapon.name}。`,
      userRoll,
      botRoll,
    };
  }
  return {
    winner: 'bot',
    title: '机器赢了',
    detail: `机器掏出 ${botWeapon.name} 打出 ${botWeapon.style}，你这把 ${userWeapon.name} 差了半口气。`,
    userRoll,
    botRoll,
  };
}

async function buildDailyDuelMessage(userId: number, scopeId: number, isPrivate: boolean): Promise<MessageSegment[]> {
  const userWeapon = dailyDuelPlayerWeaponFor(userId, scopeId);
  const botWeapon = dailyDuelBotWeaponFor(userId, scopeId);
  const outcome = duelOutcome(userWeapon, botWeapon, userId, scopeId);
  const score = dailyScoreForKind('daily_duel', userId, scopeId);
  const card: DailyCard = {
    key: `duel-${userWeapon.key}-${botWeapon.key}`,
    title: '每日决战紫禁之巅',
    name: `${userWeapon.name} VS ${botWeapon.name}`,
    subtitle: outcome.title,
    scoreLabel: '节目效果',
    advice: outcome.detail,
    avoid: '',
    line: `${userWeapon.line} / ${botWeapon.line}`,
    imageLabel: `${userWeapon.name} VS ${botWeapon.name}`,
  };
  const text = [
    '每日决战紫禁之巅',
    `你：${userWeapon.name}（${userWeapon.style}）`,
    `机器：${botWeapon.name}（${botWeapon.style}）`,
    `结果：${outcome.title}`,
    `判定：${outcome.detail}`,
    `战力：你 ${outcome.userRoll} / 机器 ${outcome.botRoll}`,
    `节目效果：${score}/100`,
    ...buildDuelRichLines(userWeapon, botWeapon, outcome, userId, scopeId),
    ...dailyExecutionLines('duel', `${userWeapon.name} VS ${botWeapon.name}`, userId, scopeId),
  ].join('\n');
  const message: MessageSegment[] = [];
  if (!isPrivate) message.push({ type: 'at', data: { qq: String(userId) } });
  message.push({ type: 'text', data: { text: isPrivate ? text : ` ${text}` } });
  const candidates = [
    ...await buildDuelImageCandidates(userWeapon, userId, scopeId),
    ...await buildDuelImageCandidates(botWeapon, userId, scopeId),
  ];
  message.push(...await imageFromCandidatesOrCard(candidates, card, score));
  return message;
}

async function buildLoadoutMessage(userId: number, scopeId: number, isPrivate: boolean): Promise<MessageSegment[]> {
  const team = dailyCardFor('csteam_pack', userId, scopeId, csTeams);
  const map = dailyCardFor('csmap_pack', userId, scopeId, csMaps);
  const weapon = dailyCardFor('csweapon_pack', userId, scopeId, csWeapons);
  const skin = dailySkinForWeapon(weapon, userId, scopeId);
  const role = dailyCardFor('csrole_pack', userId, scopeId, csRoles);
  const score = dailyScoreForKind('csloadout', userId, scopeId);
  const text = [
    '今日CS套餐',
    `队伍：${team.name}`,
    `地图：${map.name}`,
    `武器：${weapon.name}`,
    `皮肤：${skin.name}`,
    `定位：${role.name}`,
    `综合节目效果：${score}/100`,
    `今天打法：${role.advice} ${weapon.advice}`,
    `皮肤加成：${skin.advice}`,
    `别急点：${map.avoid}`,
    `今日短评：${score >= 80 ? '这套签有点东西，今天可以稍微主动一点。' : score >= 45 ? '能打，但别把自己当主角。' : '这套先稳住，别上来就送大的。'}`,
  ].join('\n');
  const message: MessageSegment[] = [];
  if (!isPrivate) message.push({ type: 'at', data: { qq: String(userId) } });
  message.push({ type: 'text', data: { text: isPrivate ? text : ` ${text}` } });
  message.push(...await imageFromCandidatesOrCard(await buildDailyCardImageCandidates('team', team, userId, scopeId), team, score));
  message.push(...await imageFromCandidatesOrCard(await buildDailyCardImageCandidates('skin', localSkinCard(skin), userId, scopeId), localSkinCard(skin), score));
  return message;
}

const csQuizKinds: CsQuizKind[] = ['map', 'weapon', 'utility', 'tactic', 'clutch'];

function quizScoreLine(score: number): string {
  if (score >= 90) return '题感爆棚';
  if (score >= 75) return '理解在线';
  if (score >= 55) return '正常发挥';
  if (score >= 35) return '先别嘴硬';
  return '今天补课';
}

function quizOptionLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

function finalizeCsQuiz(quiz: CsQuiz, userId: number, scopeId: number): CsQuiz {
  const ranked = quiz.options
    .map((option, index) => ({
      option,
      originalIndex: index,
      rank: dailySeedForKind(`csquiz_option_${quiz.kind}_${index}`, userId, scopeId),
    }))
    .sort((a, b) => a.rank - b.rank || a.originalIndex - b.originalIndex);
  const correctOptionIndex = ranked.findIndex((item) => item.originalIndex === quiz.correctOptionIndex);
  const correctLabel = quizOptionLabel(correctOptionIndex >= 0 ? correctOptionIndex : 0);
  const answer = /^选\s*[A-Z一二三123][。.．,，:：\s]*/i.test(quiz.answer)
    ? quiz.answer.replace(/^选\s*[A-Z一二三123][。.．,，:：\s]*/i, `选 ${correctLabel}。`)
    : `选 ${correctLabel}。${quiz.answer}`;
  return {
    ...quiz,
    options: ranked.map((item) => item.option),
    correctOptionIndex: correctOptionIndex >= 0 ? correctOptionIndex : 0,
    answer,
  };
}

function normalizeCsQuizChoice(input: string): number | null {
  const text = normalizeDrawText(input || '');
  if (!text) return null;
  const match = text.match(/^(?:answer|ans|check|答案|答题|提交|选择|选)?([abc123一二三])$/i);
  if (!match) return null;
  const token = match[1].toLowerCase();
  if (token === 'a' || token === '1' || token === '一') return 0;
  if (token === 'b' || token === '2' || token === '二') return 1;
  if (token === 'c' || token === '3' || token === '三') return 2;
  return null;
}

function parseCsQuizAnswerArgs(args: string[]): number | null {
  if (args.length === 0) return null;
  const first = (args[0] || '').toLowerCase();
  const rest = ['answer', 'ans', 'check', 'submit', 'choose', '答', '答案', '答题', '提交', '选择', '选'].includes(first)
    ? args.slice(1)
    : args;
  return normalizeCsQuizChoice(rest.join(' '));
}

function isCsQuizAnswerArgs(args: string[]): boolean {
  if (args.length === 0) return false;
  const first = (args[0] || '').toLowerCase();
  return ['answer', 'ans', 'check', 'submit', 'choose', '答', '答案', '答题', '提交', '选择', '选'].includes(first)
    || parseCsQuizAnswerArgs(args) !== null;
}

function formatCsQuizAnswer(userId: number, scopeId: number, args: string[]): string {
  const quiz = dailyCsQuizFor(userId, scopeId);
  const choiceIndex = parseCsQuizAnswerArgs(args);
  const choices = quiz.options.map((option, index) => `${quizOptionLabel(index)}. ${option}`).join(' / ');
  if (choiceIndex === null || choiceIndex < 0 || choiceIndex >= quiz.options.length) {
    return [
      `今日CS小考判分 | ${todayKey()}`,
      `题型：${quiz.title}`,
      `题目：${quiz.question}`,
      `选项：${choices}`,
      '用法：/csquiz answer A  或  /csquiz 答 B',
      '真话边界：这是本地每日小考，不是实时赛事事实；问赛程/赛果用 /cs brief。',
    ].join('\n');
  }
  const correct = choiceIndex === quiz.correctOptionIndex;
  const choiceLabel = quizOptionLabel(choiceIndex);
  const correctLabel = quizOptionLabel(quiz.correctOptionIndex);
  return [
    `今日CS小考判分 | ${todayKey()}`,
    `题型：${quiz.title}`,
    `你的选择：${choiceLabel}. ${quiz.options[choiceIndex]}`,
    `结果：${correct ? '对了，有点东西' : '不对，先别嘴硬'}`,
    `正确参考：${correctLabel}. ${quiz.options[quiz.correctOptionIndex]}`,
    `解析：${quiz.answer}`,
    `机器短评：${correct ? '这波理解在线，下一把别开香槟。' : quiz.comment}`,
    '继续：/csquiz 看今日题面；/cstrain 按这个短板练一组。',
    '真话边界：这是本地每日小考，不是实时赛事事实；问赛程/赛果用 /cs brief。',
  ].join('\n');
}

function dailyCsQuizFor(userId: number, scopeId: number): CsQuiz {
  const kind = csQuizKinds[dailySeedForKind('csquiz_kind', userId, scopeId) % csQuizKinds.length];
  const player = dailyPlayerFor(userId, scopeId);
  const map = dailyCardFor('csquiz_map', userId, scopeId, csMaps);
  const weapon = dailyCardFor('csquiz_weapon', userId, scopeId, csWeapons);
  const role = dailyCardFor('csquiz_role', userId, scopeId, csRoles);
  const utility = dailyCardFor('csquiz_utility', userId, scopeId, csUtilities);
  const tactic = dailyCardFor('csquiz_tactic', userId, scopeId, csTactics);
  const clutch = dailyCardFor('csquiz_clutch', userId, scopeId, csClutches);
  const score = dailyScoreForKind('csquiz', userId, scopeId);
  const comment = score >= 80
    ? `这题不难，${player.nick}签给你加点理解分，但别答完就开香槟。`
    : score >= 45
      ? `能答，关键是别只会喊枪软，要把回合目的说清楚。`
      : `今天先补基本功，别急着当解说，先把选项看完。`;

  if (kind === 'map') {
    return finalizeCsQuiz({
      kind,
      title: '地图决策',
      context: `${map.name} / ${utility.name}`,
      question: `今天抽到 ${map.name}，开局默认最该先服务哪件事？`,
      options: [
        `用${utility.name}先拿关键区域信息，再决定提速还是控图`,
        '不等道具直接干拉，赢了就是天才，输了怪队友',
        '五个人各玩各的，等对面自己送一波大的',
      ],
      correctOptionIndex: 0,
      answer: `选 A。${map.advice} ${utility.advice}`,
      comment,
      score,
    }, userId, scopeId);
  }

  if (kind === 'weapon') {
    return finalizeCsQuiz({
      kind,
      title: '枪械定位',
      context: `${weapon.name} / ${role.name}`,
      question: `今天主枪是 ${weapon.name}，搭配 ${role.name}，最怕犯哪种错？`,
      options: [
        '按定位打交换和补枪距离，先把回合打完整',
        '枪好就单摸找镜头，队友在哪不重要',
        '经济不够也硬起当大哥，反正节目效果拉满',
      ],
      correctOptionIndex: 0,
      answer: `选 A。${weapon.advice} ${role.advice}`,
      comment,
      score,
    }, userId, scopeId);
  }

  if (kind === 'utility') {
    return finalizeCsQuiz({
      kind,
      title: '道具时机',
      context: `${map.name} / ${utility.name}`,
      question: `${map.name} 上要用 ${utility.name}，丢之前最该先问自己什么？`,
      options: [
        '这颗道具服务谁、服务哪个 timing、队友能不能接上',
        '先扔了再说，反正包里有道具不用白不用',
        '闪到队友也没事，回头说一句“我尽力了”',
      ],
      correctOptionIndex: 0,
      answer: `选 A。${utility.advice} 道具不是摆设，目的和配合要先讲明白。`,
      comment,
      score,
    }, userId, scopeId);
  }

  if (kind === 'tactic') {
    return finalizeCsQuiz({
      kind,
      title: '战术选择',
      context: `${map.name} / ${tactic.name}`,
      question: `今天战术签是「${tactic.name}」，开局最该统一什么？`,
      options: [
        '默认、交换距离和第一颗关键道具，先把节奏说清楚',
        '开局五人静音各玩各的，输了就说对面太准',
        '每回合都提速一波，反正慢下来就不像节目效果',
      ],
      correctOptionIndex: 0,
      answer: `选 A。${tactic.advice} 地图是 ${map.name}，别把战术打成散步。`,
      comment,
      score,
    }, userId, scopeId);
  }

  return finalizeCsQuiz({
    kind,
    title: '残局判断',
    context: `${clutch.name} / ${role.name}`,
    question: `进入「${clutch.name}」局面，剩你处理关键残局，第一反应应该是什么？`,
    options: [
      '先确认时间、包点信息和可能枪位，再决定找人还是拖',
      '脚步拉满直接找人拼，打赢了就是名场面',
      '边拆边嘴硬，赌对面刚好不看包',
    ],
    correctOptionIndex: 0,
    answer: `选 A。${clutch.advice} 残局别急着证明自己，信息先拿明白。`,
    comment,
    score,
  }, userId, scopeId);
}

function buildCsQuizMessage(userId: number, scopeId: number, isPrivate: boolean): MessageSegment[] {
  const quiz = dailyCsQuizFor(userId, scopeId);
  const options = quiz.options.map((option, index) => `${String.fromCharCode(65 + index)}. ${option}`).join(' / ');
  const text = [
    `今日CS小考 | ${todayKey()}`,
    `题型：${quiz.title}`,
    `场景：${quiz.context}`,
    `题感：${quiz.score}/100 ${quizScoreLine(quiz.score)}`,
    `题目：${quiz.question}`,
    `选项：${options}`,
    '参考判断：先别偷看，答完用 /csquiz answer A/B/C 看解析。',
    '答题：/csquiz answer A  或  /csquiz 答 B',
    `机器短评：${quiz.comment}`,
    '真话边界：这是本地每日小考，不是实时赛事事实；问赛程/赛果用 /cs brief。',
  ].join('\n');
  const card: DailyCard = {
    key: `csquiz-${quiz.kind}`,
    title: '今日CS小考',
    name: quiz.title,
    subtitle: quiz.context,
    scoreLabel: '题感',
    advice: '先选 A/B/C，再用 /csquiz answer 提交。',
    avoid: '别把本地小考当实时赛事结论。',
    line: quiz.comment,
  };
  const message: MessageSegment[] = [];
  if (!isPrivate) message.push({ type: 'at', data: { qq: String(userId) } });
  message.push({ type: 'text', data: { text: isPrivate ? text : ` ${text}` } });
  message.push(localDailyCardImage(card, quiz.score));
  return message;
}

function trainingIntensity(score: number): { label: string; warmup: number; aim: number; utility: number; review: number } {
  if (score >= 85) return { label: '上强度', warmup: 10, aim: 18, utility: 14, review: 8 };
  if (score >= 65) return { label: '正常强度', warmup: 8, aim: 15, utility: 12, review: 6 };
  if (score >= 40) return { label: '稳住手感', warmup: 6, aim: 12, utility: 10, review: 5 };
  return { label: '轻量校准', warmup: 5, aim: 10, utility: 8, review: 5 };
}

function weaponTrainingTask(weapon: DailyCard, score: number): string {
  const kills = score >= 75 ? 120 : score >= 45 ? 90 : 60;
  switch (weapon.key) {
    case 'ak47':
      return `AK急停和预瞄 ${kills} kill：前30枪只许单点/两连发，别一急就开始泼水。`;
    case 'm4a1s':
      return `M4A1-S控枪转移 ${kills} kill：每杀一个就换身位，练偷人，不练站桩。`;
    case 'awp':
      return `AWP架点反应 50枪：空枪立刻后撤换点，今天重点练“不送第二枪”。`;
    case 'deagle':
      return `沙鹰一发头 60次：只打停稳后的第一发，七发全空就别嘴硬，重来一组。`;
    case 'mp9':
      return `MP9近点横拉 ${kills} kill：只打短距离和绕后路线，别拿它和AK中远距离讲道理。`;
    case 'mac10':
      return `MAC-10第一身位 ${kills} kill：练吃闪后提速，死也要把信息和站位换出来。`;
    case 'galil':
      return `Galil压枪转移 ${kills} kill：穷哥们枪也要打干净，重点练前10发弹道。`;
    default:
      return `${weapon.name}基础枪法 ${kills} kill：急停、预瞄、补枪距离三件事别丢。`;
  }
}

function mapUtilitySet(map: DailyCard): string[] {
  const sets: Record<string, string[]> = {
    mirage: ['A点进攻烟', '拱门闪', '跳台火'],
    inferno: ['香蕉道控制火', 'CT烟', '棺材闪'],
    nuke: ['外场一线烟', '铁板火', '黄房闪'],
    ancient: ['中路烟', 'B坡火', '红房闪'],
    anubis: ['水路烟', 'A点火', '中路闪'],
    dust2: ['Xbox烟', '长门闪', 'B门烟'],
    overpass: ['厕所烟', '工地火', '长管闪'],
  };
  return sets[map.key] || ['默认进攻烟', '清点火', '回防闪'];
}

function utilityTrainingTask(map: DailyCard, utility: DailyCard, minutes: number): string {
  const [smoke, fire, flash] = mapUtilitySet(map);
  switch (utility.key) {
    case 'flash':
      return `${minutes}分钟 ${map.name} 闪光：练 ${flash}，每次先报闪再peek，连续成功8次才算过。`;
    case 'smoke':
      return `${minutes}分钟 ${map.name} 烟：练 ${smoke}，落点歪一次就重丢，别硬说是新战术。`;
    case 'molotov':
      return `${minutes}分钟 ${map.name} 火：练 ${fire}，目标是逼位移和拖时间，不是烧空气。`;
    case 'he':
      return `${minutes}分钟 ${map.name} 雷：围绕 ${fire} 做反清压血，配枪线一起给，别开局随手丢心理安慰。`;
    case 'decoy':
      return `${minutes}分钟 ${map.name} 骗信息：用诱饵配合 ${smoke} 做假动静，但别把整套战术押在诱饵上。`;
    case 'kit':
      return `${minutes}分钟 ${map.name} 回防：从两个入口各跑5次，拆包前先清 ${smoke} 附近枪位，别到包前才找钳。`;
    default:
      return `${minutes}分钟 ${map.name} 道具：烟火闪各练一颗，要求能讲清楚目的和时机。`;
  }
}

function roleTrainingTask(role: DailyCard, tactic: DailyCard, clutch: DailyCard): string {
  switch (role.key) {
    case 'entry':
      return `实战目标：突破时只记两件事，吃闪出点、死前报人数枪位；战术按「${tactic.name}」执行，别一个人开故事。`;
    case 'support':
      return `实战目标：每回合至少做一次有效补闪或补烟；残局按「${clutch.name}」复盘，镜头少不等于价值低。`;
    case 'anchor':
      return `实战目标：守点先拖5秒再想杀人；被打进点后按「${clutch.name}」练回防纪律，别脚步一响就全交。`;
    case 'lurker':
      return `实战目标：侧翼到位前少露信息；配合「${tactic.name}」抓timing，别绕到最后队友全没了。`;
    case 'igl':
      return `实战目标：开局给一个默认计划，中期只改一个重点；输回合后用「${tactic.name}」复盘原因，不要只喊枪软。`;
    case 'awper-role':
      return `实战目标：每个架点只贪一枪，空枪立刻换位；残局按「${clutch.name}」处理高价值武器。`;
    default:
      return `实战目标：围绕「${tactic.name}」打清楚交换和信息，残局用「${clutch.name}」复盘。`;
  }
}

function buildCsTrainingMessage(userId: number, scopeId: number, isPrivate: boolean, predictHint = '', historyHint = '', profileHint = ''): MessageSegment[] {
  const player = dailyPlayerFor(userId, scopeId);
  const map = dailyCardFor('cstrain_map', userId, scopeId, csMaps);
  const weapon = dailyCardFor('cstrain_weapon', userId, scopeId, csWeapons);
  const role = dailyCardFor('cstrain_role', userId, scopeId, csRoles);
  const utility = dailyCardFor('cstrain_utility', userId, scopeId, csUtilities);
  const tactic = dailyCardFor('cstrain_tactic', userId, scopeId, csTactics);
  const clutch = dailyCardFor('cstrain_clutch', userId, scopeId, csClutches);
  const score = dailyScoreForKind('cstrain', userId, scopeId);
  const intensity = trainingIntensity(score);
  const total = intensity.warmup + intensity.aim + intensity.utility + intensity.review;
  const shortNote = score >= 80
    ? '这套能上强度，但强度不是上头，练完要能说出自己改了哪一枪。'
    : score >= 45
      ? '这套正常打很够用，别练着练着开始娱乐模式。'
      : '今天先校准基本功，少硬拉，多把动作做干净。';
  const text = [
    `今日CS训练 | ${todayKey()}`,
    `参考选手：${player.nick} (${player.role})`,
    `地图/武器/定位：${map.name} / ${weapon.name} / ${role.name}`,
    `道具/战术/残局：${utility.name} / ${tactic.name} / ${clutch.name}`,
    `训练强度：${score}/100 ${intensity.label}，约${total}分钟`,
    '',
    `1. 热身 ${intensity.warmup}分钟：急停、拉枪、预瞄线先校准，别一上来就找人对喷。`,
    `2. 练枪 ${intensity.aim}分钟：${weaponTrainingTask(weapon, score)}`,
    `3. 道具 ${utilityTrainingTask(map, utility, intensity.utility)}`,
    `4. 实战 ${roleTrainingTask(role, tactic, clutch)}`,
    `5. 复盘 ${intensity.review}分钟：截3个死亡回合，只看站位、补枪距离和道具时机。`,
    predictHint ? `\n${predictHint}` : '',
    historyHint ? `\n${historyHint}` : '',
    profileHint ? `\n${profileHint}` : '',
    `机器短评：${shortNote}`,
    '真话边界：这是本地每日训练签，不是实时赛事事实；问赛程/赛果用 /cs brief。',
  ].join('\n');
  const card: DailyCard = {
    key: `cstrain-${map.key}-${weapon.key}-${role.key}`,
    title: '今日CS训练',
    name: `${map.name} / ${weapon.name}`,
    subtitle: `${role.name} / ${utility.name} / ${tactic.name}`,
    scoreLabel: '训练强度',
    advice: role.advice,
    avoid: '别练完不复盘，也别把训练签当实时数据。',
    line: shortNote,
  };
  const message: MessageSegment[] = [];
  if (!isPrivate) message.push({ type: 'at', data: { qq: String(userId) } });
  message.push({ type: 'text', data: { text: isPrivate ? text : ` ${text}` } });
  message.push(localDailyCardImage(card, score));
  return message;
}

export const funPlugin: Plugin = {
  name: 'fun',
  description: '趣味功能 - 掷骰子、抽签、决策辅助等',

  handler: async (ctx) => {
    const raw = ctx.rawText.trim();

    // ===== 中文模糊命令分发：在群聊普通消息中识别 =====
    // 仅当 ctx.command 为空（不是 /xxx 显式命令）时才走模糊匹配，避免冲突
    const fuzzy = ctx.command ? null : detectFuzzyCommand(raw);

    // ===== 掷骰子 =====
    if (ctx.command === 'roll' || ctx.command === 'dice') {
      const input = ctx.args[0] || '100';
      let result: string;

      // 支持 NdM 格式 (如 2d6)
      const diceMatch = input.match(/^(\d+)d(\d+)$/i);
      if (diceMatch) {
        const count = Math.min(parseInt(diceMatch[1]), 20);
        const sides = parseInt(diceMatch[2]);
        const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
        const sum = rolls.reduce((a, b) => a + b, 0);
        result = `${styleLine()}\n${count}d${sides} = [${rolls.join(', ')}] = ${sum}`;
      } else {
        const max = parseInt(input) || 100;
        const value = Math.floor(Math.random() * max) + 1;
        result = `${styleLine()}\n1-${max} 开出来是 ${value}`;
      }
      ctx.reply(result);
      return true;
    }

    // ===== 抽签 =====
    if (ctx.command === 'luck' || ctx.command === 'fortune') {
      const fortunes = [
        '大吉 - 今天枪法在线，timing也站你这边',
        '吉 - 运势不错，可以主动找机会',
        '中吉 - 稳一点打，别自己上头就行',
        '小吉 - 小有收获，别贪别送',
        '末吉 - 还行，但别硬起',
        '凶 - 今天宜默认控图，别第一身位白给',
        '大凶 - 今天真得收着点，别硬拉',
      ];
      const weights = [5, 15, 25, 25, 15, 10, 5];
      const total = weights.reduce((a, b) => a + b, 0);
      let r = Math.random() * total;
      let fortune = fortunes[0];
      for (let i = 0; i < weights.length; i++) {
        r -= weights[i];
        if (r <= 0) { fortune = fortunes[i]; break; }
      }

      const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
      ctx.replyAt(`${today} 的运势:\n${fortune}`);
      return true;
    }

    // ===== 选择困难症救星 =====
    if (ctx.command === 'choose' || ctx.command === 'pick') {
      const options = ctx.args.join(' ').split(/[,，、|]/).map((s) => s.trim()).filter(Boolean);
      if (options.length < 2) {
        ctx.reply('用法: /choose 选项1, 选项2, 选项3\n用逗号或顿号分隔');
        return true;
      }
      const chosen = randomPick(options);
      ctx.replyAt(`别纠结了，就选「${chosen}」。${styleLine()}`);
      return true;
    }

    // ===== 随机数 (更简洁) =====
    if (ctx.command === 'rand') {
      const min = parseInt(ctx.args[0]) || 1;
      const max = parseInt(ctx.args[1]) || 100;
      const low = Math.min(min, max);
      const high = Math.max(min, max);
      const value = Math.floor(Math.random() * (high - low + 1)) + low;
      ctx.reply(`${styleLine()}\n${low}-${high} 随到 ${value}`);
      return true;
    }

    // ===== /forecast 综合每日运势 =====
    if (ctx.command === 'forecast' || ctx.command === '运势' || ctx.command === '今日运势' || fuzzy === 'forecast') {
      const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
      const seed = hashCode(`forecast_${today}_${ctx.event.user_id}`);
      const rp = Math.abs(seed) % 101;
      const scopeId = ctx.groupId || 0;

      const player = dailyPlayerFor(ctx.event.user_id, scopeId);
      const team = dailyCardFor('csteam', ctx.event.user_id, scopeId, csTeams);
      const map = dailyCardFor('csmap', ctx.event.user_id, scopeId, csMaps);

      let mood: string;
      if (rp >= 80) mood = '今日大吉 - 状态拉满，主动找机会';
      else if (rp >= 60) mood = '今日吉 - 稳一点打，别上头';
      else if (rp >= 40) mood = '今日平 - 默认控图，看机会';
      else if (rp >= 20) mood = '今日小凶 - 收着点，别第一身位';
      else mood = '今日大凶 - 保枪 ECO 别硬起';

      ctx.replyAt([
        `🔮 ${today} 玩机器今日运势`,
        '',
        `人品: ${rp}/100`,
        mood,
        '',
        `今日选手: ${player.nick} (${player.team})`,
        `今日队伍: ${team.name}`,
        `今日地图: ${map.name}`,
        '',
        `${player.note || '稳一点打。'}`,
      ].join('\n'));
      return true;
    }

    // ===== 今日人品 =====
    if (ctx.command === 'jrrp' || ctx.command === 'rp' || fuzzy === 'jrrp') {
      // 基于日期+QQ号的伪随机，同一天结果固定
      const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
      const seed = hashCode(`${today}_${ctx.event.user_id}`);
      const rp = Math.abs(seed) % 101;

      let comment: string;
      if (rp >= 90) comment = '今天真有点东西，打什么都像在架timing。';
      else if (rp >= 70) comment = '运气不错，可以主动一点。';
      else if (rp >= 50) comment = '中规中矩，默认控图等机会。';
      else if (rp >= 30) comment = '一般，少嘴硬多补枪。';
      else if (rp >= 10) comment = '有点危险，别第一时间白给。';
      else comment = '今天先别硬起，保枪吧。';

      ctx.replyAt(`今日人品值: ${rp}/100\n${comment}`);
      return true;
    }

    // ===== /csbrief CS短报 =====
    if (ctx.command === 'csbrief' || ctx.command === 'csreport' || ctx.command === '日报' || ctx.command === '短报' || fuzzy === 'csbrief') {
      try {
        ctx.reply(await buildCsBrief());
      } catch {
        ctx.reply('CS短报拉取失败，先跑 /data 看实时数据链路。');
      }
      return true;
    }

    // ===== /cs2news 实时CS新闻 =====
    if (ctx.command === 'cs2news' || ctx.command === 'csnews' || fuzzy === 'cs2news') {
      try {
        // 优先用HLTV最近结果
        const results = await fetchRecentResults();
        if (results) {
          ctx.reply(`📰 CS最近战报:\n${results}`);
          return true;
        }
        const result = await webSearch('CS2 latest news 2026', 3000);
        if (result) {
          ctx.reply(`📰 CS2近况:\n${result.slice(0, 800)}`);
        } else {
          ctx.reply('搜不到啥新东西，可能是网络问题。');
        }
      } catch {
        ctx.reply('搜不到 网络可能挂了');
      }
      return true;
    }

    // ===== /match 实时比赛 =====
    if (ctx.command === 'match' || ctx.command === 'matches' || ctx.command === '比赛' || fuzzy === 'match') {
      try {
        // 优先用 HLTV 抓取
        const matches = await fetchOngoingMatches();
        if (matches) {
          ctx.reply(`🎮 当前比赛:\n${matches}`);
          return true;
        }
        const result = await webSearch('CS2 ongoing matches today HLTV', 3000);
        if (result) {
          ctx.reply(`🎮 当前比赛:\n${result.slice(0, 800)}`);
        } else {
          ctx.reply('搜不到正在打的比赛 可能赛程间隙');
        }
      } catch {
        ctx.reply('搜不到 网络可能挂了');
      }
      return true;
    }

    // ===== /ranking 当前排名 =====
    if (ctx.command === 'ranking' || ctx.command === 'rank' || ctx.command === '排名' || fuzzy === 'ranking') {
      try {
        // 优先用 CS API / VRS 结构化数据，失败再搜索
        const ranking = await fetchTeamRanking();
        if (ranking) {
          ctx.reply(`🏆 CS2战队排名:\n${ranking}`);
          return true;
        }
        const result = await webSearch('HLTV CS2 team ranking 2026 top10', 3000);
        if (result) {
          ctx.reply(`🏆 CS2 排名:\n${result.slice(0, 800)}`);
        } else {
          ctx.reply('搜不到排名信息');
        }
      } catch {
        ctx.reply('搜不到 网络可能挂了');
      }
      return true;
    }

    // ===== /cs2live CS2直播查询 =====
    if (ctx.command === 'cs2live' || ctx.command === 'live' || fuzzy === 'cs2live') {
      try {
        const result = await webSearch('CS2 douyu twitch streaming live now 玩机器', 3000);
        if (result) {
          ctx.reply(`🎬 CS2直播:\n${result.slice(0, 700)}`);
        } else {
          ctx.reply('没搜到正在直播的 玩机器可能没开');
        }
      } catch {
        ctx.reply('搜不到 网络可能挂了');
      }
      return true;
    }

    // ===== /quote 经典语录 =====
    if (ctx.command === 'quote') {
      const tag = ctx.args.join(' ').trim();
      const line = getRandomKnowledgeLine('quote', tag);
      if (line) {
        ctx.reply(line);
      } else {
        ctx.reply(tag ? `没找到「${tag}」相关的语录，换个词` : '语录库暂时没货');
      }
      return true;
    }

    // ===== /scene 直播场景卡 =====
    if (ctx.command === 'scene' || ctx.command === '场景' || ctx.command === 'template' || fuzzy === 'scene') {
      const query = ctx.args.join(' ').trim();
      ctx.reply(buildSceneTemplate(query));
      return true;
    }

    // ===== /csmood 玩机器今日心情 =====
    if (ctx.command === 'csmood' || ctx.command === 'mood' || fuzzy === 'csmood') {
      const moods = [
        '今天状态嘎嘎好 弹幕来吧',
        '今天有点累 不想接梗',
        '今天解说情绪饱满 准备整活',
        '今天有点上头 看比赛容易喷',
        '今天网卡 别问我为什么不联机',
        '今天嘴硬指数+10 别惹我',
        '今天比较佛 你说啥都行',
        '今天爱看Major精彩集锦',
      ];
      const today = new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' });
      const seed = hashCode(`mood_${today}_${ctx.event.user_id}`);
      const mood = moods[Math.abs(seed) % moods.length];
      ctx.reply(`${today}\n${mood}`);
      return true;
    }


    if (isDailyImageAuditRequest(ctx.command, ctx.args, raw)) {
      const limit = Math.max(1, Math.min(parseInt(ctx.args.find((arg) => /^\d+$/.test(arg)) || '30', 10) || 30, 80));
      const action = dailyImageCommandAction(ctx.args, raw);
      if (action === 'help') ctx.reply(buildDailyImageHelp());
      else if (action === 'status') ctx.reply(buildDailyImageStatusReport(ctx.event.user_id, ctx.groupId || 0, limit));
      else if (action === 'cache') ctx.reply(buildDailyImageCacheReport());
      else if (action === 'template') ctx.reply(buildDailyImageTemplateReport(limit));
      else ctx.reply(buildDailyImageAuditReport(limit));
      return true;
    }

    if (isCsPlayerStatusRequest(ctx.command, ctx.args, raw)) {
      const stats = getCacheStats();
      ctx.reply([
        '每日CS选手状态 / 图片状态',
        `选手池: ${csPlayers.length}人`,
        `队伍池: ${csTeams.length}队`,
        `地图/武器/皮肤/定位/道具/战术/残局/经济/口令/复盘: ${csMaps.length}/${csWeapons.length}/${csSkins.length}/${csRoles.length}/${csUtilities.length}/${csTactics.length}/${csClutches.length}/${csEconomies.length}/${csShotcalls.length}/${csReviews.length}`,
        `发刀池: 刀型${csKnives.length}类 / 刀皮${knifeSkins.length}种`,
        `木柜子池: MyGO!!!!!/Ave Mujica 共${dailyCharacters.length}人`,
        `Bestdori本地卡面: ${loadBestdoriCardImages().length}张`,
        `原神角色池: ${dailyGenshinCharacters.length}人`,
        `通用每日美图: ${loadDailyBeautyImages().length}张`,
        `选手兼容图: ${loadPlayerManifestImages().length}张`,
        `原神兼容图: ${loadGenshinManifestImages().length}张`,
        ...dailyImageManifestCacheLines(),
        playerCoverageLine(),
        bestdoriCoverageLine(),
        genshinCoverageLine(),
        ...currentDailyBeautyCoverageLines(ctx.event.user_id, ctx.groupId || 0),
        `冷知识/书摘/古诗词: ${dailyFacts.length}/${dailyBookExcerpts.length}/${dailyPoems.length}`,
        `影视/音乐/历史/科学: ${dailyMovieQuotes.length}/${dailyMusicFacts.length}/${dailyHistoryEvents.length}/${dailyScienceFacts.length}`,
        `紫禁之巅武器池: ${duelWeapons.length}种`,
        `发图顺序: 木柜子 Bestdori卡面 -> 专属美图池；其他每日 专属美图池 -> 专用清单 -> 公开图片接口 -> 日签图`,
        `队伍示例: ${csTeams.slice(0, 3).map((item) => `${item.name}(${dailyCardImagePlan(item).replace(/^图片路径：/, '')})`).join(' | ')}`,
        (() => {
          const liq = getLiquipediaImageStats();
          return `Liquipedia图解析: 缓存${liq.entries} 限流${liq.rateLimited ? 'yes' : 'no'}`;
        })(),
        (() => {
          const api = getCsgoSkinsApiStats();
          return `饰品图API: 缓存${api.entries} 拉取中${api.inFlight ? 'yes' : 'no'}${api.lastError ? ` 错误=${api.lastError}` : ''}`;
        })(),
        `图片缓存: ${stats.count}/${stats.maxFiles}张 ${stats.sizeMB}/${stats.maxSizeMB}MB`,
        `图片命中: ${stats.hits}/${stats.misses} 失败${stats.downloadFailures} 飞行${stats.inFlight}`,
        ...(stats.lastError ? [`最近图片错误: ${stats.lastError}`] : []),
        '',
        '/csimage test team|map|weapon|skin|role|utility|tactic|clutch|knife|mokoko|genshin|player|all 测真实图源',
        'admin: /csprewarm 预下载所有选手图(慢，受限流影响)',
      ].join('\n'));
      return true;
    }

    if (isCsImageCommand(ctx.command, raw)) {
      const normalizedArgs = ctx.args.map((item) => item.toLowerCase()).filter((item) => item !== 'test' && item !== '测试');
      const kind = normalizeCsImageKind(normalizedArgs[0] || raw.replace(/^\/?(csimage|csimg|cs图|图片测试)/i, ''));
      const scopeId = ctx.groupId || 0;
      ctx.reply(await probeDailyCard(kind, ctx.event.user_id, scopeId));
      return true;
    }

    // ===== /csprewarm 预下载所有选手图（admin） =====
    if (ctx.command === 'csprewarm') {
      const config = ctx.bot.getConfig();
      if (!config.admin_qq.includes(ctx.event.user_id)) {
        ctx.replyAt('⛔ 仅管理员可用');
        return true;
      }
      ctx.reply(`开始预下载 ${csPlayers.length} 张选手图，每张间隔 5 秒，预计 ${Math.round(csPlayers.length * 5 / 60)} 分钟。完成后会通知。`);
      // 后台异步执行
      void (async () => {
        let success = 0;
        let failed = 0;
        for (let i = 0; i < csPlayers.length; i++) {
          const player = csPlayers[i];
          const segments = await imageSegmentOrNote(player.image, player.nick);
          if (segments.some((seg) => seg.type === 'image')) success++;
          else failed++;
          // 5 秒间隔，避免被限流
          await new Promise((r) => setTimeout(r, 5000));
        }
        const target = ctx.groupId
          ? () => ctx.bot.sendGroupMessage(ctx.groupId!, `预下载完成：成功 ${success} 失败 ${failed}`)
          : () => ctx.bot.sendPrivateMessage(ctx.event.user_id, `预下载完成：成功 ${success} 失败 ${failed}`);
        try { await target(); } catch { /* */ }
      })();
      return true;
    }
    if (isCsPlayerDrawRequest(ctx.command, raw) || fuzzy === 'csplayer') {
      const scopeId = ctx.groupId || 0;
      const player = dailyPlayerFor(ctx.event.user_id, scopeId);
      const score = dailyPlayerScore(ctx.event.user_id, scopeId);
      ctx.reply(ctx.isPrivate
        ? await buildPrivateCsPlayerMessage(player, score, ctx.event.user_id, scopeId)
        : await buildCsPlayerMessage(ctx.event.user_id, player, score, scopeId));
      return true;
    }

    // ===== 每日CS队伍/地图/武器/定位/套餐 =====
    const scopeId = ctx.groupId || 0;
    if (isCsTrainingCommand(ctx.command)) {
      const sub = (ctx.args[0] || '').toLowerCase();
      if (['analyze', 'analyse', 'diagnose', '诊断', '分析'].includes(sub)) {
        const analysis = analyzeTrainingLogInput(ctx.args.slice(1));
        if (!analysis) {
          ctx.reply(trainingCommandUsage());
          return true;
        }
        ctx.replyAt(formatCsTrainingAnalysis(analysis));
        return true;
      }
      if (['log', 'add', 'done', 'record', '记录', '打卡'].includes(sub)) {
        const parsed = parseTrainingLogInput(ctx.args.slice(1));
        if (!parsed) {
          ctx.reply(trainingCommandUsage());
          return true;
        }
        const entry = addTrainingLog(ctx, parsed);
        ctx.replyAt([
          `训练记上了：${formatTrainingLogEntry(entry)}`,
          '后面 /cstrain 会按你最近记录调建议，/cstrain stats 看趋势。',
        ].join('\n'));
        return true;
      }
      if (['stats', 'status', 'history', 'list', '记录', '统计'].includes(sub)) {
        ctx.reply(formatCsTrainingStats(ctx.chatType, ctx.chatId, ctx.event.user_id));
        return true;
      }
      if (['clear', 'reset', 'clean', '清空', '重置'].includes(sub)) {
        const removed = clearTrainingLogs(ctx.chatType, ctx.chatId, ctx.event.user_id);
        ctx.replyAt(`训练记录清掉了：${removed}条。`);
        return true;
      }
      if (['help', 'usage', '用法', '?'].includes(sub)) {
        ctx.reply(trainingCommandUsage());
        return true;
      }
    }
    if (isCsQuizRequest(ctx.command, raw) || fuzzy === 'csquiz') {
      if (isCsQuizAnswerArgs(ctx.args)) {
        const answerText = formatCsQuizAnswer(ctx.event.user_id, scopeId, ctx.args);
        if (ctx.isPrivate) ctx.reply(answerText);
        else ctx.replyAt(answerText);
        return true;
      }
      ctx.reply(buildCsQuizMessage(ctx.event.user_id, scopeId, ctx.isPrivate));
      return true;
    }
    if (isCsTrainingRequest(ctx.command, raw) || fuzzy === 'cstrain') {
      const predictHint = getCsPredictTrainingHint(ctx.chatType, ctx.chatId, ctx.event.user_id);
      const historyHint = buildCsTrainingHistoryHint(ctx.chatType, ctx.chatId, ctx.event.user_id);
      const profileHint = buildUserProfileDailyCsHint(ctx.chatType, ctx.chatId, ctx.event.user_id);
      ctx.reply(buildCsTrainingMessage(ctx.event.user_id, scopeId, ctx.isPrivate, predictHint, historyHint, profileHint));
      return true;
    }
    if (isDailyKnifeRequest(ctx.command, raw) || fuzzy === 'csknife') {
      const knife = dailyKnifeFor(ctx.event.user_id, scopeId);
      const skin = dailyKnifeSkinFor(ctx.event.user_id, scopeId, knife);
      const score = dailyScoreForKind('csknife', ctx.event.user_id, scopeId);
      ctx.reply(await buildKnifeMessage(ctx.event.user_id, knife, skin, score, ctx.isPrivate, scopeId));
      return true;
    }
    if (isDailyMokokoRequest(ctx.command, raw) || fuzzy === 'mokoko') {
      const character = dailyCharacterFor(ctx.event.user_id, scopeId);
      const score = dailyScoreForKind('mokoko', ctx.event.user_id, scopeId);
      ctx.reply(await buildMokokoMessage(ctx.event.user_id, character, score, ctx.isPrivate, scopeId));
      return true;
    }
    if (isDailyGenshinRequest(ctx.command, raw) || fuzzy === 'genshin') {
      const character = dailyGenshinFor(ctx.event.user_id, scopeId);
      const score = dailyScoreForKind('genshin', ctx.event.user_id, scopeId);
      ctx.reply(await buildGenshinMessage(ctx.event.user_id, character, score, ctx.isPrivate, scopeId));
      return true;
    }
    if (isDailyFactRequest(ctx.command, raw) || fuzzy === 'dailyfact') {
      const card = dailyFactFor(ctx.event.user_id, scopeId);
      const score = dailyScoreForKind('daily_fact', ctx.event.user_id, scopeId);
      ctx.reply(await buildDailyTextCardMessage(ctx.event.user_id, card, score, ctx.isPrivate, 'fact', scopeId));
      return true;
    }
    if (isDailyBookRequest(ctx.command, raw) || fuzzy === 'dailybook') {
      const card = dailyBookExcerptFor(ctx.event.user_id, scopeId);
      const score = dailyScoreForKind('daily_book', ctx.event.user_id, scopeId);
      ctx.reply(await buildDailyTextCardMessage(ctx.event.user_id, card, score, ctx.isPrivate, 'book', scopeId));
      return true;
    }
    if (isDailyPoemRequest(ctx.command, raw) || fuzzy === 'dailypoem') {
      const card = dailyPoemFor(ctx.event.user_id, scopeId);
      const score = dailyScoreForKind('daily_poem', ctx.event.user_id, scopeId);
      ctx.reply(await buildDailyTextCardMessage(ctx.event.user_id, card, score, ctx.isPrivate, 'poem', scopeId));
      return true;
    }
    if (isDailyMovieRequest(ctx.command, raw) || fuzzy === 'dailymovie') {
      const card = dailyMovieQuoteFor(ctx.event.user_id, scopeId);
      const score = dailyScoreForKind('daily_movie', ctx.event.user_id, scopeId);
      ctx.reply(await buildDailyTextCardMessage(ctx.event.user_id, card, score, ctx.isPrivate, 'movie', scopeId));
      return true;
    }
    if (isDailyMusicRequest(ctx.command, raw) || fuzzy === 'dailymusic') {
      const card = dailyMusicFactFor(ctx.event.user_id, scopeId);
      const score = dailyScoreForKind('daily_music', ctx.event.user_id, scopeId);
      ctx.reply(await buildDailyTextCardMessage(ctx.event.user_id, card, score, ctx.isPrivate, 'music', scopeId));
      return true;
    }
    if (isDailyHistoryRequest(ctx.command, raw) || fuzzy === 'dailyhistory') {
      const card = dailyHistoryEventFor(ctx.event.user_id, scopeId);
      const score = dailyScoreForKind('daily_history', ctx.event.user_id, scopeId);
      ctx.reply(await buildDailyTextCardMessage(ctx.event.user_id, card, score, ctx.isPrivate, 'history', scopeId));
      return true;
    }
    if (isDailyScienceRequest(ctx.command, raw) || fuzzy === 'dailyscience') {
      const card = dailyScienceFactFor(ctx.event.user_id, scopeId);
      const score = dailyScoreForKind('daily_science', ctx.event.user_id, scopeId);
      ctx.reply(await buildDailyTextCardMessage(ctx.event.user_id, card, score, ctx.isPrivate, 'science', scopeId));
      return true;
    }
    if (isDailyDuelRequest(ctx.command, raw) || fuzzy === 'dailyduel') {
      ctx.reply(await buildDailyDuelMessage(ctx.event.user_id, scopeId, ctx.isPrivate));
      return true;
    }
    if (isDailyCardRequest(ctx.command, raw, 'loadout') || fuzzy === 'csloadout') {
      ctx.reply(await buildLoadoutMessage(ctx.event.user_id, scopeId, ctx.isPrivate));
      return true;
    }
    if (isDailyCardRequest(ctx.command, raw, 'weapon') || fuzzy === 'csweapon') {
      const card = dailyCardFor('csweapon', ctx.event.user_id, scopeId, csWeapons);
      const skin = dailySkinForWeapon(card, ctx.event.user_id, scopeId);
      const score = dailyScoreForKind('csweapon', ctx.event.user_id, scopeId);
      ctx.reply(await buildWeaponMessage(ctx.event.user_id, card, skin, score, ctx.isPrivate, scopeId));
      return true;
    }
    if (isDailyCardRequest(ctx.command, raw, 'skin')) {
      const skin = dailySkinFor(ctx.event.user_id, scopeId);
      const score = dailyScoreForKind('csskin', ctx.event.user_id, scopeId);
      ctx.reply(await buildSkinMessage(ctx.event.user_id, skin, score, ctx.isPrivate, scopeId));
      return true;
    }
    for (const meta of dailyCsKindMetas.filter((item) => !['loadout', 'weapon', 'skin'].includes(item.kind))) {
      if (isDailyCardRequest(ctx.command, raw, meta.kind) || fuzzy === meta.fuzzyKey) {
        const card = dailyCardFor(meta.seedKey, ctx.event.user_id, scopeId, meta.cards);
        const score = dailyScoreForKind(meta.scoreKey, ctx.event.user_id, scopeId);
        ctx.reply(await buildDailyCardMessage(ctx.event.user_id, card, score, ctx.isPrivate, meta.kind, scopeId));
        return true;
      }
    }

    return false;
  },
};

export const __test = {
  csPlayers,
  csTeams,
  csMaps,
  csWeapons,
  csSkins,
  csRoles,
  csUtilities,
  csTactics,
  csClutches,
  csEconomies,
  csShotcalls,
  csReviews,
  csKnives,
  knifeSkins,
  dailyCharacters,
  dailyGenshinCharacters,
  dailyFacts,
  dailyBookExcerpts,
  dailyPoems,
  dailyMovieQuotes,
  dailyMusicFacts,
  dailyHistoryEvents,
  dailyScienceFacts,
  duelWeapons,
  dailyPlayerFor,
  dailyPlayerScore,
  dailyCardFor,
  dailySkinFor,
  dailySkinForWeapon,
  dailyKnifeFor,
  dailyKnifeSkinFor,
  knifeSkinAvailableFor,
  knifeSkinPoolFor,
  dailyCharacterFor,
  dailyGenshinFor,
  dailyFactFor,
  dailyBookExcerptFor,
  dailyPoemFor,
  dailyMovieQuoteFor,
  dailyMusicFactFor,
  dailyHistoryEventFor,
  dailyScienceFactFor,
  dailyDuelPlayerWeaponFor,
  dailyDuelBotWeaponFor,
  dailyScoreForKind,
  isCsPlayerDrawRequest,
  isCsPlayerStatusRequest,
  isDailyImageAuditRequest,
  isDailyKnifeRequest,
  isDailyMokokoRequest,
  isDailyGenshinRequest,
  isDailyFactRequest,
  isDailyBookRequest,
  isDailyPoemRequest,
  isDailyDuelRequest,
  isDailyCardRequest,
  isCsTrainingRequest,
  isCsQuizRequest,
  isCsQuizAnswerArgs,
  parseCsQuizAnswerArgs,
  formatCsQuizAnswer,
  parseTrainingLogInput,
  analyzeTrainingLogInput,
  detectTrainingWeaknesses,
  buildCsTrainingHistoryHint,
  formatCsTrainingAnalysis,
  formatCsTrainingStats,
  loadTrainingStore,
  buildCsPlayerMessage,
  buildDailyCardMessage,
  buildWeaponMessage,
  buildSkinMessage,
  buildKnifeMessage,
  buildMokokoMessage,
  buildGenshinMessage,
  buildCsPlayerImageCandidates,
  buildDailyCardImageCandidates,
  buildKnifeImageCandidates,
  buildCharacterImageCandidates,
  buildGenshinImageCandidates,
  buildDuelImageCandidates,
  buildDailyTextImageCandidates,
  loadBestdoriCardImages,
  loadPlayerManifestImages,
  loadGenshinManifestImages,
  loadDailyBeautyImages,
  dailyImageManifestCacheLines,
  getImageManifestCacheStats,
  buildDailyTextCardMessage,
  buildDailyDuelMessage,
  buildLoadoutMessage,
  buildCsTrainingMessage,
  dailyBeautyAuditRows,
  dailyImageManifestTargets,
  buildDailyImageAuditReport,
  buildDailyImageStatusReport,
  buildDailyImageCacheReport,
  buildDailyImageTemplateReport,
  buildDailyImageHelp,
  dailyBeautyMatchCacheStats,
  dailyCsQuizFor,
  buildCsQuizMessage,
  __setTrainingStorePathForTests: (filepath?: string) => {
    setTrainingStorePathForTests(filepath);
  },
  __setBestdoriCardManifestPathForTests: (filepath?: string) => {
    bestdoriCardManifestPathOverride = filepath || '';
    clearImageManifestCache();
    clearDailyBeautyMatchCache();
  },
  __setPlayerImageManifestPathForTests: (filepath?: string) => {
    playerImageManifestPathOverride = filepath || '';
    clearImageManifestCache();
    clearDailyBeautyMatchCache();
  },
  __setGenshinImageManifestPathForTests: (filepath?: string) => {
    genshinImageManifestPathOverride = filepath || '';
    clearImageManifestCache();
    clearDailyBeautyMatchCache();
  },
  __setDailyBeautyImageManifestPathForTests: (filepath?: string) => {
    dailyBeautyImageManifestPathOverride = filepath || '';
    clearImageManifestCache();
    clearDailyBeautyMatchCache();
  },
  __setDailyImagePackRootForTests: (filepath?: string) => {
    dailyImagePackRootOverride = filepath || '';
    clearDailyBeautyMatchCache();
  },
  __setImageResolverForTests: (resolver?: (url: string) => Promise<string | null>) => {
    imageDataUrlResolver = resolver || getImageDataUrl;
  },
  __setImageSourceResolversForTests: (resolvers?: {
    player?: (player: string) => Promise<string | null>;
    team?: (page: string, teamName: string) => Promise<string | null>;
    fandom?: (filename: string, wiki?: FandomWiki) => Promise<string | null>;
    fandomPage?: (title: string, wiki?: FandomWiki) => Promise<string | null>;
    csgoSkin?: (weapon: string, skin: string) => Promise<string | null>;
  }) => {
    playerImageResolver = resolvers?.player || resolvePlayerImage;
    teamImageResolver = resolvers?.team || resolveTeamImage;
    fandomImageResolver = resolvers?.fandom || resolveFandomFileImage;
    fandomPageImageResolver = resolvers?.fandomPage || resolveFandomPageImage;
    csgoSkinImageResolver = resolvers?.csgoSkin || resolveCsgoSkinImage;
  },
};

/**
 * 后台预热选手图缓存。每张间隔 8 秒，避免触发 Liquipedia 限流。
 * 跑完后所有选手图都在本地，30 天不会再要外网。
 */
export async function prewarmPlayerImages(): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;
  for (const player of csPlayers) {
    try {
      const segments = await imageSegmentOrNote(player.image, player.nick);
      if (segments.some((seg) => seg.type === 'image')) success++;
      else failed++;
    } catch { failed++; }
    // 8 秒间隔严格避免限流
    await new Promise((r) => setTimeout(r, 8000));
  }
  logger.info(`[Prewarm] 选手图预热完成: 成功${success} 失败${failed}`);
  return { success, failed };
}

/** 字符串哈希 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // to 32bit int
  }
  return hash;
}
