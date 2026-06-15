#!/bin/bash
# 本地维护脚本：适合 crontab 或手动运行
# 用法:
#   bash scripts/maintain.sh
#   bash scripts/maintain.sh --verify
#   bash scripts/maintain.sh --no-cache-clean

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

RUN_CACHE_CLEAN="${WANJIER_MAINTAIN_CACHE_CLEAN:-1}"
RUN_DOCTOR="${WANJIER_MAINTAIN_DOCTOR:-1}"
RUN_VERIFY="${WANJIER_MAINTAIN_VERIFY:-0}"
RUN_REPORT="${WANJIER_MAINTAIN_REPORT:-1}"
WRITE_JSON_REPORT="${WANJIER_MAINTAIN_JSON_REPORT:-0}"

for arg in "$@"; do
  case "$arg" in
    --verify)
      RUN_VERIFY="1"
      ;;
    --no-cache-clean)
      RUN_CACHE_CLEAN="0"
      ;;
    --no-doctor)
      RUN_DOCTOR="0"
      ;;
    --report)
      RUN_REPORT="1"
      ;;
    --no-report)
      RUN_REPORT="0"
      ;;
    --json-report)
      WRITE_JSON_REPORT="1"
      RUN_REPORT="1"
      ;;
    -h|--help)
      echo "用法: bash scripts/maintain.sh [--verify] [--no-cache-clean] [--no-doctor] [--report|--no-report] [--json-report]"
      echo "  默认: 清理缓存 + doctor + 资源报告"
      echo "  --verify: 追加 npm run build && npm run smoke"
      echo "  --json-report: 写 logs/maintainability-latest.json"
      exit 0
      ;;
  esac
done

echo "========================================="
echo "  玩机器 Bot 本地维护"
echo "========================================="
date '+时间: %F %T %Z'
echo "目录: $ROOT_DIR"

mkdir -p logs voice_cache image_cache context_store stt_cache search_cache knowledge/inbox data

if [ "$RUN_CACHE_CLEAN" = "1" ]; then
  echo "[1/4] 清理过期缓存..."
  if [ -f dist/index.js ]; then
    npm run cache:clean
  else
    echo "  dist 不存在，先跳过 cache:clean；运行 npm run build 后再试。"
  fi
else
  echo "[1/4] 跳过缓存清理"
fi

if [ "$RUN_DOCTOR" = "1" ]; then
  echo "[2/4] 本地体检..."
  npm run doctor
else
  echo "[2/4] 跳过 doctor"
fi

if [ "$RUN_VERIFY" = "1" ]; then
  echo "[3/4] 构建和 smoke..."
  npm run build
  npm run smoke
else
  echo "[3/4] 跳过 verify；需要时加 --verify"
fi

if [ "$RUN_REPORT" = "1" ]; then
  echo "[4/5] 维护性巡检..."
  npm run maintainability
  if [ "$WRITE_JSON_REPORT" = "1" ]; then
    mkdir -p logs
    node scripts/maintainability-report.js --json > logs/maintainability-latest.json
    echo "  已写入 logs/maintainability-latest.json"
  fi
else
  echo "[4/5] 跳过维护性巡检"
fi

echo "[5/5] 资源概览..."
if command -v free >/dev/null 2>&1; then
  free -h
fi
if command -v df >/dev/null 2>&1; then
  df -h .
fi
if command -v pm2 >/dev/null 2>&1; then
  pm2 status || true
fi

echo "========================================="
echo "  维护完成"
echo "========================================="
