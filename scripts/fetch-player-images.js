#!/usr/bin/env node
/**
 * 选手图片爬取脚本
 * 从 Liquipedia 和 Wikimedia 爬取CS选手高清图片
 * 目标：每位选手200+张高质量图片
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PLAYER_LIST = [
  { nick: 'ZywOo', name: 'Mathieu Herbaut', team: 'Vitality' },
  { nick: 's1mple', name: 'Oleksandr Kostyliev', team: 'Falcons' },
  { nick: 'donk', name: 'Danil Kryshkovets', team: 'Spirit' },
  { nick: 'm0NESY', name: 'Ilya Osipov', team: 'G2' },
  { nick: 'NiKo', name: 'Nikola Kovač', team: 'G2' },
  { nick: 'ropz', name: 'Robin Kool', team: 'FaZe' },
  { nick: 'frozen', name: 'David Čerňanský', team: 'FaZe' },
  { nick: 'Twistzz', name: 'Russel Van Dulken', team: 'Liquid' },
  { nick: 'NAF', name: 'Keith Markovic', team: 'Liquid' },
  { nick: 'jL', name: 'Justinas Lekavicius', team: 'MongoZ' },
];

const OUTPUT_ROOT = process.env.DAILY_IMAGE_PACK_ROOT || 'authorized-images/daily-beauty';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const DELAY_MS = 2000; // 2秒延迟，避免被封IP
const MAX_IMAGES_PER_PLAYER = 250;
const MIN_IMAGE_SIZE_KB = 50; // 最小50KB，过滤缩略图

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

function sanitizeFilename(str) {
  return str.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 100);
}

async function fetchLiquipediaImages(player) {
  const playerDir = path.join(OUTPUT_ROOT, 'player', player.nick.toLowerCase());
  if (!fs.existsSync(playerDir)) {
    fs.mkdirSync(playerDir, { recursive: true });
  }

  console.log(`[Liquipedia] 搜索 ${player.nick} 图片...`);

  try {
    // 搜索 Liquipedia Gallery
    const galleryUrl = `https://liquipedia.net/counterstrike/index.php?title=Special:Search&search=${encodeURIComponent(player.nick)}+gallery&ns6=1`;
    const html = await httpsGet(galleryUrl);

    // 简单正则提取图片URL（生产环境建议用cheerio等HTML解析库）
    const imgRegex = /https:\/\/liquipedia\.net\/commons\/images\/[^"\s]+\.(?:jpg|jpeg|png|webp)/gi;
    const matches = html.match(imgRegex) || [];
    const uniqueUrls = [...new Set(matches)];

    console.log(`[Liquipedia] 找到 ${uniqueUrls.length} 张候选图片`);

    let downloaded = 0;
    for (const url of uniqueUrls.slice(0, MAX_IMAGES_PER_PLAYER)) {
      if (downloaded >= MAX_IMAGES_PER_PLAYER / 2) break; // Liquipedia最多占一半

      const hash = crypto.createHash('md5').update(url).digest('hex').substring(0, 8);
      const ext = path.extname(new URL(url).pathname);
      const filename = `liquipedia_${hash}${ext}`;
      const outputPath = path.join(playerDir, filename);

      if (fs.existsSync(outputPath)) {
        console.log(`[Liquipedia] 跳过已存在: ${filename}`);
        continue;
      }

      try {
        await downloadImage(url, outputPath);
        downloaded++;
        console.log(`[Liquipedia] 下载成功 [${downloaded}]: ${filename}`);
        await sleep(DELAY_MS);
      } catch (err) {
        console.log(`[Liquipedia] 下载失败: ${url} - ${err.message}`);
      }
    }

    return downloaded;
  } catch (err) {
    console.error(`[Liquipedia] 搜索失败: ${err.message}`);
    return 0;
  }
}

async function fetchWikimediaImages(player) {
  const playerDir = path.join(OUTPUT_ROOT, 'player', player.nick.toLowerCase());
  if (!fs.existsSync(playerDir)) {
    fs.mkdirSync(playerDir, { recursive: true });
  }

  console.log(`[Wikimedia] 搜索 ${player.name} 图片...`);

  try {
    // Wikimedia Commons API搜索
    const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(player.name + ' esports')}&srnamespace=6&format=json&srlimit=50`;
    const data = JSON.parse(await httpsGet(searchUrl));

    if (!data.query || !data.query.search) {
      console.log(`[Wikimedia] 未找到结果`);
      return 0;
    }

    console.log(`[Wikimedia] 找到 ${data.query.search.length} 个候选文件`);

    let downloaded = 0;
    for (const item of data.query.search) {
      if (downloaded >= MAX_IMAGES_PER_PLAYER / 2) break; // Wikimedia最多占一半

      const title = item.title.replace('File:', '');
      const imageInfoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(title)}&prop=imageinfo&iiprop=url&format=json`;

      try {
        const infoData = JSON.parse(await httpsGet(imageInfoUrl));
        const pages = infoData.query.pages;
        const pageId = Object.keys(pages)[0];

        if (pageId === '-1' || !pages[pageId].imageinfo) {
          console.log(`[Wikimedia] 跳过无效文件: ${title}`);
          continue;
        }

        const imageUrl = pages[pageId].imageinfo[0].url;
        const hash = crypto.createHash('md5').update(imageUrl).digest('hex').substring(0, 8);
        const ext = path.extname(new URL(imageUrl).pathname);
        const filename = `wikimedia_${hash}${ext}`;
        const outputPath = path.join(playerDir, filename);

        if (fs.existsSync(outputPath)) {
          console.log(`[Wikimedia] 跳过已存在: ${filename}`);
          continue;
        }

        await downloadImage(imageUrl, outputPath);
        downloaded++;
        console.log(`[Wikimedia] 下载成功 [${downloaded}]: ${filename}`);
        await sleep(DELAY_MS);
      } catch (err) {
        console.log(`[Wikimedia] 处理失败: ${title} - ${err.message}`);
      }
    }

    return downloaded;
  } catch (err) {
    console.error(`[Wikimedia] 搜索失败: ${err.message}`);
    return 0;
  }
}

async function fetchPlayerImages(player) {
  console.log(`\n========================================`);
  console.log(`开始爬取 ${player.nick} (${player.name} / ${player.team})`);
  console.log(`========================================`);

  const liquipediaCount = await fetchLiquipediaImages(player);
  await sleep(DELAY_MS * 2); // 源之间额外延迟

  const wikimediaCount = await fetchWikimediaImages(player);

  const total = liquipediaCount + wikimediaCount;
  console.log(`\n${player.nick} 完成: Liquipedia ${liquipediaCount}张 + Wikimedia ${wikimediaCount}张 = 共${total}张`);

  return total;
}

async function main() {
  console.log('CS选手图片爬取脚本');
  console.log(`输出目录: ${OUTPUT_ROOT}/player/`);
  console.log(`目标数量: 每位选手最多${MAX_IMAGES_PER_PLAYER}张`);
  console.log(`延迟设置: 每次请求间隔${DELAY_MS}ms`);
  console.log('');

  const totalStats = {
    players: 0,
    images: 0,
    failed: 0,
  };

  for (const player of PLAYER_LIST) {
    try {
      const count = await fetchPlayerImages(player);
      totalStats.players++;
      totalStats.images += count;

      // 选手之间额外延迟
      if (PLAYER_LIST.indexOf(player) < PLAYER_LIST.length - 1) {
        console.log(`\n等待 ${DELAY_MS * 3}ms 后继续下一位选手...\n`);
        await sleep(DELAY_MS * 3);
      }
    } catch (err) {
      console.error(`\n${player.nick} 爬取异常: ${err.message}\n`);
      totalStats.failed++;
    }
  }

  console.log('\n========================================');
  console.log('爬取完成');
  console.log(`成功: ${totalStats.players}位选手`);
  console.log(`失败: ${totalStats.failed}位选手`);
  console.log(`图片: 共${totalStats.images}张`);
  console.log('========================================');
  console.log('\n下一步: 运行 node scripts/build-daily-image-manifest.js --write');
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { fetchPlayerImages, PLAYER_LIST };
