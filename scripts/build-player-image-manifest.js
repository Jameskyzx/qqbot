#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const DEFAULT_OUTPUT = 'data/daily-player-images.json';

function parseArgs(argv) {
  const options = {
    output: DEFAULT_OUTPUT,
    write: false,
    probe: false,
    timeoutMs: 8000,
    json: false,
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--output' || arg === '--write') {
      options.output = String(argv[++index] || options.output);
      options.write = true;
    } else if (arg.startsWith('--output=')) {
      options.output = arg.slice('--output='.length);
    } else if (arg.startsWith('--write=')) {
      options.output = arg.slice('--write='.length);
      options.write = true;
    } else if (arg === '--stdout') {
      options.write = false;
    } else if (arg === '--probe') {
      options.probe = true;
    } else if (arg === '--no-probe') {
      options.probe = false;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '-h' || arg === '--help') {
      console.log([
        '用法:',
        '  node scripts/build-player-image-manifest.js --write data/daily-player-images.json',
        '  node scripts/build-player-image-manifest.js --stdout --no-probe',
        '',
        '说明:',
        '  读取 dist/plugins/fun 的每日选手池，把现有可信图片 URL 生成 daily-player 兼容清单。',
        '  默认不探活，因为 Liquipedia/Wikimedia 经常拒绝 HEAD；需要严格探活时加 --probe。',
        '  这是兼容兜底清单，不替代 data/daily-beauty-images.json 里的每选手200张美图硬目标。',
      ].join('\n'));
      process.exit(0);
    }
  }
  return options;
}

function loadFunTest() {
  try {
    return require(path.resolve(__dirname, '..', 'dist', 'plugins', 'fun')).__test;
  } catch (err) {
    console.error('[player-image-manifest] 需要先构建 dist：npm run build');
    console.error(`[player-image-manifest] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(2);
  }
}

function headImage(url, timeoutMs, redirects = 5) {
  return new Promise((resolve) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      resolve({ ok: false, status: 0, type: '', error: 'bad-url' });
      return;
    }
    const lib = parsed.protocol === 'https:' ? https : http;
    const headers = {
      'User-Agent': 'qqbot-daily-manifest/1.0',
      'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    };
    if (parsed.hostname.includes('liquipedia.net')) headers.Referer = 'https://liquipedia.net/';
    const req = lib.request(url, {
      method: 'HEAD',
      headers,
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        const next = new URL(res.headers.location, url).toString();
        res.resume();
        resolve(headImage(next, timeoutMs, redirects - 1));
        return;
      }
      const type = String(res.headers['content-type'] || '').toLowerCase();
      resolve({
        ok: Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 300 && type.startsWith('image/')),
        status: res.statusCode || 0,
        type,
        length: Number(res.headers['content-length'] || 0) || 0,
      });
    });
    req.on('error', (err) => resolve({ ok: false, status: 0, type: '', error: err.message }));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve({ ok: false, status: 0, type: '', error: 'timeout' });
    });
    req.end();
  });
}

async function mapLimit(items, limit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function cardForPlayer(player) {
  return {
    kind: 'player',
    key: player.nick,
    nick: player.nick,
    name: player.name,
    title: `${player.nick} / ${player.team || 'CS player'} official-compatible image`,
    team: player.team,
    role: player.role,
    tags: [
      'player',
      'compatibility',
      player.imageSource || 'source',
      /at_|_at_|major|blast|iem|pgl|esl|cct|roman|stake|sydney|katowice|dallas|copenhagen|stockholm|budapest/i.test(player.image || '') ? 'event-photo' : '',
      /allmode|squad|team/i.test(player.image || '') ? 'team-photo' : '',
      /wikimedia/i.test(player.imageSource || player.image || '') ? 'wikimedia' : '',
      /liquipedia/i.test(player.imageSource || player.image || '') ? 'liquipedia' : '',
    ].filter(Boolean),
    priority: /allmode|squad|team/i.test(player.image || '') ? 40 : 70,
    url: player.image,
  };
}

async function build(options) {
  const funTest = loadFunTest();
  const players = funTest.csPlayers || [];
  const candidates = players
    .filter((player) => /^https?:\/\//i.test(String(player.image || '')))
    .map(cardForPlayer);
  const probed = options.probe
    ? await mapLimit(candidates, 6, async (card) => ({ card, probe: await headImage(card.url, options.timeoutMs) }))
    : candidates.map((card) => ({ card, probe: { ok: true, skipped: true } }));
  const cards = probed.filter((item) => item.probe.ok).map((item) => item.card);
  const missing = players.filter((player) => !cards.some((card) => card.nick === player.nick)).map((player) => player.nick);
  return {
    manifest: {
      generatedAt: new Date().toISOString(),
      source: 'dist/plugins/fun.csPlayers image fields',
      note: 'Compatibility fallback only. Use data/daily-beauty-images.json or DAILY_IMAGE_PACK_ROOT for 200+ curated images per player.',
      cards,
    },
    summary: {
      players: players.length,
      cards: cards.length,
      matchedPlayers: new Set(cards.map((card) => card.nick)).size,
      rejected: probed.length - cards.length,
      missing,
      byPlayer: Object.fromEntries(players.map((player) => [player.nick, cards.filter((card) => card.nick === player.nick).length])),
    },
  };
}

(async () => {
  const options = parseArgs(process.argv.slice(2));
  const outputPath = path.resolve(options.output);
  const { manifest, summary } = await build(options);
  const payload = `${JSON.stringify(manifest, null, 2)}\n`;
  if (options.write) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, payload, 'utf-8');
    console.error(`[player-image-manifest] 已写入: ${outputPath}`);
  } else {
    process.stdout.write(payload);
  }
  if (options.json) {
    console.error(JSON.stringify(summary, null, 2));
  } else {
    console.error(`[player-image-manifest] cards=${summary.cards} matchedPlayers=${summary.matchedPlayers}/${summary.players} rejected=${summary.rejected}`);
    if (summary.missing.length > 0) console.error(`[player-image-manifest] missing=${summary.missing.join(' | ')}`);
  }
})().catch((err) => {
  console.error(`[player-image-manifest] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(2);
});
