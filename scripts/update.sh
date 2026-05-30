#!/bin/bash
# 玩机器 Bot 更新脚本 - 一键拉取最新代码并重启
# 用法: bash scripts/update.sh

set -e
cd "$(dirname "$0")/.."

echo "========================================="
echo "  玩机器 Bot 一键更新"
echo "========================================="

# 1. 强制重置本地变动（保留config.json因为在.gitignore里）
echo ""
echo "[1/6] 重置本地修改..."
git reset --hard HEAD 2>&1 | tail -3
git clean -fd 2>&1 | tail -3

# 2. 拉取最新代码
echo ""
echo "[2/6] 拉取最新代码..."
git fetch origin
git pull origin main --no-rebase

# 3. 检查config.json是否存在
echo ""
echo "[3/6] 检查config.json..."
if [ ! -f config.json ]; then
  echo "  ⚠️  config.json不存在，从example复制"
  cp config.example.json config.json
  echo "  ⚠️  请编辑 nano config.json 填入api_key和admin_qq后再启动"
  exit 1
fi

# 4. 安装依赖
echo ""
echo "[4/6] 检查依赖..."
if [ ! -d node_modules ] || [ package.json -nt node_modules ]; then
  npm install --no-audit --no-fund --silent
  echo "  依赖已更新"
else
  echo "  依赖未变化"
fi

# 5. 编译
echo ""
echo "[5/6] 编译TypeScript..."
npm run build

# 6. 重启
echo ""
echo "[6/6] 重启Bot..."
if pm2 list | grep -q wanjier; then
  pm2 restart wanjier
else
  if [ -f ecosystem.config.js ]; then
    pm2 start ecosystem.config.js
  else
    pm2 start dist/index.js --name wanjier --node-args="--max-old-space-size=400 --expose-gc" --max-memory-restart 500M
  fi
fi
pm2 save

echo ""
echo "========================================="
echo "  ✅ 更新完成"
echo "========================================="
echo ""
echo "查看日志:"
echo "  pm2 logs wanjier --lines 30"
echo ""
echo "查看状态:"
echo "  pm2 status"
echo "  free -h"
