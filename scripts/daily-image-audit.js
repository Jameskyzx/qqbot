#!/usr/bin/env node
const path = require('path');

function parseArgs(argv) {
  const options = {
    limit: 40,
    strict: process.env.WANJIER_DAILY_IMAGE_AUDIT_STRICT === '1',
    json: false,
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === '--strict') {
      options.strict = true;
    } else if (arg === '--json') {
      options.json = true;
    } else if (arg === '--limit') {
      const value = Number(argv[index + 1]);
      if (Number.isFinite(value)) {
        options.limit = Math.max(1, Math.min(Math.floor(value), 200));
        index++;
      }
    } else if (/^--limit=\d+$/.test(arg)) {
      options.limit = Math.max(1, Math.min(Number(arg.split('=')[1]), 200));
    } else if (arg === '-h' || arg === '--help') {
      console.log([
        '用法: node scripts/daily-image-audit.js [--limit N] [--strict] [--json]',
        '环境变量:',
        '  DAILY_BEAUTY_IMAGE_MANIFEST_PATH    指定 data/daily-beauty-images.json 的替代路径',
        '  WANJIER_DAILY_IMAGE_AUDIT_STRICT=1  有未达标项时返回非零退出码',
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
    console.error('[daily-image-audit] 需要先构建 dist：npm run build');
    console.error(`[daily-image-audit] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(2);
  }
}

const options = parseArgs(process.argv.slice(2));
const funTest = loadFunTest();
const rows = funTest.dailyBeautyAuditRows();
const missing = rows.filter((row) => !row.ok);

if (options.json) {
  console.log(JSON.stringify({
    total: rows.length,
    ok: rows.length - missing.length,
    missing: missing.length,
    rows,
  }, null, 2));
} else {
  console.log(funTest.buildDailyImageAuditReport(options.limit));
}

if (options.strict && missing.length > 0) {
  process.exit(4);
}
