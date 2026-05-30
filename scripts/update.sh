#!/bin/bash
# 玩机器 Bot 一键更新脚本
# 用法: bash scripts/update.sh
# 或全自动: cd /opt/wanjier-bot && bash scripts/update.sh

set -e
cd "$(dirname "$0")/.."

echo "========================================="
echo "  玩机器 Bot 一键更新"
echo "========================================="

# 1. 强制重置本地变动 (config.json/.env/voice_sample.mp3 在gitignore里所以保留)
echo ""
echo "[1/7] 重置本地修改..."
git reset --hard HEAD 2>&1 | tail -3 || true
git clean -fd 2>&1 | tail -3 || true

# 2. 拉取最新代码
echo ""
echo "[2/7] 拉取最新代码..."
git fetch origin
git reset --hard origin/main

# 3. 检查config.json存在
echo ""
echo "[3/7] 检查config.json..."
if [ ! -f config.json ]; then
  echo "  ⚠️  config.json不存在，从example复制"
  cp config.example.json config.json
  echo ""
  echo "  ✏️  现在编辑config.json或.env填入api_key和admin_qq:"
  echo "     nano config.json   # 改api_key/admin_qq"
  echo "     或者用环境变量更方便:"
  echo "     cp .env.example .env && nano .env"
  echo ""
  exit 1
fi

# 4. 检查 .env (推荐用户用)
if [ ! -f .env ] && [ -f .env.example ]; then
  echo "  ℹ️  没有.env文件，可以用环境变量管理敏感配置:"
  echo "     cp .env.example .env && nano .env"
fi

# 5. 安装依赖（仅在需要时）
echo ""
echo "[4/7] 检查依赖..."
if [ ! -d node_modules ] || [ package.json -nt node_modules ]; then
  npm install --no-audit --no-fund --silent
  echo "  依赖已更新"
else
  echo "  依赖未变化"
fi

# 6. 编译
echo ""
echo "[5/7] 编译TypeScript..."
npm run build

# 7. 创建必要的目录
echo ""
echo "[6/7] 准备运行环境..."
mkdir -p logs voice_cache image_cache context_store stt_cache search_cache

# 8. 重启
echo ""
echo "[7/7] 重启Bot..."
if pm2 list 2>/dev/null | grep -q wanjier; then
  pm2 restart wanjier --update-env
  echo "  Bot已重启 (--update-env 重新加载.env)"
else
  if [ -f ecosystem.config.js ]; then
    pm2 start ecosystem.config.js
  else
    pm2 start dist/index.js --name wanjier --node-args="--max-old-space-size=768 --expose-gc" --max-memory-restart 1100M
  fi
  echo "  Bot已启动"
fi
pm2 save 2>/dev/null || true

echo ""
echo "========================================="
echo "  ✅ 更新完成"
echo "========================================="
echo ""
echo "查看日志:    pm2 logs wanjier --lines 30"
echo "查看状态:    pm2 status && free -h"
echo "重新加载env: pm2 restart wanjier --update-env"
