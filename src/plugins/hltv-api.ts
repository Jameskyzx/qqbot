import * as https from 'https';
import * as http from 'http';
import * as zlib from 'zlib';
import { webSearch } from './web-search';

/**
 * CS2 实时数据接口 - 多层兜底
 *
 * 数据源优先级：
 * 1. CS API 结构化 JSON (api.csapi.de, HLTV/VRS 数据镜像，无 key)
 * 2. Liquipedia MediaWiki API (赛程兜底, bot 友好)
 * 3. webSearch 兜底 (DuckDuckGo/Bing)
 * 4. 缓存命中
 *
 * Liquipedia ToS: ≥2.5s 间隔，UA 带项目标识
 */

interface CacheEntry {
  data: string;
  expiresAt: number;
}

const cache: Map<string, CacheEntry> = new Map();
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const USER_AGENT = 'wanjier-bot/1.0 (https://github.com/2711944586/qqbot; CS2 group chat bot)';
const CS_API_BASE = 'https://api.csapi.de';

let lastRequestAt = 0;
const MIN_REQUEST_GAP_MS = 2500; // Liquipedia ToS: 至少 2s 间隔，加 0.5s margin
let rateLimitedUntil = 0;

// 共享的 HTML 缓存（fetchOngoingMatches 和 fetchRecentResults 都用同一页面）
let matchesHtmlCache: { html: string; expiresAt: number } | null = null;
const MATCHES_HTML_TTL = 4 * 60 * 1000; // 4 分钟

interface CsApiTeamLite {
  id?: number;
  name?: string;
  score?: number;
  rank?: number | null;
}

interface CsApiMap {
  name?: string;
  team1_score?: number;
  team2_score?: number;
}

interface CsApiMatch {
  id?: number;
  team1?: CsApiTeamLite;
  team2?: CsApiTeamLite;
  maps?: CsApiMap[];
  best_of?: number;
  date?: string;
  event?: string;
  winner?: CsApiTeamLite | null;
}

interface CsApiRankingItem {
  id?: number;
  name?: string;
  rank?: number;
  rank_diff?: number;
  points?: number;
  points_diff?: number;
}

interface CsApiRankingResponse {
  date?: string;
  rankings?: CsApiRankingItem[];
}

interface CsApiTeamDetail {
  id?: number;
  name?: string;
  streak?: number;
  roster?: Array<{ id?: number; name?: string }>;
}

interface CsApiTeamStats {
  id?: number;
  name?: string;
  n?: number;
  n_wins?: number;
}

interface CsApiPlayerStats {
  id?: number;
  name?: string;
  rank?: number;
  k?: number;
  d?: number;
  adr?: number;
  kast?: number;
  rating?: number;
  N?: number;
}

async function getMatchesHtml(): Promise<string> {
  if (matchesHtmlCache && matchesHtmlCache.expiresAt > Date.now()) {
    return matchesHtmlCache.html;
  }
  const html = await fetchLiquipedia('Liquipedia:Matches');
  if (html) {
    matchesHtmlCache = { html, expiresAt: Date.now() + MATCHES_HTML_TTL };
  }
  return html;
}

/** Liquipedia 失败时用 webSearch 兜底，返回简短摘要 */
async function fallbackWebSearch(query: string): Promise<string> {
  try {
    const result = await webSearch(query, 4000, 600, 60);
    if (!result) return '';
    return result.slice(0, 600);
  } catch {
    return '';
  }
}

