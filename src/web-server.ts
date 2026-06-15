import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { URL } from 'url';
import { Bot } from './bot';
import { CONFIG_PATH, loadConfig, normalizeConfig } from './config';
import { writeJsonFileAtomic } from './plugins/runtime-storage';
import { getCacheStats as getImageCacheStats } from './plugins/image-cache';
import { getSearchStats } from './plugins/web-search';
import { getVoiceStats } from './plugins/tts';
import { getSttStats } from './plugins/stt';
import { getKnowledgeStats } from './plugins/knowledge-base';
import { getAiChatStats } from './plugins/ai-chat';
import { getEmbeddingStats } from './plugins/embedding-store';
import { getHltvStats } from './plugins/hltv-api';
import { createLogger } from './logger';

/**
 * 轻量Web管理后台
 *
 * 端点：
 *   GET  /            - 仪表盘 HTML
 *   GET  /api/status  - 综合状态 JSON (默认需要鉴权)
 *   GET  /api/config  - 当前 config (脱敏 api_key，默认需要鉴权)
 *   POST /api/config  - 更新 config (需要鉴权)
 *   GET  /api/logs    - 最近日志 (默认需要鉴权)
 *   POST /api/restart - 触发重启 (PM2 会自动重启)
 *   GET  /api/health  - 健康检查
 *
 * 鉴权：admin_token 通过环境变量 WANJIER_ADMIN_TOKEN 设置，前端在 header 提供 X-Admin-Token
 */

const PROJECT_ROOT = path.resolve(__dirname, '..');
const LOGS_DIR = path.resolve(PROJECT_ROOT, 'logs');
const DEFAULT_WEB_HOST = '127.0.0.1';
const log = createLogger('Web');

let server: http.Server | null = null;

function getAdminToken(): string {
  return (process.env.WANJIER_ADMIN_TOKEN || '').trim();
}

function getWebHost(): string {
  return (process.env.WANJIER_WEB_ADMIN_HOST || DEFAULT_WEB_HOST).trim() || DEFAULT_WEB_HOST;
}

function isReadOnlyPublic(): boolean {
  return (process.env.WANJIER_WEB_ADMIN_READONLY_PUBLIC || '').trim() === '1';
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function checkAuth(req: http.IncomingMessage): boolean {
  const token = getAdminToken();
  if (token.length < 16) return false;
  if (!token) return false; // 没设置就不允许（避免暴露）
  const provided = (req.headers['x-admin-token'] || '').toString().trim();
  return safeEqual(provided, token);
}

function checkReadAuth(req: http.IncomingMessage): boolean {
  return isReadOnlyPublic() || checkAuth(req);
}

function sendJson(res: http.ServerResponse, status: number, data: unknown): void {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(data, null, 2));
}

