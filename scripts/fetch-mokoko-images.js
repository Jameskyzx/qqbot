#!/usr/bin/env node
/**
 * MyGO/Ave Mujica 角色图片爬取脚本
 * 从 Bestdori 和官方图库爬取高清卡面
 * 目标：每位角色200+张高质量图片
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CHARACTER_LIST = [
  { key: 'tomori', name: '高松燈', band: 'MyGO!!!!!', bestdoriId: 'tomori' },
  { key: 'anon', name: '長崎素世', band: 'MyGO!!!!!', bestdoriId: 'anon' },
  { key: 'sakiko', name: '椎名櫻子', band: 'MyGO!!!!!', bestdoriId: 'sakiko' },
  { key: 'taki', name: '豐川祥子', band: 'MyGO!!!!!', bestdoriId: 'taki' },
  { key: 'soyo', name: '長崎爽世', band: 'MyGO!!!!!', bestdoriId: 'soyo' },
  { key: 'rana', name: '椎名立希', band: 'MyGO!!!!!', bestdoriId: 'rana' },
  { key: 'sakiko-am', name: '櫻子', band: 'Ave Mujica', bestdoriId: 'sakiko' },
  { key: 'oblivionis', name: 'Oblivionis', band: 'Ave Mujica', bestdoriId: 'oblivionis' },
  { key: 'mortis', name: 'Mortis', band: 'Ave Mujica', bestdoriId: 'mortis' },
  { key: 'timoris', name: 'Timoris', band: 'Ave Mujica', bestdoriId: 'timoris' },
  { key: 'amoris', name: 'Amoris', band: 'Ave Mujica', bestdoriId: 'amoris' },
  { key: 'doloris', name: 'Doloris', band: 'Ave Mujica', bestdoriId: 'doloris' },
];

const OUTPUT_ROOT = process.env.DAILY_IMAGE_PACK_ROOT || 'authorized-images/daily-beauty';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const DELAY_MS = 1500;
const MAX_IMAGES_PER_CHARACTER = 250;
const MIN_IMAGE_SIZE_KB = 30;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    client.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return httpsGet(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const file = fs.createWriteStream(outputPath);
    client.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(outputPath);
        return downloadImage(res.headers.location, outputPath).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(outputPath);
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        const stats = fs.statSync(outputPath);
        if (stats.size < MIN_IMAGE_SIZE_KB * 1024) {
          fs.unlinkSync(outputPath);
          return reject(new Error('Image too small'));
        }
        resolve(outputPath);
      });
    }).on('error', (err) => {
      file.close();
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      reject(err);
    });
  });
}

async function fetchBestdoriCards(character) {
  const charDir = path.join(OUTPUT_ROOT, 'mokoko', character.key);
  if (!fs.existsSync(charDir)) {
    fs.mkdirSync(charDir, { recursive: true });
  }

  console.log(`[Bestdori] 搜索 ${character.name} 卡面...`);

  try {
    // Bestdori API - 获取所有卡片
    const apiUrl = 'https://bestdori.com/api/cards/all.5.json';
    const cardsData = JSON.parse(await httpsGet(apiUrl));

    const characterCards = [];
    for (const [cardId, card] of Object.entries(cardsData)) {
      // 检查角色ID匹配（Bestdori的角色ID需要映射）
      if (card.characterId && matchCharacter(card, character)) {
        characterCards.push({ id: cardId, ...card });
      }
    }

    console.log(`[Bestdori] 找到 ${characterCards.length} 张卡面`);

    let downloaded = 0;
    for (const card of characterCards.slice(0, MAX_IMAGES_PER_CHARACTER)) {
      // Bestdori卡面URL格式
      const baseUrl = 'https://bestdori.com/assets/jp/characters/resourceset/';

      // 下载训练前、训练后、特训后
      const variants = [
        { suffix: '_card_normal', label: 'normal' },
        { suffix: '_card_after_training', label: 'trained' },
        { suffix: '_rip', label: 'rip' },
      ];

      for (const variant of variants) {
        const imageUrl = `${baseUrl}${card.resourceSetName}${variant.suffix}.png`;
        const filename = `bestdori_card${card.id}_${variant.label}.png`;
        const outputPath = path.join(charDir, filename);

        if (fs.existsSync(outputPath)) {
          console.log(`[Bestdori] 跳过已存在: ${filename}`);
          continue;
        }

        try {
          await downloadImage(imageUrl, outputPath);
          downloaded++;
          console.log(`[Bestdori] 下载成功 [${downloaded}]: ${filename}`);
          await sleep(DELAY_MS);
        } catch (err) {
          console.log(`[Bestdori] 下载失败: ${filename} - ${err.message}`);
        }
      }
    }

    return downloaded;
  } catch (err) {
    console.error(`[Bestdori] API失败: ${err.message}`);
    return 0;
  }
}

function matchCharacter(card, character) {
  // MyGO角色ID映射 (需要根据实际API调整)
  const characterIdMap = {
    'tomori': [51],
    'anon': [52],
    'sakiko': [53, 58], // MyGO和Ave Mujica版本
    'taki': [54],
    'soyo': [55],
    'rana': [56],
    'oblivionis': [59],
    'mortis': [60],
    'timoris': [61],
    'amoris': [62],
    'doloris': [63],
  };

  const validIds = characterIdMap[character.key] || [];
  return validIds.includes(card.characterId);
}

async function fetchOfficialArt(character) {
  const charDir = path.join(OUTPUT_ROOT, 'mokoko', character.key);
  if (!fs.existsSync(charDir)) {
    fs.mkdirSync(charDir, { recursive: true });
  }

  console.log(`[Official] 搜索 ${character.name} 官方图...`);

  // 官方Twitter、B站、官网等来源的图片URL列表
  // 这里需要手动维护或通过其他API获取
  const officialUrls = [
    // 示例URL，实际需要补充
    // `https://example.com/mygo/${character.key}/official_1.jpg`,
  ];

  if (officialUrls.length === 0) {
    console.log(`[Official] 暂无${character.name}的官方图源配置`);
    return 0;
  }

  let downloaded = 0;
  for (const url of officialUrls) {
    const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
    const ext = path.extname(new URL(url).pathname) || '.jpg';
    const filename = `official_${hash}${ext}`;
    const outputPath = path.join(charDir, filename);

    if (fs.existsSync(outputPath)) {
      console.log(`[Official] 跳过已存在: ${filename}`);
      continue;
    }

    try {
      await downloadImage(url, outputPath);
      downloaded++;
      console.log(`[Official] 下载成功 [${downloaded}]: ${filename}`);
      await sleep(DELAY_MS);
    } catch (err) {
      console.log(`[Official] 下载失败: ${url} - ${err.message}`);
    }
  }

  return downloaded;
}

async function fetchCharacterImages(character) {
  console.log(`\n========================================`);
  console.log(`开始爬取 ${character.name} (${character.band})`);
  console.log(`========================================`);

  const bestdoriCount = await fetchBestdoriCards(character);
  await sleep(DELAY_MS * 2);

  const officialCount = await fetchOfficialArt(character);

  const total = bestdoriCount + officialCount;
  console.log(`\n${character.name} 完成: Bestdori ${bestdoriCount}张 + Official ${officialCount}张 = 共${total}张`);

  return total;
}

async function main() {
  console.log('MyGO/Ave Mujica 角色图片爬取脚本');
  console.log(`输出目录: ${OUTPUT_ROOT}/mokoko/`);
  console.log(`目标数量: 每位角色最多${MAX_IMAGES_PER_CHARACTER}张`);
  console.log(`延迟设置: 每次请求间隔${DELAY_MS}ms`);
  console.log('');

  const totalStats = {
    characters: 0,
    images: 0,
    failed: 0,
  };

  for (const character of CHARACTER_LIST) {
    try {
      const count = await fetchCharacterImages(character);
      totalStats.characters++;
      totalStats.images += count;

      if (CHARACTER_LIST.indexOf(character) < CHARACTER_LIST.length - 1) {
        console.log(`\n等待 ${DELAY_MS * 2}ms 后继续下一位角色...\n`);
        await sleep(DELAY_MS * 2);
      }
    } catch (err) {
      console.error(`\n${character.name} 爬取异常: ${err.message}\n`);
      totalStats.failed++;
    }
  }

  console.log('\n========================================');
  console.log('爬取完成');
  console.log(`成功: ${totalStats.characters}位角色`);
  console.log(`失败: ${totalStats.failed}位角色`);
  console.log(`图片: 共${totalStats.images}张`);
  console.log('========================================');
  console.log('\n下一步: 运行 node scripts/build-bestdori-card-manifest.js --write');
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { fetchCharacterImages, CHARACTER_LIST };
