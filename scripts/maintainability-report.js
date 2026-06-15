#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const jsonMode = process.argv.includes('--json');

const SOURCE_DIRS = ['src', 'scripts'];
const LARGE_RUNTIME_LINE_THRESHOLD = 1200;
const LARGE_STATIC_LINE_THRESHOLD = 1000;

function toRel(filepath) {
  return path.relative(root, filepath).replace(/\\/g, '/');
}

function walkFiles(dirRel, predicate) {
  const dir = path.join(root, dirRel);
  const files = [];
  function walk(current) {
    if (!fs.existsSync(current)) return;
    for (const item of fs.readdirSync(current)) {
      const filepath = path.join(current, item);
      const stat = fs.statSync(filepath);
      if (stat.isDirectory()) {
        if (['node_modules', 'dist', '.git'].includes(item)) continue;
        walk(filepath);
      } else if (!predicate || predicate(filepath)) {
        files.push(filepath);
      }
    }
  }
  walk(dir);
  return files;
}

function classifyFile(rel, text) {
  const lower = rel.toLowerCase();
  if (
    lower.includes('data')
    || lower.includes('manifest')
    || lower.endsWith('fun-data.ts')
  ) {
    return 'static-data';
  }
  if (rel.startsWith('scripts/')) return 'script';
  if (rel.includes('/plugins/')) return 'plugin';
  return 'core';
}

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function inspectFile(filepath) {
  const rel = toRel(filepath);
  const text = fs.readFileSync(filepath, 'utf-8');
  const lines = text.split(/\r?\n/);
  const nonEmptyLines = lines.filter((line) => line.trim()).length;
  const imports = countMatches(text, /^\s*import\s+/gm) + countMatches(text, /^\s*const\s+.*=\s+require\(/gm);
  const exports = countMatches(text, /^\s*export\s+/gm) + countMatches(text, /^\s*module\.exports\s*=/gm);
  const todos = countMatches(text, /\b(?:TODO|FIXME|HACK)\b/g);
  const policyScoped = rel.startsWith('src/');
  const directConsole = !policyScoped || rel === 'src/logger.ts' ? 0 : countMatches(text, /\bconsole\.(?:log|warn|error|info|debug)\s*\(/g);
  const directJsonWrite = !policyScoped || rel === 'src/plugins/runtime-storage.ts'
    ? 0
    : countMatches(text, /\bfs\.writeFileSync\s*\([^)]*JSON\.stringify/g);
  const directRename = !policyScoped || rel === 'src/plugins/runtime-storage.ts'
    ? 0
    : countMatches(text, /\bfs\.renameSync\s*\(/g);
  const kind = classifyFile(rel, text);
  const maintainabilityScore = lines.length
    + imports * 8
    + exports * 18
    + todos * 25
    + directConsole * 120
    + (directJsonWrite + directRename) * 160;

  return {
    rel,
    kind,
    lines: lines.length,
    nonEmptyLines,
    bytes: Buffer.byteLength(text, 'utf-8'),
    imports,
    exports,
    todos,
    directConsole,
    directJsonWrite,
    directRename,
    maintainabilityScore,
  };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function buildRecommendations(files) {
  const recommendations = [];
  const largeRuntime = files
    .filter((file) => ['core', 'plugin'].includes(file.kind) && file.lines >= LARGE_RUNTIME_LINE_THRESHOLD)
    .sort((a, b) => b.maintainabilityScore - a.maintainabilityScore)
    .slice(0, 8);
  for (const file of largeRuntime) {
    recommendations.push({
      level: file.lines >= 3000 ? 'high' : 'medium',
      file: file.rel,
      reason: `${file.lines} lines, ${file.imports} imports, ${file.exports} exports`,
      action: '优先抽纯函数/状态存储/命令格式化到相邻小模块，并补 smoke 覆盖。',
    });
  }

  const policyHits = files
    .filter((file) => file.directConsole || file.directJsonWrite || file.directRename)
    .sort((a, b) => (b.directConsole + b.directJsonWrite + b.directRename) - (a.directConsole + a.directJsonWrite + a.directRename));
  for (const file of policyHits.slice(0, 6)) {
    recommendations.push({
      level: 'hard',
      file: file.rel,
      reason: `console=${file.directConsole}, directJsonWrite=${file.directJsonWrite}, directRename=${file.directRename}`,
      action: 'doctor 会阻断这类 src 策略漂移：日志走 createLogger，JSON/状态写盘走 runtime-storage。',
    });
  }

  if (!recommendations.some((item) => item.file === 'src/plugins/ai-chat.ts')) {
    const aiChat = files.find((file) => file.rel === 'src/plugins/ai-chat.ts');
    if (aiChat) {
      recommendations.push({
        level: 'medium',
        file: aiChat.rel,
        reason: `${aiChat.lines} lines，仍是核心协作热点`,
        action: '下一轮优先拆 conversation governance、reply trace、media orchestration 和 realtime evidence helpers。',
      });
    }
  }

  const configFile = files.find((file) => file.rel === 'src/config.ts');
  if (configFile) {
    recommendations.push({
      level: 'info',
      file: configFile.rel,
      reason: '配置归一化已承载大量运行参数',
      action: '继续按“对话治理 / 多模态 / 运维 / 记忆”分组维护默认值和校验规则，避免单表无限膨胀。',
    });
  }

  return recommendations;
}

function main() {
  const files = SOURCE_DIRS
    .flatMap((dir) => walkFiles(dir, (filepath) => /\.(?:ts|js)$/.test(filepath)))
    .map(inspectFile)
    .sort((a, b) => a.rel.localeCompare(b.rel));

  const totals = {
    files: files.length,
    lines: files.reduce((sum, file) => sum + file.lines, 0),
    bytes: files.reduce((sum, file) => sum + file.bytes, 0),
    runtimeLarge: files.filter((file) => ['core', 'plugin'].includes(file.kind) && file.lines >= LARGE_RUNTIME_LINE_THRESHOLD).length,
    staticLarge: files.filter((file) => file.kind === 'static-data' && file.lines >= LARGE_STATIC_LINE_THRESHOLD).length,
    directConsole: files.reduce((sum, file) => sum + file.directConsole, 0),
    directJsonWrite: files.reduce((sum, file) => sum + file.directJsonWrite, 0),
    directRename: files.reduce((sum, file) => sum + file.directRename, 0),
    todos: files.reduce((sum, file) => sum + file.todos, 0),
  };

  const topFiles = [...files].sort((a, b) => b.lines - a.lines).slice(0, 12);
  const largeRuntimeModules = files
    .filter((file) => ['core', 'plugin'].includes(file.kind) && file.lines >= LARGE_RUNTIME_LINE_THRESHOLD)
    .sort((a, b) => b.lines - a.lines);
  const largeStaticFiles = files
    .filter((file) => file.kind === 'static-data' && file.lines >= LARGE_STATIC_LINE_THRESHOLD)
    .sort((a, b) => b.lines - a.lines);
  const recommendations = buildRecommendations(files);
  const commands = [
    'npm run maintainability',
    'npm run doctor',
    'npm run verify',
  ];

  const payload = {
    generatedAt: new Date().toISOString(),
    totals,
    topFiles,
    largeRuntimeModules,
    largeStaticFiles,
    recommendations,
    commands,
  };

  if (jsonMode) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  console.log('maintainability report');
  console.log(`summary: ${totals.files} files, ${totals.lines} lines, ${formatBytes(totals.bytes)}, TODO/FIXME=${totals.todos}`);
  console.log(`policy: console=${totals.directConsole}, directJsonWrite=${totals.directJsonWrite}, directRename=${totals.directRename}`);
  console.log('');
  console.log('large runtime modules');
  (largeRuntimeModules.length ? largeRuntimeModules : [{ rel: 'none', lines: 0, imports: 0, exports: 0 }])
    .slice(0, 10)
    .forEach((file) => console.log(`- ${file.rel}: ${file.lines} lines, imports=${file.imports}, exports=${file.exports}`));
  console.log('');
  console.log('large static/data files');
  (largeStaticFiles.length ? largeStaticFiles : [{ rel: 'none', lines: 0, bytes: 0 }])
    .slice(0, 8)
    .forEach((file) => console.log(`- ${file.rel}: ${file.lines} lines, ${formatBytes(file.bytes || 0)}`));
  console.log('');
  console.log('next upgrade candidates');
  recommendations.slice(0, 10).forEach((item) => {
    console.log(`- [${item.level}] ${item.file}: ${item.reason}; ${item.action}`);
  });
  console.log('');
  console.log('commands');
  commands.forEach((command) => console.log(`- ${command}`));
}

main();
