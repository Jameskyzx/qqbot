#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const CARDS_API = 'https://bestdori.com/api/cards/all.5.json';
const CHARACTERS_API = 'https://bestdori.com/api/characters/all.2.json';
const DEFAULT_OUTPUT = 'data/bestdori-cards.json';

const CHARACTER_TARGETS = [
  { key: 'tomori', fallbackId: 36, aliases: ['tomori', 'takamatsu tomori', 'tomori takamatsu', '高松 燈', '高松 灯'] },
  { key: 'anon', fallbackId: 37, aliases: ['anon', 'chihaya anon', 'anon chihaya', '千早 愛音', '千早 爱音'] },
  { key: 'rana', fallbackId: 38, aliases: ['rana', 'raana', 'kaname rana', 'kaname raana', '要 楽奈', '要 乐奈'] },
  { key: 'soyo', fallbackId: 39, aliases: ['soyo', 'nagasaki soyo', 'soyo nagasaki', '長崎 そよ', '长崎 爽世'] },
  { key: 'taki', fallbackId: 40, aliases: ['taki', 'shiina taki', 'taki shiina', '椎名 立希'] },
  { key: 'uika', fallbackId: null, aliases: ['uika', 'misumi uika', 'uika misumi', '三角 初華', '三角 初华', 'doloris'] },
  { key: 'mutsumi', fallbackId: null, aliases: ['mutsumi', 'wakaba mutsumi', 'mutsumi wakaba', '若葉 睦', '若叶 睦', 'mortis'] },
  { key: 'umiri', fallbackId: null, aliases: ['umiri', 'yahata umiri', 'umiri yahata', '八幡 海鈴', '八幡 海铃', 'timoris'] },
  { key: 'nyamu', fallbackId: null, aliases: ['nyamu', 'yutenji nyamu', 'yuutenji nyamu', '祐天寺 にゃむ', '祐天寺 若麦', 'amoris'] },
  { key: 'sakiko', fallbackId: null, aliases: ['sakiko', 'togawa sakiko', 'sakiko togawa', '豊川 祥子', '丰川 祥子', 'oblivionis'] },
];

function parseArgs(argv) {
  const options = {
    output: DEFAULT_OUTPUT,
    write: false,
    probe: true,
    includeUnprobed: false,
    includeTrim: false,
    minRarity: 1,
    limitPerCharacter: 0,
    timeoutMs: 8000,
    concurrency: 8,
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
    } else if (arg === '--include-unprobed') {
      options.includeUnprobed = true;
    } else if (arg === '--include-trim') {
      options.includeTrim = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--min-rarity') {
      const value = Number(argv[++index]);
      if (Number.isFinite(value)) options.minRarity = Math.max(1, Math.min(Math.floor(value), 5));
    } else if (arg.startsWith('--min-rarity=')) {
      const value = Number(arg.split('=')[1]);
      if (Number.isFinite(value)) options.minRarity = Math.max(1, Math.min(Math.floor(value), 5));
    } else if (arg === '--limit-per-character') {
      const value = Number(argv[++index]);
      if (Number.isFinite(value)) options.limitPerCharacter = Math.max(0, Math.floor(value));
    } else if (arg.startsWith('--limit-per-character=')) {
      const value = Number(arg.split('=')[1]);
      if (Number.isFinite(value)) options.limitPerCharacter = Math.max(0, Math.floor(value));
    } else if (arg === '--concurrency') {
      const value = Number(argv[++index]);
      if (Number.isFinite(value)) options.concurrency = Math.max(1, Math.min(Math.floor(value), 24));
    } else if (arg.startsWith('--concurrency=')) {
      const value = Number(arg.split('=')[1]);
      if (Number.isFinite(value)) options.concurrency = Math.max(1, Math.min(Math.floor(value), 24));
    } else if (arg === '-h' || arg === '--help') {
      console.log([
        '用法:',
        '  node scripts/build-bestdori-card-manifest.js --write data/bestdori-cards.json',
        '  node scripts/build-bestdori-card-manifest.js --stdout --no-probe',
        '',
        '说明:',
        '  从 Bestdori 公开 cards/characters API 生成每日木柜子卡面 manifest。',
        '  默认会 HEAD 探活候选 card_normal/card_after_training PNG，只写 content-type 为 image/* 的 URL。',
        '  当前 Bestdori API 可自动覆盖 MyGO!!!!! 角色；Ave Mujica 若 API 后续暴露角色名/ID，会按别名自动匹配。',
      ].join('\n'));
      process.exit(0);
    }
  }
  return options;
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
        length: Number(res.headers['content-length'] || 0) || 0,
      });
    });
    req.on('error', (err) => resolve({ ok: false, status: 0, type: '', length: 0, error: err.message }));
    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve({ ok: false, status: 0, type: '', length: 0, error: 'timeout' });
    });
    req.end();
  });
}

function compact(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '');
}

function localized(values, preferredIndexes = [3, 1, 0, 2, 4]) {
  if (!Array.isArray(values)) return '';
  for (const index of preferredIndexes) {
    const value = values[index];
    if (value) return String(value);
  }
  return values.find(Boolean) || '';
}

function allNames(character) {
  return [
    ...(Array.isArray(character.characterName) ? character.characterName : []),
    ...(Array.isArray(character.nickname) ? character.nickname : []),
  ].filter(Boolean).map(String);
}

