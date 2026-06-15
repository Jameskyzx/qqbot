#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const strict = process.argv.includes('--strict');
const asJson = process.argv.includes('--json');

const rows = [];
const risks = [];
const suggestions = [];

function run(command, args = [], options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: 'utf-8',
    shell: false,
    ...options,
  });
  return {
    status: typeof result.status === 'number' ? result.status : -1,
    stdout: String(result.stdout || '').trim(),
    stderr: String(result.stderr || '').trim(),
    error: result.error ? result.error.message : '',
  };
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function add(label, ok, detail = '') {
  rows.push({ label, ok, detail });
  if (!ok && detail) risks.push(`${label}: ${detail}`);
}

function commandLine(args) {
  return args.join(' ');
}

function packageScript(name) {
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
    return !!pkg.scripts && !!pkg.scripts[name];
  } catch {
    return false;
  }
}

function readJson(rel) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf-8'));
  } catch {
    return null;
  }
}

function compact(value, max = 96) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function inspectGit() {
  const inside = run('git', ['rev-parse', '--is-inside-work-tree']);
  add('git 工作区', inside.status === 0 && inside.stdout === 'true', inside.stderr || inside.error || inside.stdout);
  if (inside.status !== 0) return;

  const branch = run('git', ['branch', '--show-current']);
  add('当前分支', branch.status === 0 && !!branch.stdout, branch.stdout || branch.stderr || 'unknown');

  const head = run('git', ['log', '--oneline', '-1']);
  add('当前提交', head.status === 0 && !!head.stdout, compact(head.stdout));

  const status = run('git', ['status', '--short']);
  const dirtyLines = status.stdout ? status.stdout.split(/\r?\n/).filter(Boolean) : [];
  add('工作区改动', dirtyLines.length === 0, dirtyLines.length === 0 ? 'clean' : `${dirtyLines.length} 项改动，更新前确认是否为 VPS 本地配置/数据`);
  if (dirtyLines.length > 0) {
    suggestions.push('本地有改动时优先用 npm run update；确实要完全对齐远端才用 bash scripts/update.sh --hard');
  }

  const remote = run('git', ['rev-parse', '--short', 'origin/main']);
  if (remote.status === 0) add('origin/main', true, remote.stdout);
  else suggestions.push('尚未 fetch 到 origin/main；更新脚本会自动 git fetch origin');
}

function inspectRuntime() {
  const nodeVersion = process.version;
  add('Node.js', true, nodeVersion);
  const major = Number((nodeVersion.match(/^v(\d+)/) || [])[1] || 0);
  if (major && major < 22) {
    risks.push(`Node.js 版本偏旧: ${nodeVersion}，当前 CI 使用 Node 22`);
  }

  const npm = process.platform === 'win32'
    ? run('cmd.exe', ['/d', '/s', '/c', 'npm --version'])
    : run('npm', ['--version']);
  add('npm', npm.status === 0, npm.stdout || npm.stderr || npm.error);

  const pm2 = process.platform === 'win32'
    ? run('cmd.exe', ['/d', '/s', '/c', 'pm2 jlist'])
    : run('pm2', ['jlist']);
  if (pm2.status === 0) {
    let state = 'pm2 可用';
    try {
      const apps = JSON.parse(pm2.stdout || '[]');
      const app = apps.find((item) => item.name === 'wanjier');
      state = app ? `wanjier=${app.pm2_env?.status || 'unknown'}` : '未找到 wanjier 进程';
      if (!app) suggestions.push('首次部署或 PM2 进程缺失时运行 npm run update，它会按 ecosystem.config.js 启动');
    } catch {
      state = 'pm2 可用，但状态 JSON 解析失败';
    }
    add('PM2', true, state);
  } else {
    add('PM2', false, pm2.stderr || pm2.error || 'pm2 不可用');
    suggestions.push('VPS 首次部署需安装 PM2: npm install -g pm2');
  }
}

function inspectFiles() {
  add('package-lock.json', exists('package-lock.json'), exists('package-lock.json') ? '存在' : '缺失，npm ci 不可复现');
  add('config.example.json', exists('config.example.json'), exists('config.example.json') ? '存在' : '缺失');
  add('config.json', exists('config.json'), exists('config.json') ? '存在' : '缺失，首次部署需 cp config.example.json config.json');
  add('.env', true, exists('.env') ? '存在' : '可选；建议用它放 API key/token');
  if (!exists('.env')) suggestions.push('建议在 VPS 用 .env 放 WANJIER_API_KEY 和 WANJIER_ADMIN_TOKEN，并用 pm2 restart wanjier --update-env 生效');
  add('dist/index.js', exists('dist/index.js'), exists('dist/index.js') ? '存在' : '缺失，先 npm run build');

  const config = readJson('config.json') || readJson('config.example.json') || {};
  const webPort = Number(config.web_admin_port || 0);
  if (webPort > 0) {
    const token = String(process.env.WANJIER_ADMIN_TOKEN || '').trim();
    add('Web 管理后台 token', token.length >= 16, token ? `长度 ${token.length}` : 'web_admin_port 已启用但 WANJIER_ADMIN_TOKEN 未设置');
  }

  if (!packageScript('update')) risks.push('package.json 缺少 update 脚本');
  if (!packageScript('verify')) risks.push('package.json 缺少 verify 脚本');
}

function buildCommands() {
  const commands = [];
  commands.push(['日常更新', 'cd /opt/wanjier-bot && npm run update']);
  commands.push(['只读预检', 'cd /opt/wanjier-bot && npm run vps:check']);
  commands.push(['完整本机验证', 'npm run verify']);
  commands.push(['只同步配置字段', 'npm run config:sync -- --apply']);
  commands.push(['强制对齐远端', 'bash scripts/update.sh --hard']);
  commands.push(['看 PM2 日志', 'pm2 logs wanjier --lines 80 --nostream']);
  commands.push(['群内验收', '/ping -> /status -> /data -> /csplayer status -> /vision status -> /trace last']);
  return commands;
}

function main() {
  inspectGit();
  inspectRuntime();
  inspectFiles();

  const commands = buildCommands();
  const okCount = rows.filter((row) => row.ok).length;
  const failCount = rows.length - okCount;
  const payload = { ok: failCount === 0, okCount, failCount, rows, risks, suggestions, commands };

  if (asJson) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log('vps check report');
    console.log(`OK: ${okCount}  风险: ${risks.length}`);
    for (const row of rows) {
      console.log(`${row.ok ? '+' : '!'} ${row.label}${row.detail ? `: ${row.detail}` : ''}`);
    }
    console.log('');
    console.log('建议命令');
    for (const [label, cmd] of commands) {
      console.log(`- ${label}: ${cmd}`);
    }
    if (suggestions.length > 0) {
      console.log('');
      console.log('提示');
      suggestions.forEach((item) => console.log(`? ${item}`));
    }
  }

  if (strict && risks.length > 0) process.exit(1);
}

main();
