#!/bin/bash
# VPS 安全更新脚本
# 用法:
#   bash scripts/update.sh
#   npm run update

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

TS="$(date +%F-%H%M%S)"
BACKUP_DIR="$ROOT_DIR/backups/update-$TS"
mkdir -p "$BACKUP_DIR" logs

echo "========================================="
echo "  玩机器 Bot VPS 更新"
echo "========================================="

backup_file() {
  local file="$1"
  if [ -f "$file" ]; then
    cp "$file" "$BACKUP_DIR/$(basename "$file").bak"
  fi
}

echo "[1/8] 备份配置..."
backup_file "config.json"
backup_file ".env"
backup_file "voice_sample.mp3"
cp -f scripts/update.sh "$BACKUP_DIR/update.sh.bak" 2>/dev/null || true

echo "[2/8] 拉取代码前检查工作区..."
if ! git diff --quiet -- . ':(exclude)config.json' ':(exclude).env' ':(exclude)voice_sample.mp3'; then
  echo "  检测到本地改动，已保留，不会 reset/clean。"
fi

echo "[3/8] 拉取远端更新..."
git fetch origin
git pull --ff-only origin main

echo "[4/8] 校验运行配置..."
if [ ! -f config.json ]; then
  if [ -f config.example.json ]; then
    cp config.example.json config.json
    echo "  已从 config.example.json 生成 config.json"
  else
    echo "  缺少 config.json 且没有 config.example.json"
    exit 1
  fi
fi

if [ ! -f .env ] && [ -f .env.example ]; then
  echo "  提示: 你可以用 .env 管理敏感配置"
fi

echo "[5/8] 安装依赖..."
npm ci

echo "[6/8] 构建与自检..."
npm run build
npm run doctor
npm run smoke

echo "[7/8] 准备运行目录..."
mkdir -p logs voice_cache image_cache context_store stt_cache search_cache knowledge/db

echo "[8/8] 重启服务..."
if pm2 list 2>/dev/null | grep -q "wanjier"; then
  pm2 restart wanjier --update-env
else
  if [ -f ecosystem.config.js ]; then
    pm2 start ecosystem.config.js
  else
    pm2 start dist/index.js --name wanjier --node-args="--max-old-space-size=900 --expose-gc" --max-memory-restart 1200M
  fi
fi
pm2 save 2>/dev/null || true

echo "========================================="
echo "  ✅ 更新完成"
echo "========================================="
echo "备份目录: $BACKUP_DIR"
echo "查看日志:  pm2 logs wanjier --lines 80 --nostream"
echo "看状态:    pm2 status"
echo "看资源:    free -h && df -h"
