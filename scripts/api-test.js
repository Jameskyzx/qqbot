#!/usr/bin/env node
/* eslint-disable no-console */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function argValue(name) {
  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];
  const inline = process.argv.find((item) => item.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : '';
}

function hasUsableApiKeyLocal(apiKey) {
  const key = String(apiKey || '').trim();
  if (key.length < 8) return false;
  const lower = key.toLowerCase();
  if (/^(?:tp|sk|ak|pk)-?x{8,}$/i.test(key)) return false;
  if (/^x{8,}$/i.test(lower.replace(/[-_\s]/g, ''))) return false;
  return ![
    '在这里填入',
    '你的api',
    '你的 api',
    'api密钥',
    'api 密钥',
    'your_api',
    'your-api',
    'your api',
    'replace_me',
    'changeme',
    'example',
    'placeholder',
  ].some((item) => lower.includes(item));
}

function loadDotEnv() {
  const envPath = path.join(root, '.env');
  if (!fs.existsSync(envPath)) return false;
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    const existing = process.env[key];
    const shouldOverridePlaceholderKey = key === 'WANJIER_API_KEY'
      && value.trim()
      && !hasUsableApiKeyLocal(existing)
      && hasUsableApiKeyLocal(value);
    if (key && (existing === undefined || existing.trim() === '' || shouldOverridePlaceholderKey)) {
      process.env[key] = value;
    }
  }
  return true;
}

function readJson(filepath) {
  return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
}

function maskKey(key) {
  const text = String(key || '').trim();
  if (!text) return '[空]';
  if (text.length <= 12) return `${text.slice(0, 3)}...(${text.length})`;
  return `${text.slice(0, 6)}...${text.slice(-4)}(${text.length})`;
}

function compactUrl(input) {
  try {
    const url = new URL(input);
    return `${url.protocol}//${url.host}${url.pathname}`;
  } catch {
    return input || '[空]';
  }
}

async function main() {
  const noEnv = process.argv.includes('--no-env') || process.env.WANJIER_API_TEST_NO_ENV === '1';
  const envLoaded = noEnv ? false : loadDotEnv();
  const timeoutArg = Number(argValue('--timeout') || process.env.WANJIER_API_TEST_TIMEOUT_MS || 15000);
  const timeoutMs = Number.isFinite(timeoutArg) ? Math.max(3000, Math.min(Math.floor(timeoutArg), 60000)) : 15000;

  const { loadConfig, normalizeConfig, hasUsableApiKey } = require('../dist/config');
  const { callLLMWithRetry } = require('../dist/plugins/llm-api');

  let config;
  let configSource = 'config.json';
  try {
    config = loadConfig(path.join(root, 'config.json'));
  } catch (err) {
    const examplePath = path.join(root, 'config.example.json');
    if (!fs.existsSync(examplePath)) throw err;
    config = normalizeConfig(readJson(examplePath));
    configSource = 'config.example.json';
  }

  const ai = {
    ...config.ai,
    api_timeout_ms: timeoutMs,
    max_tokens: 32,
    temperature: 0.1,
  };

  const missing = [];
  if (!ai.api_url) missing.push('api_url / WANJIER_API_URL');
  if (!ai.model) missing.push('model / WANJIER_MODEL');
  if (!hasUsableApiKey(ai.api_key)) missing.push('真实 API Key / WANJIER_API_KEY');

  console.log('[api:test] 配置来源:', configSource);
  console.log('[api:test] .env:', noEnv ? '已跳过' : envLoaded ? '已加载' : '未找到');
  console.log('[api:test] api_url:', compactUrl(ai.api_url));
  console.log('[api:test] model:', ai.model || '[空]');
  console.log('[api:test] api_key:', maskKey(ai.api_key));
  console.log('[api:test] timeout:', `${timeoutMs}ms`);

  if (missing.length > 0) {
    console.error('[api:test] FAIL 配置不完整:', missing.join(', '));
    console.error('[api:test] 先改 /opt/wanjier-bot/.env，再重启 PM2。');
    process.exit(3);
  }

  const started = Date.now();
  try {
    const reply = await callLLMWithRetry(ai, [
      { role: 'system', content: '你是接口健康检查。只能回复 OK。' },
      { role: 'user', content: 'ping' },
    ], false, 1);
    console.log(`[api:test] OK ${Date.now() - started}ms reply=${String(reply).slice(0, 80)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[api:test] FAIL ${Date.now() - started}ms ${message}`);
    if (/HTTP 401|unauthorized|invalid api key|forbidden|权限|鉴权/i.test(message)) {
      console.error('[api:test] 判断: Key 不对、Key 未生效，或平台权限不足。');
    } else if (/HTTP 404|model|模型|not found/i.test(message)) {
      console.error('[api:test] 判断: API 地址或模型名不对。');
    } else if (/超时|timeout|ETIMEDOUT|ECONNRESET|ENOTFOUND|EAI_AGAIN|网络/i.test(message)) {
      console.error('[api:test] 判断: VPS 到 API 的网络不通、接口慢，或域名/代理有问题。');
    }
    process.exit(2);
  }
}

main().catch((err) => {
  console.error('[api:test] FAIL', err instanceof Error ? err.message : String(err));
  process.exit(2);
});
