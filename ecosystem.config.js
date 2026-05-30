// PM2 配置文件 - 自动加载 .env 文件
const fs = require('fs');
const path = require('path');

function loadDotEnv() {
  const envPath = path.resolve(__dirname, '.env');
  const env = {};
  if (!fs.existsSync(envPath)) return env;
  try {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      // 去除引号
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key) env[key] = value;
    }
  } catch (err) {
    console.warn('[ecosystem] 读取.env失败:', err.message);
  }
  return env;
}

module.exports = {
  apps: [{
    name: 'wanjier',
    script: 'dist/index.js',
    // 单进程运行：1核机器不要开 cluster
    node_args: '--max-old-space-size=768 --expose-gc',
    // RSS 超过约 1.1GB 自动重启
    max_memory_restart: '1100M',
    autorestart: true,
    min_uptime: 5000,
    restart_delay: 3000,
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      ...loadDotEnv(),
    },
  }],
};
