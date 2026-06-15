#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

function parseArgs(argv) {
  const options = {
    root: process.env.DAILY_IMAGE_PACK_ROOT || 'authorized-images/daily-beauty',
    output: 'data/daily-beauty-images.json',
    write: false,
    includeEmpty: false,
    minImages: 200,
    limit: 30,
    json: false,
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--root') {
      options.root = String(argv[++index] || options.root);
    } else if (arg.startsWith('--root=')) {
      options.root = arg.slice('--root='.length);
    } else if (arg === '--output' || arg === '--write') {
      options.output = String(argv[++index] || options.output);
      options.write = true;
    } else if (arg.startsWith('--output=')) {
      options.output = arg.slice('--output='.length);
    } else if (arg.startsWith('--write=')) {
      options.output = arg.slice('--write='.length);
      options.write = true;
    } else if (arg === '--stdout') {
      options.write = false;
    } else if (arg === '--include-empty') {
      options.includeEmpty = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--min') {
      const value = Number(argv[++index]);
      if (Number.isFinite(value)) options.minImages = Math.max(1, Math.floor(value));
    } else if (arg.startsWith('--min=')) {
      const value = Number(arg.split('=')[1]);
      if (Number.isFinite(value)) options.minImages = Math.max(1, Math.floor(value));
    } else if (arg === '--limit') {
      const value = Number(argv[++index]);
      if (Number.isFinite(value)) options.limit = Math.max(1, Math.min(Math.floor(value), 200));
    } else if (/^--limit=\d+$/.test(arg)) {
      options.limit = Math.max(1, Math.min(Number(arg.split('=')[1]), 200));
    } else if (arg === '-h' || arg === '--help') {
      console.log([
        '用法:',
        '  node scripts/build-daily-image-manifest.js [--root DIR] [--stdout]',
        '  node scripts/build-daily-image-manifest.js --root DIR --write data/daily-beauty-images.json',
        '',
        '目录约定:',
        '  <root>/<kind>/<对象slug>/图片文件',
        '  例: authorized-images/daily-beauty/genshin/hu-tao/*.png',
        '  例: authorized-images/daily-beauty/mokoko/tomori/*.jpg',
        '  例: authorized-images/daily-beauty/player/donk/*.webp',
        '  枪皮/刀皮也支持 <root>/skin/<weapon>/<skin>/ 与 <root>/knife/<knife>/<skin>/',
        '',
        '提示:',
        '  需要先 npm run build，因为脚本读取 dist/plugins/fun 的每日对象清单。',
        '  只扫描本地授权图片包，不联网，不抓站。',
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
    console.error('[daily-image-manifest] 需要先构建 dist：npm run build');
    console.error(`[daily-image-manifest] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(2);
  }
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[《》「」『』“”‘’]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\|/g, ' ')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function compact(value) {
  return slugify(value).replace(/-/g, '');
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function targetSlugCandidates(target) {
  const fields = target.fields || {};
  const values = [
    fields.key,
    fields.nick,
    fields.name,
    fields.characterKey,
    fields.characterName,
    fields.itemKey,
    fields.itemName,
    fields.weapon,
    fields.skin,
    target.label,
  ];
  const slugs = [];
  for (const value of values) {
    const slug = slugify(value);
    if (slug) slugs.push(slug);
    const dense = compact(value);
    if (dense && dense !== slug) slugs.push(dense);
  }
  if (fields.weapon && fields.skin) {
    slugs.push(`${slugify(fields.weapon)}-${slugify(fields.skin)}`);
    slugs.push(`${compact(fields.weapon)}-${compact(fields.skin)}`);
  }
  return unique(slugs);
}

function pairDirectoryCandidates(root, target) {
  const fields = target.fields || {};
  const dirs = [];
  if (fields.weapon && fields.skin) {
    const weapons = unique([slugify(fields.weapon), compact(fields.weapon), slugify(fields.key), compact(fields.key)]);
    const rawSkins = unique([slugify(fields.skin), compact(fields.skin), slugify(fields.itemKey), compact(fields.itemKey), slugify(fields.itemName), compact(fields.itemName)]);
    const skins = new Set(rawSkins);
    for (const weapon of weapons) {
      const weaponDense = weapon.replace(/-/g, '');
      for (const skin of rawSkins) {
        if (skin.startsWith(`${weapon}-`)) skins.add(skin.slice(weapon.length + 1));
        const skinDense = skin.replace(/-/g, '');
        if (weaponDense && skinDense.startsWith(weaponDense) && skinDense.length > weaponDense.length) {
          skins.add(skinDense.slice(weaponDense.length));
        }
      }
    }
    for (const weapon of weapons) {
      for (const skin of skins) {
        if (weapon && skin) dirs.push(path.join(root, target.kind, weapon, skin));
        if (weapon && skin) dirs.push(path.join(root, target.kind, `${weapon}-${skin}`));
      }
    }
  }
  if (target.kind === 'knife' && fields.key && fields.itemKey) {
    dirs.push(path.join(root, target.kind, slugify(fields.key), slugify(fields.itemKey)));
    dirs.push(path.join(root, target.kind, compact(fields.key), compact(fields.itemKey)));
  }
  return dirs;
}

function directoryCandidates(root, target) {
  const kindRoot = path.join(root, target.kind);
  if (target.fields?.weapon && target.fields?.skin) {
    return unique(pairDirectoryCandidates(root, target));
  }
  const slugDirs = targetSlugCandidates(target).map((slug) => path.join(kindRoot, slug));
  return unique([...pairDirectoryCandidates(root, target), ...slugDirs]);
}

function countImages(directory) {
  let count = 0;
  const stack = [directory];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const filepath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(filepath);
      else if (entry.isFile() && IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) count++;
    }
  }
  return count;
}

function existingImageDirectories(root, target) {
  const seen = new Set();
  const dirs = [];
  for (const dir of directoryCandidates(root, target)) {
    const resolved = path.resolve(dir);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    if (!fs.existsSync(resolved)) continue;
    const stat = fs.statSync(resolved);
    if (!stat.isDirectory()) continue;
    const count = countImages(resolved);
    if (count <= 0) continue;
    dirs.push({ dir: resolved, count });
  }
  return dirs;
}

function relativeForManifest(directory, outputPath) {
  const base = path.dirname(path.resolve(outputPath));
  const relative = path.relative(base, directory).replace(/\\/g, '/');
  return relative.startsWith('.') ? relative : `./${relative}`;
}

function cardForTarget(target, dirs, outputPath) {
  return {
    kind: target.kind,
    ...target.fields,
    title: target.label,
    tags: target.tags,
    urls: [],
    files: [],
    dirs: dirs.map((item) => relativeForManifest(item.dir, outputPath)),
  };
}

function buildManifest(root, outputPath, includeEmpty) {
  const funTest = loadFunTest();
  const targets = funTest.dailyImageManifestTargets();
  const cards = [];
  const rows = [];
  for (const target of targets) {
    const dirs = existingImageDirectories(root, target);
    const count = dirs.reduce((sum, item) => sum + item.count, 0);
    if (dirs.length > 0 || includeEmpty) {
      cards.push(cardForTarget(target, dirs, outputPath));
    }
    rows.push({
      kind: target.kind,
      label: target.label,
      count,
      dirs: dirs.length,
      minImages: target.minImages || 200,
      ok: count >= (target.minImages || 200),
    });
  }
  return { minImagesPerItem: 200, cards, rows };
}

const options = parseArgs(process.argv.slice(2));
const root = path.resolve(options.root);
const outputPath = path.resolve(options.output);
const manifest = buildManifest(root, outputPath, options.includeEmpty);
const missing = manifest.rows.filter((row) => !row.ok);
const found = manifest.rows.filter((row) => row.count > 0);
const payload = JSON.stringify({
  minImagesPerItem: options.minImages,
  generatedAt: new Date().toISOString(),
  imagePackRoot: root,
  cards: manifest.cards,
}, null, 2);

if (options.write) {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${payload}\n`, 'utf-8');
  console.log(`[daily-image-manifest] 已写入: ${outputPath}`);
} else {
  console.log(payload);
}

const summary = {
  root,
  output: outputPath,
  targets: manifest.rows.length,
  cards: manifest.cards.length,
  found: found.length,
  ok: manifest.rows.length - missing.length,
  missing: missing.length,
};

if (options.json) {
  console.error(JSON.stringify({ ...summary, rows: manifest.rows }, null, 2));
} else {
  console.error([
    `[daily-image-manifest] root=${root}`,
    `[daily-image-manifest] matched=${summary.found}/${summary.targets} cards=${summary.cards} ok=${summary.ok}/${summary.targets}`,
    found.length > 0
      ? `[daily-image-manifest] 已匹配示例: ${found.slice(0, options.limit).map((row) => `${row.kind} ${row.label} ${row.count}`).join(' | ')}`
      : '[daily-image-manifest] 没找到任何本地图片目录；按 <root>/<kind>/<slug>/ 放图后再运行。',
    missing.length > 0
      ? `[daily-image-manifest] 未达标示例: ${missing.slice(0, options.limit).map((row) => `${row.kind} ${row.label} ${row.count}/${row.minImages}`).join(' | ')}`
      : '[daily-image-manifest] 全部对象达到最低图片数。',
  ].join('\n'));
}