function readBody(req: http.IncomingMessage, maxBytes: number = 256 * 1024): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let total = 0;
    req.on('data', (chunk: Buffer) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error('Body too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function tailLog(filename: string, maxLines: number = 200): string {
  try {
    const filepath = path.join(LOGS_DIR, filename);
    if (!fs.existsSync(filepath)) return '';
    const stat = fs.statSync(filepath);
    // 只读最后 256KB
    const readBytes = Math.min(stat.size, 256 * 1024);
    const fd = fs.openSync(filepath, 'r');
    const buf = Buffer.alloc(readBytes);
    fs.readSync(fd, buf, 0, readBytes, stat.size - readBytes);
    fs.closeSync(fd);
    const lines = buf.toString('utf-8').split('\n');
    return lines.slice(-maxLines).join('\n');
  } catch {
    return '';
  }
}

function maskConfig(config: any): any {
  if (!config || typeof config !== 'object') return config;
  const masked = JSON.parse(JSON.stringify(config));
  if (masked.ai && typeof masked.ai.api_key === 'string') {
    const k = masked.ai.api_key;
    masked.ai.api_key = k.length > 8 ? k.slice(0, 4) + '...' + k.slice(-4) : '***';
  }
  return masked;
}

function buildDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>玩机器 Bot 管理后台</title>
<style>
:root { --bg: #0d1117; --fg: #c9d1d9; --accent: #58a6ff; --warn: #f0883e; --err: #f85149; --ok: #56d364; --card: #161b22; --border: #30363d; }
* { box-sizing: border-box; }
body { background: var(--bg); color: var(--fg); font-family: 'SF Mono', Consolas, 'Microsoft YaHei', monospace; margin: 0; padding: 16px; font-size: 14px; line-height: 1.5; }
h1 { color: var(--accent); margin: 0 0 16px 0; font-size: 22px; }
h2 { color: var(--accent); border-bottom: 1px solid var(--border); padding-bottom: 6px; margin: 18px 0 12px 0; font-size: 16px; }
.card { background: var(--card); border: 1px solid var(--border); border-radius: 6px; padding: 14px; margin-bottom: 12px; }
.row { display: flex; justify-content: space-between; padding: 4px 0; }
.row .key { color: #8b949e; }
.row .val { font-weight: 600; }
.ok { color: var(--ok); }
.err { color: var(--err); }
.warn { color: var(--warn); }
button { background: var(--accent); color: #fff; border: 0; padding: 8px 14px; border-radius: 4px; cursor: pointer; font-family: inherit; margin-right: 8px; }
button.danger { background: var(--err); }
button:disabled { opacity: 0.5; cursor: not-allowed; }
input, textarea { background: #0d1117; color: var(--fg); border: 1px solid var(--border); border-radius: 4px; padding: 8px; font-family: inherit; width: 100%; box-sizing: border-box; }
textarea { min-height: 200px; font-size: 12px; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 12px; }
.token-input { max-width: 400px; }
pre { background: #0d1117; padding: 10px; border-radius: 4px; overflow: auto; max-height: 400px; border: 1px solid var(--border); font-size: 12px; }
.status-dot { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: middle; }
.status-dot.ok { background: var(--ok); box-shadow: 0 0 8px var(--ok); }
.status-dot.err { background: var(--err); }
nav { margin-bottom: 16px; }
nav a { color: var(--accent); margin-right: 16px; cursor: pointer; text-decoration: none; }
.tab { display: none; }
.tab.active { display: block; }
</style>
</head>
<body>
<h1>🎮 玩机器 Bot 管理后台</h1>
<div style="margin-bottom: 12px;">
  <input class="token-input" id="token" placeholder="管理员 Token (env WANJIER_ADMIN_TOKEN)" />
  <button onclick="saveToken()">保存</button>
  <span id="auth-status"></span>
</div>
<nav>
  <a onclick="switchTab('status')">📊 状态</a>
  <a onclick="switchTab('config')">⚙️ 配置</a>
  <a onclick="switchTab('logs')">📜 日志</a>
  <a onclick="switchTab('actions')">🛠 操作</a>
</nav>

<div id="tab-status" class="tab active">
  <div class="grid" id="status-cards">加载中...</div>
</div>

<div id="tab-config" class="tab">
  <div class="card">
    <h2>当前配置 (api_key 已脱敏，需要原值请直接编辑 config.json)</h2>
    <textarea id="config-text" readonly></textarea>
    <div style="margin-top: 12px;">
      <button onclick="loadConfig()">刷新</button>
      <button class="danger" onclick="saveConfig()">保存修改 (需 token)</button>
    </div>
  </div>
</div>

<div id="tab-logs" class="tab">
  <div class="card">
    <h2>最近日志 (out.log)</h2>
    <pre id="log-content">加载中...</pre>
    <button onclick="loadLogs()">刷新</button>
  </div>
</div>

<div id="tab-actions" class="tab">
  <div class="card">
    <h2>维护操作</h2>
    <p>这些操作都需要 Token。重启依赖 PM2 自动拉起。</p>
    <button class="danger" onclick="restart()">🔄 重启 Bot</button>
  </div>
</div>

<script>
let token = localStorage.getItem('wanjier_token') || '';
document.getElementById('token').value = token;

function saveToken() {
  token = document.getElementById('token').value.trim();
  localStorage.setItem('wanjier_token', token);
  document.getElementById('auth-status').innerHTML = token ? '<span class="ok">✓ 已保存</span>' : '<span class="warn">未设置</span>';
  refresh();
}

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  if (name === 'config') loadConfig();
  if (name === 'logs') loadLogs();
}

async function api(path, opts = {}) {
  opts.headers = { ...(opts.headers || {}), 'X-Admin-Token': token, 'Content-Type': 'application/json' };
  const res = await fetch(path, opts);
  return res.json();
}

async function refresh() {
  try {
    const data = await api('/api/status');
    renderStatus(data);
  } catch (err) {
    document.getElementById('status-cards').innerHTML = '<div class="card err">加载失败: ' + err.message + '</div>';
  }
}

function row(key, val, cls = '') {
  return '<div class="row"><span class="key">' + key + '</span><span class="val ' + cls + '">' + val + '</span></div>';
}

function renderStatus(data) {
  if (!data || data.error) {
    document.getElementById('status-cards').innerHTML = '<div class="card err">' + (data ? data.error : '无数据') + '</div>';
    return;
  }
  const r = data.runtime || {};
  const ai = data.ai || {};
  const memMB = data.process ? (data.process.heapMB + 'MB / RSS ' + data.process.rssMB + 'MB') : '-';
  const loginCheckedAt = r.lastLoginCheckAt ? new Date(r.lastLoginCheckAt).toLocaleString('zh-CN') : '未检查';
  const loginOkAt = r.lastLoginOkAt ? new Date(r.lastLoginOkAt).toLocaleString('zh-CN') : '未确认';
  const loginAgeMs = r.lastLoginCheckAt ? Date.now() - r.lastLoginCheckAt : 0;
  const loginStale = !!(r.lastLoginCheckAt && r.loginCheckIntervalSeconds > 0 && loginAgeMs > (r.loginCheckIntervalSeconds * 2000));
  const loginFreshness = !r.lastLoginCheckAt
    ? '未检查'
    : (r.loginCheckIntervalSeconds <= 0 ? '检查关闭' : (loginStale ? '过期' : '正常'));
  const loginFreshnessClass = !r.lastLoginCheckAt || loginStale ? 'warn' : (r.loginCheckIntervalSeconds <= 0 ? 'warn' : 'ok');
  const loginState = r.lastLoginOk
    ? '✓ ' + (r.lastLoginNickname || r.lastLoginUserId || '')
    : (r.lastLoginCheckAt ? '✗ ' + (r.lastLoginError || '未知') : '未确认 ' + (r.lastLoginError || '等待检查'));
  const html = [
    '<div class="card">' +
      '<h2>🤖 Bot 连接</h2>' +
      row('状态', '<span class="status-dot ' + (r.connected ? 'ok' : 'err') + '"></span>' + (r.connected ? '已连接' : '未连接'), r.connected ? 'ok' : 'err') +
      row('WebSocket', r.wsUrl || '-') +
      row('登录', loginState, r.lastLoginOk ? 'ok' : 'err') +
      row('检查时间', loginCheckedAt + (r.loginCheckInFlight ? ' (进行中)' : '')) +
      row('最近OK', loginOkAt) +
      row('新鲜度', loginFreshness, loginFreshnessClass) +
      row('断开次数', r.totalDisconnects || 0) +
      row('Pool', (r.poolUrls || []).length > 1 ? (r.poolActiveIdx + 1) + '/' + r.poolUrls.length : '单连接') +
      '<div style="margin-top: 10px;"><button onclick="loginCheck()">检查登录</button></div>' +
    '</div>',
    '<div class="card">' +
      '<h2>💾 资源</h2>' +
      row('内存', memMB) +
      row('启动时间', new Date(data.process ? data.process.startedAt : Date.now()).toLocaleString('zh-CN')) +
    '</div>',
    '<div class="card">' +
      '<h2>🧠 AI</h2>' +
      row('总请求', ai.totalRequests || 0) +
      row('总回复', ai.totalReplies || 0) +
      row('文字缓存命中', ai.replyCacheHits || 0) +
    '</div>',
    '<div class="card">' +
      '<h2>📦 缓存</h2>' +
      row('图片', (data.imageCache || {}).count + ' / ' + (data.imageCache || {}).sizeMB + 'MB') +
      row('搜索', (data.searchCache || {}).cacheEntries) +
      row('TTS', (data.voice || {}).cacheFiles + ' / ' + (data.voice || {}).sizeMB + 'MB') +
      row('STT', (data.stt || {}).cacheFiles + ' / ' + (data.stt || {}).sizeMB + 'MB') +
      row('HLTV', (data.hltv || {}).entries) +
      row('向量索引', (data.embedding || {}).totalIndexed + ' 条 / ' + (data.embedding || {}).sessionsInMemory + ' 会话') +
    '</div>',
    '<div class="card">' +
      '<h2>📚 知识库</h2>' +
      row('块数', (data.knowledge || {}).sections) +
      row('字数', (data.knowledge || {}).chars) +
      row('自动更新', (data.knowledge || {}).autoEnabled ? '开' : '关') +
    '</div>',
  ].join('');
  document.getElementById('status-cards').innerHTML = html;
}

async function loadConfig() {
  try {
    const data = await api('/api/config');
    document.getElementById('config-text').value = JSON.stringify(data, null, 2);
    document.getElementById('config-text').readOnly = !token;
  } catch (err) {
    alert('加载失败: ' + err.message);
  }
}

async function saveConfig() {
  if (!token) { alert('需要 token'); return; }
  if (!confirm('确认保存配置？需要重启生效')) return;
  try {
    const text = document.getElementById('config-text').value;
    const json = JSON.parse(text);
    const res = await api('/api/config', { method: 'POST', body: JSON.stringify(json) });
    alert(res.ok ? '✓ 保存成功，需重启生效' : '✗ ' + (res.error || '失败'));
  } catch (err) {
    alert('保存失败: ' + err.message);
  }
}

async function loadLogs() {
  try {
    const data = await api('/api/logs');
    document.getElementById('log-content').textContent = data.content || '(无日志)';
  } catch (err) {
    document.getElementById('log-content').textContent = '加载失败: ' + err.message;
  }
}

async function restart() {
  if (!token) { alert('需要 token'); return; }
  if (!confirm('确定要重启 Bot 吗？依赖 PM2 自动拉起')) return;
  try {
    const res = await api('/api/restart', { method: 'POST' });
    alert(res.ok ? '已触发重启' : '失败: ' + (res.error || '未知'));
  } catch (err) {
    alert('失败: ' + err.message);
  }
}

async function loginCheck() {
  if (!token) { alert('需要 token'); return; }
  try {
    const data = await api('/api/login-check', { method: 'POST' });
    renderStatus(data);
  } catch (err) {
    alert('检查失败: ' + err.message);
  }
}

if (token) saveToken();
refresh();
setInterval(refresh, 15000);
</script>
</body>
</html>`;
}

function gatherStatus(bot: Bot): any {
  const config = bot.getConfig();
  const ai = config.ai;
  const mem = process.memoryUsage();
  const startedAt = bot.getRuntimeStats().startedAt;
  return {
    process: {
      heapMB: Math.round(mem.heapUsed / 1024 / 1024),
      rssMB: Math.round(mem.rss / 1024 / 1024),
      startedAt,
      pid: process.pid,
    },
    runtime: bot.getRuntimeStats(),
    ai: getAiChatStats(),
    imageCache: getImageCacheStats(),
    searchCache: getSearchStats(),
    voice: getVoiceStats(ai),
    stt: getSttStats(ai),
    knowledge: getKnowledgeStats(),
    embedding: getEmbeddingStats(),
    hltv: getHltvStats(),
  };
}

export function startWebServer(bot: Bot, port: number): void {
  if (server) {
    log.info('已经启动，跳过');
    return;
  }
  const host = getWebHost();
  const token = getAdminToken();
  if (!token) {
    log.warn('WANJIER_ADMIN_TOKEN 未设置，除 /api/health 外的后台 API 将被拒绝');
  } else if (token.length < 16) {
    log.warn('WANJIER_ADMIN_TOKEN 长度不足16位，除 /api/health 外的后台 API 将被拒绝');
  }
  if (isReadOnlyPublic()) {
    log.warn('只读 API 已通过 WANJIER_WEB_ADMIN_READONLY_PUBLIC=1 显式开放');
  }
  if (host === '0.0.0.0' || host === '::') {
    log.warn('当前监听公网地址；建议只在反向代理/防火墙保护下使用');
  }

  server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const pathname = url.pathname;

      if (req.method === 'GET' && pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(buildDashboardHtml());
        return;
      }

      if (req.method === 'GET' && pathname === '/api/health') {
        sendJson(res, 200, { ok: true, timestamp: Date.now() });
        return;
      }

      if (req.method === 'GET' && pathname === '/api/status') {
        if (!checkReadAuth(req)) {
          sendJson(res, 401, { error: 'Unauthorized' });
          return;
        }
        sendJson(res, 200, gatherStatus(bot));
        return;
      }

      if (req.method === 'POST' && pathname === '/api/login-check') {
        if (!checkAuth(req)) {
          sendJson(res, 401, { error: 'Unauthorized' });
          return;
        }
        await bot.checkLoginNow();
        sendJson(res, 200, gatherStatus(bot));
        return;
      }

      if (req.method === 'GET' && pathname === '/api/config') {
        if (!checkReadAuth(req)) {
          sendJson(res, 401, { error: 'Unauthorized' });
          return;
        }
        try {
          const config = loadConfig();
          sendJson(res, 200, maskConfig(config));
        } catch (err) {
          sendJson(res, 500, { error: err instanceof Error ? err.message : 'load failed' });
        }
        return;
      }

      if (req.method === 'POST' && pathname === '/api/config') {
        if (!checkAuth(req)) {
          sendJson(res, 401, { error: 'Unauthorized' });
          return;
        }
        try {
          const body = await readBody(req);
          const newConfig = JSON.parse(body);
          // 简单验证
          if (!newConfig || typeof newConfig !== 'object' || !newConfig.ai) {
            sendJson(res, 400, { error: '配置格式无效' });
            return;
          }
          // 备份当前 config
          const backup = `${CONFIG_PATH}.bak.${Date.now()}`;
          if (fs.existsSync(CONFIG_PATH)) {
            fs.copyFileSync(CONFIG_PATH, backup);
          }
          // 如果 api_key 是脱敏值，使用现有的
          try {
            const existing = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
            if (newConfig.ai && typeof newConfig.ai.api_key === 'string' && newConfig.ai.api_key.includes('...')) {
              newConfig.ai.api_key = existing.ai?.api_key || newConfig.ai.api_key;
            }
          } catch { /* */ }
          normalizeConfig(newConfig);
          writeJsonFileAtomic(CONFIG_PATH, newConfig);
          sendJson(res, 200, { ok: true, backup });
        } catch (err) {
          sendJson(res, 400, { error: err instanceof Error ? err.message : 'invalid' });
        }
        return;
      }

      if (req.method === 'GET' && pathname === '/api/logs') {
        if (!checkReadAuth(req)) {
          sendJson(res, 401, { error: 'Unauthorized' });
          return;
        }
        const filename = url.searchParams.get('file') || 'out.log';
        // 防止路径穿越
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
          sendJson(res, 400, { error: 'invalid filename' });
          return;
        }
        const content = tailLog(filename, 300);
        sendJson(res, 200, { content, file: filename });
        return;
      }

      if (req.method === 'POST' && pathname === '/api/restart') {
        if (!checkAuth(req)) {
          sendJson(res, 401, { error: 'Unauthorized' });
          return;
        }
        sendJson(res, 200, { ok: true, message: '即将退出，依赖 PM2 自动拉起' });
        // 延迟 500ms 再退出，让响应先发出去
        setTimeout(() => process.exit(0), 500).unref();
        return;
      }

      sendJson(res, 404, { error: 'Not Found' });
    } catch (err) {
      log.error('请求处理异常:', err);
      try {
        sendJson(res, 500, { error: err instanceof Error ? err.message : 'internal' });
      } catch { /* */ }
    }
  });

  server.listen(port, host, () => {
    log.info(`管理后台启动: http://${host}:${port}/`);
    if (!token) {
      log.info('提示: 设置环境变量 WANJIER_ADMIN_TOKEN 以启用后台 API');
    } else {
      log.info(`Admin token 已设置 (${token.slice(0, 4)}...) 长度=${token.length}`);
    }
  });
  server.on('error', (err) => {
    log.error('服务器错误:', err.message);
  });
}

export function stopWebServer(): void {
  if (server) {
    try { server.close(); } catch { /* */ }
    server = null;
  }
}
