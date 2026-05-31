import * as https from 'https';

/**
 * HLTV.org 数据抓取 - 替代 webSearch 实现更准确的CS2数据
 *
 * 注意：HLTV 没有官方公开 API，这里通过抓取 m.hltv.org（移动版页面更轻量、更稳定）
 * 来获取比分/赛程/排名。所有响应带 5-10 分钟缓存以避免被ban。
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const cache: Map<string, CacheEntry<string>> = new Map();
const MAX_RESPONSE_BYTES = 1.5 * 1024 * 1024; // 1.5MB 上限

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
  // 限制缓存大小
  if (cache.size > 50) {
    const sorted = [...cache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    for (const [k] of sorted.slice(0, 10)) cache.delete(k);
  }
}

function httpsGet(url: string, timeoutMs: number = 6000): Promise<string> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (v: string) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      finish('');
      return;
    }

    const req = https.get({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    }, (res) => {
      // 处理 301/302 跳转
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        const next = res.headers.location.startsWith('http') ? res.headers.location : `https://${parsed.hostname}${res.headers.location}`;
        return httpsGet(next, timeoutMs).then(finish);
      }
      if (res.statusCode && res.statusCode >= 400) {
        finish('');
        res.resume();
        return;
      }
      let data = '';
      let total = 0;
      res.on('data', (chunk: Buffer) => {
        total += chunk.length;
        if (total > MAX_RESPONSE_BYTES) {
          finish('');
          req.destroy();
          return;
        }
        data += chunk.toString();
      });
      res.on('end', () => finish(data));
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
  return decodeHtml(html.replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/** 获取当前正在进行 + 即将开始的比赛 (m.hltv.org/matches) */
export async function fetchOngoingMatches(): Promise<string> {
  const cacheKey = 'matches';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const html = await httpsGet('https://www.hltv.org/matches', 7000);
  if (!html) return '';

  const lines: string[] = [];

  // Live matches: <div class="liveMatch-container"> 包含 team1/team2/event
  const liveBlocks = html.match(/<div class="liveMatch-container[^"]*"[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g) || [];
  for (const block of liveBlocks.slice(0, 8)) {
    const teams = [...block.matchAll(/class="matchTeamName text-ellipsis"[^>]*>([^<]+)<\/div>/g)].map((m) => decodeHtml(m[1]).trim());
    const score = block.match(/class="currentMapScore">([\s\S]*?)<\/div>/);
    const event = block.match(/class="matchEventName text-ellipsis[^"]*"[^>]*>([^<]+)<\/div>/);
    if (teams.length >= 2) {
      const scoreText = score ? stripTags(score[1]) : '';
      const eventName = event ? decodeHtml(event[1]).trim() : '';
      lines.push(`🔴 LIVE  ${teams[0]} vs ${teams[1]}${scoreText ? ' ' + scoreText : ''}${eventName ? ' (' + eventName + ')' : ''}`);
    }
  }

  // Upcoming - 解析 matchDayHeadline + match listings
  // 格式: <a class="match a-reset" href="/matches/...">..teams..time..event..</a>
  const upcomingBlocks = html.match(/<a class="match a-reset"[\s\S]*?<\/a>/g) || [];
  let upCount = 0;
  for (const block of upcomingBlocks) {
    if (upCount >= 8) break;
    const teamMatches = [...block.matchAll(/class="matchTeamName text-ellipsis"[^>]*>([^<]+)<\/div>/g)].map((m) => decodeHtml(m[1]).trim());
    const time = block.match(/class="matchTime[^"]*"[^>]*data-unix="(\d+)"/);
    const event = block.match(/class="matchEventName text-ellipsis"[^>]*>([^<]+)<\/div>/);
    if (teamMatches.length >= 2 && teamMatches[0] !== 'TBD' && teamMatches[1] !== 'TBD') {
      let timeStr = '待定';
      if (time) {
        const unix = parseInt(time[1], 10);
        if (!isNaN(unix)) {
          const d = new Date(unix);
          const now = new Date();
          const diffH = (unix - now.getTime()) / 1000 / 3600;
          if (diffH < 0) continue; // 跳过已过去的
          if (diffH < 24) {
            timeStr = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
          } else {
            timeStr = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
          }
        }
      }
      const eventName = event ? decodeHtml(event[1]).trim() : '';
      lines.push(`⏰ ${timeStr}  ${teamMatches[0]} vs ${teamMatches[1]}${eventName ? ' (' + eventName + ')' : ''}`);
      upCount++;
    }
  }

  const result = lines.length > 0 ? lines.join('\n') : '';
  if (result) setCached(cacheKey, result, 5 * 60 * 1000); // 5分钟
  return result;
}

/** 获取 HLTV Top10 排名 */
export async function fetchTeamRanking(): Promise<string> {
  const cacheKey = 'ranking';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const html = await httpsGet('https://www.hltv.org/ranking/teams', 7000);
  if (!html) return '';

  const lines: string[] = [];
  // <div class="ranked-team standard-box">..含<span class="position">#1</span>..<span class="name">Vitality</span>..<span class="points">(950 points)</span>
  const blocks = html.match(/<div class="ranked-team[\s\S]*?<\/div>\s*<\/div>/g) || [];
  for (const block of blocks.slice(0, 10)) {
    const pos = block.match(/<span class="position">#(\d+)<\/span>/);
    const name = block.match(/<span class="name">([^<]+)<\/span>/);
    const points = block.match(/<span class="points">\(([\d,]+) points?\)<\/span>/);
    if (pos && name) {
      const teamName = decodeHtml(name[1]).trim();
      const pts = points ? points[1] : '';
      lines.push(`#${pos[1]}  ${teamName}${pts ? ` (${pts}分)` : ''}`);
    }
  }

  const result = lines.join('\n');
  if (result) setCached(cacheKey, result, 30 * 60 * 1000); // 30分钟
  return result;
}

/** 获取最近比赛结果 */
export async function fetchRecentResults(): Promise<string> {
  const cacheKey = 'results';
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const html = await httpsGet('https://www.hltv.org/results', 7000);
  if (!html) return '';

  const lines: string[] = [];
  // <div class="result-con"> 包含两个 team1 team2 + result-score
  const blocks = html.match(/<div class="result-con[^"]*"[\s\S]*?<\/a>/g) || [];
  for (const block of blocks.slice(0, 8)) {
    const teams = [...block.matchAll(/class="team\s*team-won"[^>]*>([^<]+)<\/div>|class="team"[^>]*>([^<]+)<\/div>/g)].map((m) => decodeHtml(m[1] || m[2]).trim());
    const score = block.match(/class="result-score"[^>]*>([\s\S]*?)<\/td>/);
    const event = block.match(/class="event-name"[^>]*>([^<]+)</);
    if (teams.length >= 2) {
      const scoreText = score ? stripTags(score[1]) : '';
      const eventName = event ? decodeHtml(event[1]).trim() : '';
      lines.push(`✅ ${teams[0]} ${scoreText} ${teams[1]}${eventName ? ' (' + eventName + ')' : ''}`);
    }
  }

  const result = lines.join('\n');
  if (result) setCached(cacheKey, result, 10 * 60 * 1000); // 10分钟
  return result;
}

/** HLTV API状态 */
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
}