function resolveCharacterIds(characters) {
  const result = new Map();
  for (const target of CHARACTER_TARGETS) {
    const aliases = target.aliases.map(compact).filter(Boolean);
    if (target.fallbackId && characters[String(target.fallbackId)]) {
      result.set(target.fallbackId, target);
      continue;
    }
    const matched = Object.entries(characters).find(([, character]) => {
      const names = allNames(character).map(compact).filter(Boolean);
      return names.some((name) => aliases.some((alias) => {
        if (name === alias) return true;
        const mostlyLatin = /^[a-z0-9]+$/.test(alias);
        if (mostlyLatin && alias.length < 8) return false;
        return name.includes(alias) || alias.includes(name);
      }));
    });
    if (matched) result.set(Number(matched[0]), target);
    else if (target.fallbackId) result.set(target.fallbackId, target);
  }
  return result;
}

function cardImageUrls(resourceSetName, includeTrim) {
  const base = `https://bestdori.com/assets/jp/characters/resourceset/${resourceSetName}_rip`;
  const urls = [
    { url: `${base}/card_normal.png`, tag: 'card-normal' },
    { url: `${base}/card_after_training.png`, tag: 'card-trained' },
  ];
  if (includeTrim) {
    urls.push({ url: `${base}/trim_normal.png`, tag: 'trim-normal' });
    urls.push({ url: `${base}/trim_after_training.png`, tag: 'trim-trained' });
  }
  return urls;
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
  const [cardsRaw, charactersRaw] = await Promise.all([
    requestText(CARDS_API, options.timeoutMs),
    requestText(CHARACTERS_API, options.timeoutMs),
  ]);
  const cards = JSON.parse(cardsRaw);
  const characters = JSON.parse(charactersRaw);
  const targetByCharacterId = resolveCharacterIds(characters);
  const candidates = [];
  for (const [cardId, card] of Object.entries(cards)) {
    const target = targetByCharacterId.get(Number(card.characterId));
    if (!target || !card.resourceSetName || Number(card.rarity || 0) < options.minRarity) continue;
    const character = characters[String(card.characterId)] || {};
    const characterName = localized(character.characterName) || target.key;
    const cardTitle = localized(card.prefix) || `Card ${cardId}`;
    for (const image of cardImageUrls(card.resourceSetName, options.includeTrim)) {
      candidates.push({
        kind: 'mokoko',
        key: target.key,
        characterKey: target.key,
        characterName,
        title: `${cardTitle} / ${image.tag}`,
        tags: ['bestdori', 'card', 'artwork', image.tag, `rarity-${card.rarity}`, card.type || 'card'].filter(Boolean),
        priority: Number(card.rarity || 0) * 10 + (image.tag.includes('trained') ? 5 : 0),
        url: image.url,
        _cardId: cardId,
        _resourceSetName: card.resourceSetName,
      });
    }
  }

  const probed = options.probe
    ? await mapLimit(candidates, options.concurrency, async (candidate) => {
      const probe = await headImage(candidate.url, options.timeoutMs);
      return { ...candidate, _probe: probe };
    })
    : candidates.map((candidate) => ({ ...candidate, _probe: { ok: true, skipped: true } }));

  const grouped = new Map();
  const rejected = [];
  for (const candidate of probed) {
    if (!candidate._probe.ok && !options.includeUnprobed) {
      rejected.push(candidate);
      continue;
    }
    const copy = { ...candidate };
    delete copy._probe;
    delete copy._cardId;
    delete copy._resourceSetName;
    const list = grouped.get(copy.characterKey) || [];
    list.push(copy);
    grouped.set(copy.characterKey, list);
  }

  const cardsOut = [];
  for (const target of CHARACTER_TARGETS) {
    const list = grouped.get(target.key) || [];
    const sorted = list.sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0) || String(a.title).localeCompare(String(b.title)));
    cardsOut.push(...(options.limitPerCharacter > 0 ? sorted.slice(0, options.limitPerCharacter) : sorted));
  }

  const summary = {
    source: 'Bestdori cards/characters API',
    targets: CHARACTER_TARGETS.length,
    matchedCharacters: grouped.size,
    cards: cardsOut.length,
    rejected: rejected.length,
    byCharacter: Object.fromEntries(CHARACTER_TARGETS.map((target) => [target.key, (grouped.get(target.key) || []).length])),
  };
  return {
    manifest: {
      generatedAt: new Date().toISOString(),
      source: 'https://bestdori.com/api/cards/all.5.json',
      cards: cardsOut,
    },
    summary,
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
    console.error(`[bestdori-card-manifest] 已写入: ${outputPath}`);
  } else {
    process.stdout.write(payload);
  }
  const lines = [
    `[bestdori-card-manifest] cards=${summary.cards} matchedCharacters=${summary.matchedCharacters}/${summary.targets} rejected=${summary.rejected}`,
    `[bestdori-card-manifest] byCharacter=${Object.entries(summary.byCharacter).map(([key, count]) => `${key}:${count}`).join(' ')}`,
  ];
  if (options.json) console.error(JSON.stringify(summary, null, 2));
  else console.error(lines.join('\n'));
})().catch((err) => {
  console.error(`[bestdori-card-manifest] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(2);
});
