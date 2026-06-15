#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const API = 'https://genshin-impact.fandom.com/api.php';
const DEFAULT_OUTPUT = 'data/genshin-character-images.json';

function parseArgs(argv) {
  const options = {
    output: DEFAULT_OUTPUT,
    write: false,
    probe: true,
    limitPerCharacter: 48,
    timeoutMs: 10000,
    concurrency: 6,
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
    } else if (arg === '--no-probe') {
      options.probe = false;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--limit-per-character') {
      const value = Number(argv[++index]);
      if (Number.isFinite(value)) options.limitPerCharacter = Math.max(1, Math.min(Math.floor(value), 80));
    } else if (arg.startsWith('--limit-per-character=')) {
      const value = Number(arg.split('=')[1]);
      if (Number.isFinite(value)) options.limitPerCharacter = Math.max(1, Math.min(Math.floor(value), 80));
    } else if (arg === '--concurrency') {
      const value = Number(argv[++index]);
      if (Number.isFinite(value)) options.concurrency = Math.max(1, Math.min(Math.floor(value), 16));
    } else if (arg.startsWith('--concurrency=')) {
      const value = Number(arg.split('=')[1]);
      if (Number.isFinite(value)) options.concurrency = Math.max(1, Math.min(Math.floor(value), 16));
    } else if (arg === '-h' || arg === '--help') {
      console.log([
        '用法:',
        '  node scripts/build-genshin-image-manifest.js --write data/genshin-character-images.json',
        '  node scripts/build-genshin-image-manifest.js --stdout --limit-per-character 24',
        '',
        '说明:',
        '  读取 dist/plugins/fun 的每日原神角色池，再通过 Genshin Impact Wiki MediaWiki API',
        '  收集 Card/Game/Full Wish/Wish/Icon 等公开图片 URL，默认探活后写入 manifest。',
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
    console.error('[genshin-image-manifest] 需要先构建 dist：npm run build');
    console.error(`[genshin-image-manifest] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(2);
  }
}

function requestText(url, timeoutMs, redirects = 5) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    const req = lib.get(url, { headers: { 'User-Agent': 'qqbot-daily-manifest/1.0' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects > 0) {
        const next = new URL(res.headers.location, url).toString();
        res.resume();
        resolve(requestText(next, timeoutMs, redirects - 1));
        return;
      }
      let data = '';
      res.on('data', (chunk) => { data += chunk.toString(); });
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve(data);
        else reject(new Error(`GET ${url} -> HTTP ${res.statusCode}`));
      });
    });
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`GET ${url} timeout`)));
  });
}

function headImage(url, timeoutMs, redirects = 5) {
  return new Promise((resolve) => {
    const lib = url.startsWith('https:') ? https : http;
    const req = lib.request(url, { method: 'HEAD', headers: { 'User-Agent': 'qqbot-daily-manifest/1.0' } }, (res) => {
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

function compact(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '');
}

function apiUrl(params) {
  const url = new URL(API);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  return url.toString();
}

function fileTitleCandidates(character) {
  const names = [character.name, character.cn, ...(character.aliases || [])].filter(Boolean);
  const suffixes = [
    'Card',
    'Character Card',
    'Game',
    'Full Wish',
    'Wish',
    'Multi Wish',
    'Icon',
    'Side Icon',
    'Portrait',
    'Introduction Card',
    'Introduction Banner',
    'Birthday 2025',
    'Birthday 2024',
    'Birthday 2023',
  ];
  const extensions = ['png', 'webp', 'jpg'];
  const titles = [];
  for (const name of names) {
    for (const suffix of suffixes) {
      for (const ext of extensions) {
        titles.push(`File:${name} ${suffix}.${ext}`);
        titles.push(`File:Character ${name} ${suffix}.${ext}`);
      }
    }
  }
  return [...new Set(titles)];
}

function wantedImageTitle(title, character) {
  const normalized = compact(title);
  const keys = [character.name, character.cn, ...(character.aliases || [])].map(compact).filter(Boolean);
  const hasName = keys.some((key) => normalized.includes(key));
  if (!hasName) return false;
  const joined = title.replace(/\s+/g, '');
  if (/(constellation|talent|skill|weapon|material|furnishing|recipe|quest|domain|enemy|boss|artifact|tcgcardback)/i.test(joined)) return false;
  return /(card|game|fullwish|wish|multiwish|icon|portrait|outfit|costume|namecard|introduction|banner|birthday|expression|emoji|emote|chibi|sticker)/i.test(joined);
}

async function queryFilesByTitles(titles, timeoutMs) {
  if (titles.length === 0) return [];
  const chunks = [];
  for (let index = 0; index < titles.length; index += 45) chunks.push(titles.slice(index, index + 45));
  const results = [];
  for (const chunk of chunks) {
    const raw = await requestText(apiUrl({
      action: 'query',
      titles: chunk.join('|'),
      prop: 'imageinfo',
      iiprop: 'url|mime|size',
    }), timeoutMs);
    const data = JSON.parse(raw);
    for (const page of Object.values(data.query?.pages || {})) {
      const info = page.imageinfo?.[0];
      if (info?.url && String(info.mime || '').startsWith('image/')) {
        results.push({ title: page.title, url: info.url, mime: info.mime, width: info.width, height: info.height, size: info.size });
      }
    }
  }
  return results;
}

async function queryAllImages(character, timeoutMs) {
  const prefixes = [character.name, `${character.name} `, `Character ${character.name}`];
  const results = [];
  for (const prefix of prefixes) {
    const raw = await requestText(apiUrl({
      action: 'query',
      generator: 'allimages',
      gaifrom: prefix,
      gailimit: '200',
      prop: 'imageinfo',
      iiprop: 'url|mime|size',
    }), timeoutMs);
    const data = JSON.parse(raw);
    for (const page of Object.values(data.query?.pages || {})) {
      const info = page.imageinfo?.[0];
      if (info?.url && String(info.mime || '').startsWith('image/') && wantedImageTitle(page.title, character)) {
        results.push({ title: page.title, url: info.url, mime: info.mime, width: info.width, height: info.height, size: info.size });
      }
    }
  }
  return results;
}

function scoreImage(item) {
  const text = String(item.title || '').toLowerCase();
  let score = 0;
  if (/full wish/i.test(text)) score += 120;
  if (/\bcard\b/i.test(text)) score += 110;
  if (/introduction|birthday|banner/i.test(text)) score += 95;
  if (/\bgame\b/i.test(text)) score += 90;
  if (/\bwish\b/i.test(text)) score += 80;
  if (/expression|emoji|emote|chibi|sticker/i.test(text)) score += 45;
  if (/\bicon\b/i.test(text)) score += 30;
  if (/portrait|avatar|side icon/i.test(text)) score -= 40;
  if (Number(item.width || 0) >= 1000 || Number(item.height || 0) >= 1000) score += 20;
  return score;
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

async function build(options) {
  const funTest = loadFunTest();
  const characters = funTest.dailyGenshinCharacters;
  const rows = await mapLimit(characters, options.concurrency, async (character) => {
    try {
      const byTitle = await queryFilesByTitles(fileTitleCandidates(character), options.timeoutMs);
      const byPrefix = await queryAllImages(character, options.timeoutMs);
      const seen = new Set();
      const images = [...byTitle, ...byPrefix]
        .filter((item) => {
          if (!item.url || seen.has(item.url)) return false;
          seen.add(item.url);
          return true;
        })
        .sort((a, b) => scoreImage(b) - scoreImage(a) || String(a.title).localeCompare(String(b.title)))
        .slice(0, options.limitPerCharacter);
      const probed = options.probe
        ? await mapLimit(images, Math.min(options.concurrency, 6), async (item) => ({ ...item, _probe: await headImage(item.url, options.timeoutMs) }))
        : images.map((item) => ({ ...item, _probe: { ok: true, skipped: true } }));
      const cards = probed.filter((item) => item._probe.ok).map((item) => ({
        kind: 'genshin',
        key: character.key,
        name: character.name,
        characterKey: character.key,
        characterName: character.cn ? `${character.cn} / ${character.name}` : character.name,
        title: item.title.replace(/^File:/, ''),
        tags: ['genshin-wiki', 'artwork', item.title.includes('Card') ? 'card' : '', item.title.includes('Full Wish') ? 'splash' : '', item.title.includes('Game') ? 'game' : '', item.title.includes('Icon') ? 'icon' : ''].filter(Boolean),
        priority: scoreImage(item),
        url: item.url,
      }));
      return { character, cards, rejected: probed.length - cards.length, error: '' };
    } catch (err) {
      return { character, cards: [], rejected: 0, error: err instanceof Error ? err.message : String(err) };
    }
  });

  const cards = rows.flatMap((row) => row.cards);
  return {
    manifest: {
      generatedAt: new Date().toISOString(),
      source: 'https://genshin-impact.fandom.com/api.php',
      cards,
    },
    summary: {
      characters: characters.length,
      matchedCharacters: rows.filter((row) => row.cards.length > 0).length,
      cards: cards.length,
      rejected: rows.reduce((sum, row) => sum + row.rejected, 0),
      errors: rows.filter((row) => row.error).map((row) => `${row.character.name}: ${row.error}`),
      missing: rows.filter((row) => row.cards.length === 0).map((row) => row.character.name),
      byCharacter: Object.fromEntries(rows.map((row) => [row.character.key, row.cards.length])),
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
    console.error(`[genshin-image-manifest] 已写入: ${outputPath}`);
  } else {
    process.stdout.write(payload);
  }
  if (options.json) {
    console.error(JSON.stringify(summary, null, 2));
  } else {
    console.error(`[genshin-image-manifest] cards=${summary.cards} matchedCharacters=${summary.matchedCharacters}/${summary.characters} rejected=${summary.rejected} errors=${summary.errors.length}`);
    if (summary.missing.length > 0) console.error(`[genshin-image-manifest] missing=${summary.missing.slice(0, 30).join(' | ')}${summary.missing.length > 30 ? ' ...' : ''}`);
  }
})().catch((err) => {
  console.error(`[genshin-image-manifest] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(2);
});