function getCached(key: string): string | null {
  const entry = cache.get(key);
  if (!entry || entry.expiresAt < Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key: string, data: string, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
  if (cache.size > 50) {
    const sorted = [...cache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    for (const [k] of sorted.slice(0, 10)) cache.delete(k);
  }
}

function requestText(url: string, timeoutMs: number = 8000, redirectCount: number = 0): Promise<string> {
  return new Promise((resolve) => {
    let parsed: URL;
    try { parsed = new URL(url); } catch { resolve(''); return; }
    const isHttps = parsed.protocol === 'https:';
    const transport = isHttps ? https : http;
    let settled = false;
    const finish = (value: string) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const req = transport.get({
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + parsed.search,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json,text/plain,*/*',
        'Accept-Encoding': 'gzip',
      },
    }, (res) => {
      const statusCode = res.statusCode || 0;
      if ([301, 302, 303, 307, 308].includes(statusCode) && res.headers.location && redirectCount < 4) {
        let next = '';
        try { next = new URL(res.headers.location, parsed).toString(); } catch { next = ''; }
        res.resume();
        if (!next) {
          finish('');
          return;
        }
        void requestText(next, timeoutMs, redirectCount + 1).then(finish);
        return;
      }
      if (statusCode >= 400) {
        res.resume();
        finish('');
        return;
      }
      const chunks: Buffer[] = [];
      let total = 0;
      const stream = res.headers['content-encoding'] === 'gzip' ? res.pipe(zlib.createGunzip()) : res;
      stream.on('data', (chunk: Buffer) => {
        total += chunk.length;
        if (total > MAX_RESPONSE_BYTES) {
          finish('');
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      stream.on('end', () => finish(Buffer.concat(chunks).toString()));
      stream.on('error', () => finish(''));
    });
    req.on('error', () => finish(''));
    req.setTimeout(timeoutMs, () => {
      finish('');
      req.destroy();
    });
  });
}

async function fetchCsApiJson<T>(path: string, timeoutMs: number = 8000): Promise<T | null> {
  const body = await requestText(`${CS_API_BASE}${path}`, timeoutMs);
  if (!body || /^\s*</.test(body)) return null;
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => {
    setTimeout(r, ms);
  });
}

async function fetchLiquipedia(page: string, timeoutMs: number = 8000): Promise<string> {
  // 触发过限流的话，10 分钟内不再请求
  if (Date.now() < rateLimitedUntil) return '';

  // Rate limit
  const since = Date.now() - lastRequestAt;
  if (since < MIN_REQUEST_GAP_MS) {
    await delay(MIN_REQUEST_GAP_MS - since);
  }
  lastRequestAt = Date.now();

  return new Promise((resolve) => {
    let settled = false;
    const finish = (v: string) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };

    const url = `https://liquipedia.net/counterstrike/api.php?action=parse&page=${encodeURIComponent(page)}&prop=text&format=json`;
    let parsed: URL;
    try { parsed = new URL(url); } catch { finish(''); return; }

    const req = https.get({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
      },
    }, (res) => {
      // 429 / 403 = 触发限流，记录冷却期
      if (res.statusCode === 429 || res.statusCode === 403) {
        rateLimitedUntil = Date.now() + 10 * 60 * 1000;
        console.warn(`[hltv] Liquipedia 限流(${res.statusCode})，冷却10分钟`);
        finish('');
        res.resume();
        return;
      }
      if (res.statusCode && res.statusCode >= 400) {
        finish('');
        res.resume();
        return;
      }
      const chunks: Buffer[] = [];
      let total = 0;
      const stream = res.headers['content-encoding'] === 'gzip' ? res.pipe(zlib.createGunzip()) : res;
      stream.on('data', (chunk: Buffer) => {
        total += chunk.length;
        if (total > MAX_RESPONSE_BYTES) {
          finish('');
          req.destroy();
          return;
        }
        chunks.push(chunk);
      });
      stream.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        // 检测是否被 Liquipedia 反爬页面拦截（HTML 而非 JSON）
        if (body.startsWith('<!DOCTYPE') || body.startsWith('<html')) {
          if (/Rate Limited/i.test(body)) {
            rateLimitedUntil = Date.now() + 10 * 60 * 1000;
            console.warn('[hltv] Liquipedia 反爬页面检测到限流，冷却10分钟');
          }
          finish('');
          return;
        }
        try {
          const j = JSON.parse(body);
          finish(j.parse?.text?.['*'] || '');
        } catch {
          finish('');
        }
      });
      stream.on('error', () => finish(''));
    });
    req.on('error', () => finish(''));
    req.setTimeout(timeoutMs, () => {
      finish('');
      req.destroy();
    });
  });
}

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/');
}

function stripTags(html: string): string {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
  ).replace(/\s+/g, ' ').trim();
}

interface ParsedMatch {
  team1: string;
  team2: string;
  score1?: string;
  score2?: string;
  unixTimestamp?: number;
  finished: boolean;
  event?: string;
  bo?: string;
}

/** 从 Liquipedia HTML 中解析单个 match-info 块 */
function parseMatchBlocks(html: string): ParsedMatch[] {
  const matches: ParsedMatch[] = [];
  // match-info 块可能在 toggle-area-content-active (upcoming) 或 toggle-area-content (completed)
  // upcoming 用: <span class="timer-object" data-timestamp="N">  (无 data-finished)
  // finished 用: <span class="timer-object timer-object-datetime-only" data-timestamp="N" data-finished="finished">
  // 用 timer-object 锚定，向后查找 match-info-tournament 边界
  const blockRegex = /<span class="timer-object[^"]*"[^>]*data-timestamp="(\d+)"([^>]*)>[\s\S]*?<div class="match-info-tournament"[\s\S]*?<\/div>\s*<\/div>/g;
  let m: RegExpExecArray | null;
  while ((m = blockRegex.exec(html))) {
    const block = m[0];
    const timestamp = parseInt(m[1], 10);
    const finishedAttr = m[2] || '';
    const finished = /data-finished="finished"/.test(finishedAttr);

    // 队名: <span class="name" ...><a ...>TEAM</a></span> 或 <span class="name">TEAM</span>
    const names = [...block.matchAll(/<span class="name"[^>]*>(?:<a[^>]*>([^<]+)<\/a>|([^<]+))<\/span>/g)].map((mm) => decodeHtml((mm[1] || mm[2] || '').trim()));
    if (names.length < 2) continue;
    if (!names[0] || !names[1]) continue;

    // 比分: <span class="match-info-header-scoreholder-score(...)">N</span> 取前两个
    const scoreMatches = [...block.matchAll(/<span class="match-info-header-scoreholder-score(?:[^"]*)"[^>]*>([^<]*)<\/span>/g)].map((mm) => decodeHtml(mm[1].trim()));

    // 如果是 upcoming，scoreholder-upper 是 "vs"，没有数字分数
    const upperMatch = block.match(/<span class="match-info-header-scoreholder-upper"[^>]*>([\s\S]*?)<\/span>/);
    const isVsOnly = upperMatch && /vs/i.test(stripTags(upperMatch[1]));

    // BO: <span class="match-info-header-scoreholder-lower">(Bo3)</span>
    const boMatch = block.match(/<span class="match-info-header-scoreholder-lower"[^>]*>\(([^)]+)\)<\/span>/);

    // 赛事名：<span class="match-info-tournament-name">...<span>NAME</span></span>
    const eventMatch = block.match(/<span class="match-info-tournament-name"[^>]*>[\s\S]*?<span[^>]*>([^<]+)<\/span>[\s\S]*?<\/span>/);

    const result: ParsedMatch = {
      team1: names[0],
      team2: names[1],
      unixTimestamp: isNaN(timestamp) ? undefined : timestamp,
      finished,
      event: eventMatch ? decodeHtml(eventMatch[1].trim()) : undefined,
      bo: boMatch ? boMatch[1] : undefined,
    };
    if (!isVsOnly && scoreMatches.length >= 2) {
      result.score1 = scoreMatches[0];
      result.score2 = scoreMatches[1];
    }
    matches.push(result);
  }
  return matches;
}

function formatTimeShort(unix: number): string {
  const date = new Date(unix * 1000);
  // 转 GMT+8 北京时间显示
  const offset = 8 * 60 * 60 * 1000;
  const cst = new Date(date.getTime() + offset);
  const now = new Date(Date.now() + offset);
  const sameDay = cst.getUTCFullYear() === now.getUTCFullYear() && cst.getUTCMonth() === now.getUTCMonth() && cst.getUTCDate() === now.getUTCDate();
  const tomorrow = (cst.getTime() - now.getTime()) < 36 * 3600 * 1000 && (cst.getTime() - now.getTime()) > 0;
  const hh = String(cst.getUTCHours()).padStart(2, '0');
  const mm = String(cst.getUTCMinutes()).padStart(2, '0');
  if (sameDay) return `今天 ${hh}:${mm}`;
  if (tomorrow) return `明天 ${hh}:${mm}`;
  return `${cst.getUTCMonth() + 1}/${cst.getUTCDate()} ${hh}:${mm}`;
}

function formatSourceStamp(source: string, date?: string): string {
  const at = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
  return date ? `来源：${source} ${date} 快照 / 拉取 ${at}` : `来源：${source} / 拉取 ${at}`;
}

function rankDeltaText(value: number | undefined): string {
  if (!value) return '';
  return value > 0 ? ` ↑${value}` : ` ↓${Math.abs(value)}`;
}

function pointsDeltaText(value: number | undefined): string {
  if (!value) return '';
  return value > 0 ? ` +${value}` : ` ${value}`;
}

function mapSummary(maps?: CsApiMap[]): string {
  if (!maps || maps.length === 0) return '';
  const pieces = maps
    .filter((m) => m?.name)
    .slice(0, 3)
    .map((m) => {
      const score = typeof m.team1_score === 'number' && typeof m.team2_score === 'number'
        ? ` ${m.team1_score}-${m.team2_score}`
        : '';
      return `${m.name}${score}`;
    });
  return pieces.length > 0 ? ` [${pieces.join(', ')}]` : '';
}

function formatCsApiMatchResult(match: CsApiMatch): string {
  const team1 = match.team1?.name || 'TBD';
  const team2 = match.team2?.name || 'TBD';
  const score = typeof match.team1?.score === 'number' && typeof match.team2?.score === 'number'
    ? `${match.team1.score}:${match.team2.score}`
    : '?:?';
  const bo = match.best_of ? ` BO${match.best_of}` : '';
  const ev = match.event ? ` (${match.event})` : '';
  const winner = match.winner?.name ? ` 胜者:${match.winner.name}` : '';
  return `${match.date || '日期未知'}  ${team1} ${score} ${team2}${bo}${ev}${winner}${mapSummary(match.maps)}`;
}

async function fetchCsApiRecentResults(limit: number = 8): Promise<string> {
  const matches = await fetchCsApiJson<CsApiMatch[]>(`/matches/latest?limit=${Math.max(1, Math.min(limit, 20))}`, 8000);
  if (!Array.isArray(matches) || matches.length === 0) return '';
  const lines = matches
    .filter((m) => m?.team1?.name && m?.team2?.name)
    .slice(0, limit)
    .map((m) => `- ${formatCsApiMatchResult(m)}`);
  if (lines.length === 0) return '';
  return `${formatSourceStamp('CS API / HLTV赛果镜像')}\n${lines.join('\n')}`;
}

async function fetchCsApiRanking(limit: number = 10): Promise<string> {
  const data = await fetchCsApiJson<CsApiRankingResponse>('/rankings/', 8000);
  const rankings = Array.isArray(data?.rankings) ? data!.rankings : [];
  if (rankings.length === 0) return '';
  const lines = rankings
    .filter((item) => item?.name && typeof item.rank === 'number')
    .slice(0, limit)
    .map((item) => {
      const points = typeof item.points === 'number' ? ` ${item.points}分${pointsDeltaText(item.points_diff)}` : '';
      return `#${item.rank} ${item.name}${points}${rankDeltaText(item.rank_diff)}`;
    });
  if (lines.length === 0) return '';
  return `${formatSourceStamp('CS API / VRS排名镜像', data?.date)}\n${lines.join('\n')}`;
}

async function fetchCsApiRankingData(): Promise<CsApiRankingResponse | null> {
  return fetchCsApiJson<CsApiRankingResponse>('/rankings/', 8000);
}

function normalizeLookupName(value: string): string {
  return (value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function cleanLookupQuery(query: string): string {
  return (query || '')
    .replace(/最新|现在|当前|目前|今天|今日|近期|最近|排名|排行|阵容|转会|加入|离队|状态|表现|怎么样|怎样|如何|数据|stats?|hltv|vrs|cs2?|队伍|战队|选手/gi, ' ')
    .replace(/[，。！？!?、,.;:：/\\|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findRankingItem(data: CsApiRankingResponse | null, query: string): CsApiRankingItem | null {
  const rankings = Array.isArray(data?.rankings) ? data!.rankings : [];
  const key = normalizeLookupName(cleanLookupQuery(query) || query);
  if (!key) return null;
  return rankings.find((item) => normalizeLookupName(item.name || '') === key)
    || rankings.find((item) => normalizeLookupName(item.name || '').includes(key) || key.includes(normalizeLookupName(item.name || '')))
    || null;
}

function formatWinRate(item: CsApiTeamStats): string {
  const n = Number(item.n || 0);
  const wins = Number(item.n_wins || 0);
  if (n <= 0) return `${item.name || 'Unknown'} 0场`;
  const rate = Math.round((wins / n) * 100);
  return `${item.name || 'Unknown'} ${wins}/${n} ${rate}%`;
}

function formatTeamStreak(streak: number | undefined): string {
  if (!streak) return '连胜/连败: 0';
  return streak > 0 ? `连胜: ${streak}` : `连败: ${Math.abs(streak)}`;
}

export async function fetchTeamProfile(query: string): Promise<string> {
  const cacheKey = `team:${normalizeLookupName(query)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const rankingData = await fetchCsApiRankingData();
  const ranking = findRankingItem(rankingData, query);
  if (!ranking?.id) return '';

  const [team, stats] = await Promise.all([
    fetchCsApiJson<CsApiTeamDetail>(`/teams/${ranking.id}`, 8000),
    fetchCsApiJson<CsApiTeamStats[]>(`/teams/${ranking.id}/stats`, 8000),
  ]);
  const roster = Array.isArray(team?.roster) ? team!.roster.map((p) => p.name).filter(Boolean) : [];
  const mapStats = Array.isArray(stats) ? stats.filter((item) => item.name && item.name !== 'All').sort((a, b) => (b.n || 0) - (a.n || 0)).slice(0, 5) : [];
  const all = Array.isArray(stats) ? stats.find((item) => item.name === 'All') : undefined;
  const lines = [
    formatSourceStamp('CS API / VRS+队伍数据', rankingData?.date),
    `${ranking.name || team?.name || query} #${ranking.rank || '?'} ${typeof ranking.points === 'number' ? `${ranking.points}分${pointsDeltaText(ranking.points_diff)}` : ''}${rankDeltaText(ranking.rank_diff)}`,
    formatTeamStreak(team?.streak),
    roster.length > 0 ? `当前阵容: ${roster.join(', ')}` : '',
    all ? `近期总战绩: ${formatWinRate(all)}` : '',
    mapStats.length > 0 ? `地图样本: ${mapStats.map(formatWinRate).join(' / ')}` : '',
  ].filter(Boolean).join('\n');
  if (lines) setCached(cacheKey, lines, 30 * 60 * 1000);
  return lines;
}

export async function fetchPlayerProfile(query: string): Promise<string> {
  const cleanQuery = cleanLookupQuery(query) || query;
  const cacheKey = `player:${normalizeLookupName(cleanQuery)}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const key = normalizeLookupName(cleanQuery);
  if (!key) return '';
  const players = await fetchCsApiJson<CsApiPlayerStats[]>('/players/stats?limit=80&min_played=10', 10000);
  if (!Array.isArray(players) || players.length === 0) return '';
  const player = players.find((item) => normalizeLookupName(item.name || '') === key)
    || players.find((item) => normalizeLookupName(item.name || '').includes(key) || key.includes(normalizeLookupName(item.name || '')));
  if (!player) return '';
  const kd = typeof player.k === 'number' && typeof player.d === 'number' && player.d > 0
    ? (player.k / player.d).toFixed(2)
    : '';
  const lines = [
    formatSourceStamp('CS API / 选手统计'),
    `${player.name || query} 统计排名 #${player.rank || '?'}`,
    typeof player.rating === 'number' ? `Rating: ${player.rating.toFixed(3)} (${player.N || '?'}图)` : '',
    typeof player.adr === 'number' ? `ADR: ${player.adr.toFixed(1)}` : '',
    typeof player.kast === 'number' ? `KAST: ${player.kast.toFixed(1)}%` : '',
    kd ? `K/D: ${kd} (${player.k || 0}/${player.d || 0})` : '',
  ].filter(Boolean).join('\n');
  if (lines) setCached(cacheKey, lines, 30 * 60 * 1000);
  return lines;
}

/** 当前正在进行 + 即将开始的比赛 */
export async function fetchOngoingMatches(): Promise<string> {
  const cacheKey = 'matches';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const html = await getMatchesHtml();
  if (!html) {
    // Liquipedia 失败 → fallback 到 webSearch
    const webResult = await fallbackWebSearch('CS2 ongoing matches today HLTV schedule');
    if (webResult) {
      setCached(cacheKey, webResult, 5 * 60 * 1000);
      return webResult;
    }
    return '';
  }

  const all = parseMatchBlocks(html);
  const now = Math.floor(Date.now() / 1000);

  // 去重（同 team+ts 可能因为 toggle area 重复出现）
  const dedupMap = new Map<string, ParsedMatch>();
  for (const m of all) {
    const k = `${m.team1}|${m.team2}|${m.unixTimestamp}`;
    if (!dedupMap.has(k)) dedupMap.set(k, m);
  }
  const unique = [...dedupMap.values()];

  // LIVE: 未结束 且 开始时间在过去 3 小时到未来 5 分钟之间
  const live = unique.filter((m) => {
    if (m.finished || !m.unixTimestamp) return false;
    const diff = m.unixTimestamp - now;
    return diff < 5 * 60 && diff > -3 * 3600;
  });
  const liveSet = new Set(live);

  // UPCOMING: 未结束 且 时间在未来 5 分钟到 7 天内
  const upcoming = unique
    .filter((m) => {
      if (m.finished || !m.unixTimestamp || liveSet.has(m)) return false;
      const diff = m.unixTimestamp - now;
      return diff >= 5 * 60 && diff < 7 * 24 * 3600;
    })
    .sort((a, b) => (a.unixTimestamp || 0) - (b.unixTimestamp || 0));

  const lines: string[] = [];
  for (const m of live.slice(0, 5)) {
    const sc = m.score1 !== undefined && m.score2 !== undefined ? ` ${m.score1}:${m.score2}` : '';
    const ev = m.event ? ` (${m.event})` : '';
    lines.push(`🔴 LIVE  ${m.team1} vs ${m.team2}${sc}${m.bo ? ` ${m.bo}` : ''}${ev}`);
  }
  for (const m of upcoming.slice(0, 10)) {
    const ts = m.unixTimestamp ? formatTimeShort(m.unixTimestamp) : '待定';
    const ev = m.event ? ` (${m.event})` : '';
    lines.push(`⏰ ${ts}  ${m.team1} vs ${m.team2}${m.bo ? ` ${m.bo}` : ''}${ev}`);
  }

  if (lines.length > 0) {
    lines.unshift(formatSourceStamp('Liquipedia赛程'));
  }
  const result = lines.join('\n');
  if (result) setCached(cacheKey, result, 5 * 60 * 1000);
  return result;
}

/** 最近完赛结果 */
export async function fetchRecentResults(): Promise<string> {
  const cacheKey = 'results';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const csApiResult = await fetchCsApiRecentResults(8);
  if (csApiResult) {
    setCached(cacheKey, csApiResult, 10 * 60 * 1000);
    return csApiResult;
  }

  const html = await getMatchesHtml();
  if (!html) {
    const webResult = await fallbackWebSearch('CS2 recent match results yesterday HLTV scores');
    if (webResult) {
      setCached(cacheKey, webResult, 10 * 60 * 1000);
      return webResult;
    }
    return '';
  }

  const all = parseMatchBlocks(html);
  const now = Math.floor(Date.now() / 1000);

  // 去重
  const dedupMap = new Map<string, ParsedMatch>();
  for (const m of all) {
    const k = `${m.team1}|${m.team2}|${m.unixTimestamp}`;
    if (!dedupMap.has(k)) dedupMap.set(k, m);
  }
  const unique = [...dedupMap.values()];

  // 已结束 + 在过去 72 小时内
  const recent = unique
    .filter((m) => m.finished && m.unixTimestamp && now - m.unixTimestamp < 72 * 3600 && m.unixTimestamp <= now)
    .sort((a, b) => (b.unixTimestamp || 0) - (a.unixTimestamp || 0));

  const lines = recent.slice(0, 8).map((m) => {
    const sc = m.score1 !== undefined && m.score2 !== undefined ? `${m.score1}:${m.score2}` : '?:?';
    const ts = m.unixTimestamp ? formatTimeShort(m.unixTimestamp) : '';
    const ev = m.event ? ` (${m.event})` : '';
    return `✅ ${ts}  ${m.team1} ${sc} ${m.team2}${ev}`;
  });

  if (lines.length > 0) {
    lines.unshift(formatSourceStamp('Liquipedia赛果'));
  }
  const result = lines.join('\n');
  if (result) setCached(cacheKey, result, 10 * 60 * 1000);
  return result;
}

/** 获取战队排名（优先 CS API VRS，兜底 Liquipedia VRS） */
export async function fetchTeamRanking(): Promise<string> {
  const cacheKey = 'ranking';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const csApiRanking = await fetchCsApiRanking(10);
  if (csApiRanking) {
    setCached(cacheKey, csApiRanking, 60 * 60 * 1000);
    return csApiRanking;
  }

  // Valve VRS 是 Liquipedia 上目前最权威的全球积分榜
  const html = await fetchLiquipedia('Valve_Regional_Standings', 12000);
  if (!html) {
    const webResult = await fallbackWebSearch('HLTV CS2 world ranking top 10 teams 2026');
    if (webResult) {
      setCached(cacheKey, webResult, 60 * 60 * 1000);
      return webResult;
    }
    return '';
  }

  const lines: string[] = [];
  // 取第一组 team-template-text 链接（即 Top 团队列表）
  const teamLinks = [...html.matchAll(/<span class="team-template-text"[^>]*><a[^>]*>([^<]+)<\/a><\/span>/g)].map((m) => decodeHtml(m[1].trim()));

  // 去重，保持顺序
  const seen = new Set<string>();
  for (const t of teamLinks) {
    if (seen.has(t) || !t) continue;
    seen.add(t);
    lines.push(`#${seen.size}  ${t}`);
    if (seen.size >= 10) break;
  }

  const result = lines.length > 0 ? `${formatSourceStamp('Liquipedia / VRS排名')}\n${lines.join('\n')}` : '';
  if (result) setCached(cacheKey, result, 6 * 60 * 60 * 1000); // 6 小时
  return result;
}

export function getHltvStats(): { entries: number; keys: string[] } {
  const now = Date.now();
  const valid = [...cache.entries()].filter(([, v]) => v.expiresAt > now);
  return {
    entries: valid.length,
    keys: valid.map(([k]) => k),
  };
}

export function clearHltvCache(): void {
  cache.clear();
  matchesHtmlCache = null;
}

/** 测试用 */
export async function _debugFetchRaw(): Promise<{ matches: number; first?: ParsedMatch; all: ParsedMatch[] }> {
  const html = await getMatchesHtml();
  const all = parseMatchBlocks(html);
  return { matches: all.length, first: all[0], all };
}

void stripTags;
