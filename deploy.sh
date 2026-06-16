#!/bin/bash
# QQ Bot 一键部署脚本
# 用途：在VPS上拉取代码、构建、重启服务
# 使用：./deploy.sh

set -e  # 遇到错误立即退出

echo "========================================"
echo "   QQ Bot 一键部署脚本"
echo "========================================"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否在项目目录
if [ ! -f "package.json" ]; then
  echo -e "${RED}错误: 请在项目根目录执行此脚本${NC}"
  exit 1
fi

# 1. 备份当前版本
echo -e "${YELLOW}[1/12] 备份当前版本...${NC}"
BACKUP_DIR="../qqbot-backup-$(date +%Y%m%d-%H%M%S)"
cp -r . "$BACKUP_DIR"
echo -e "${GREEN}✓ 备份完成: $BACKUP_DIR${NC}"
echo ""

# 2. 检查Git状态
echo -e "${YELLOW}[2/12] 检查Git状态...${NC}"
if [ -d ".git" ]; then
  git status --short
  echo -e "${GREEN}✓ Git仓库正常${NC}"
else
  echo -e "${RED}警告: 不是Git仓库${NC}"
fi
echo ""

# 3. 拉取最新代码
echo -e "${YELLOW}[3/12] 拉取最新代码...${NC}"
if [ -d ".git" ]; then
  git fetch origin
  BEFORE=$(git rev-parse HEAD)
  git pull origin main
  AFTER=$(git rev-parse HEAD)

  if [ "$BEFORE" = "$AFTER" ]; then
    echo -e "${GREEN}✓ 已是最新版本${NC}"
  else
    echo -e "${GREEN}✓ 更新成功: $BEFORE -> $AFTER${NC}"
    git log --oneline $BEFORE..$AFTER
  fi
else
  echo -e "${YELLOW}跳过: 不是Git仓库${NC}"
fi
echo ""

# 4. 检查Node.js版本
echo -e "${YELLOW}[4/12] 检查Node.js版本...${NC}"
NODE_VERSION=$(node -v)
NODE_MAJOR=$(node -v | cut -d'.' -f1 | sed 's/v//')
echo "Node.js 版本: $NODE_VERSION"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo -e "${RED}警告: Node.js版本过低，建议升级到18+${NC}"
else
  echo -e "${GREEN}✓ Node.js版本符合要求${NC}"
fi
echo ""

# 5. 安装依赖
echo -e "${YELLOW}[5/12] 安装依赖...${NC}"
if [ -f "package-lock.json" ]; then
  npm ci --production
else
  npm install --production
fi
echo -e "${GREEN}✓ 依赖安装完成${NC}"
echo ""

# 6. 构建项目
echo -e "${YELLOW}[6/12] 构建项目...${NC}"
npm run build
if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ 构建成功${NC}"
  ls -lh dist/ | head -10
else
  echo -e "${RED}✗ 构建失败${NC}"
  exit 1
fi
echo ""

# 7. 生成图片manifest
echo -e "${YELLOW}[7/12] 生成图片manifest...${NC}"
MANIFEST_COUNT=0

if [ -d "authorized-images/daily-beauty" ]; then
  echo "  - 每日美图manifest..."
  if node scripts/build-daily-image-manifest.js --write 2>/dev/null; then
    echo -e "    ${GREEN}✓ 每日美图manifest生成成功${NC}"
    MANIFEST_COUNT=$((MANIFEST_COUNT + 1))
  else
    echo -e "    ${YELLOW}⚠ 每日美图manifest生成失败（可能无图片）${NC}"
  fi
fi

if [ -f "scripts/build-player-image-manifest.js" ]; then
  echo "  - 选手图片manifest..."
  if node scripts/build-player-image-manifest.js --write 2>/dev/null; then
    echo -e "    ${GREEN}✓ 选手图片manifest生成成功${NC}"
    MANIFEST_COUNT=$((MANIFEST_COUNT + 1))
  else
    echo -e "    ${YELLOW}⚠ 选手图片manifest生成失败${NC}"
  fi
fi

if [ -f "scripts/build-bestdori-card-manifest.js" ]; then
  echo "  - 木柜子卡面manifest..."
  if node scripts/build-bestdori-card-manifest.js --write 2>/dev/null; then
    echo -e "    ${GREEN}✓ 木柜子manifest生成成功${NC}"
    MANIFEST_COUNT=$((MANIFEST_COUNT + 1))
  else
    echo -e "    ${YELLOW}⚠ 木柜子manifest生成失败${NC}"
  fi
fi

if [ -f "scripts/build-genshin-image-manifest.js" ]; then
  echo "  - 原神角色manifest..."
  if node scripts/build-genshin-image-manifest.js --write 2>/dev/null; then
    echo -e "    ${GREEN}✓ 原神manifest生成成功${NC}"
    MANIFEST_COUNT=$((MANIFEST_COUNT + 1))
  else
    echo -e "    ${YELLOW}⚠ 原神manifest生成失败${NC}"
  fi
fi

echo -e "${GREEN}✓ Manifest生成完成 (${MANIFEST_COUNT}个)${NC}"
echo ""

# 8. 检查配置文件
echo -e "${YELLOW}[8/12] 检查配置文件...${NC}"
if [ -f "config.json" ]; then
  echo -e "${GREEN}✓ config.json 存在${NC}"
  # 检查必要字段
  if node -e "const c=require('./config.json'); if(!c.qq_api_key) process.exit(1);" 2>/dev/null; then
    echo -e "${GREEN}✓ 必要配置字段完整${NC}"
  else
    echo -e "${RED}警告: config.json缺少必要字段${NC}"
  fi
else
  echo -e "${RED}警告: config.json 不存在，请从 config.example.json 复制并配置${NC}"
fi
echo ""

# 9. VPS环境检查
echo -e "${YELLOW}[9/12] VPS环境检查...${NC}"
if [ -f "scripts/vps-check.js" ]; then
  node scripts/vps-check.js || echo -e "${YELLOW}⚠ VPS检查发现问题${NC}"
else
  echo -e "${YELLOW}跳过: vps-check.js不存在${NC}"
fi
echo ""

# 10. 冒烟测试
echo -e "${YELLOW}[10/12] 冒烟测试...${NC}"
if npm run smoke 2>&1 | tee /tmp/smoke-test.log; then
  echo -e "${GREEN}✓ 冒烟测试通过${NC}"
else
  echo -e "${RED}警告: 冒烟测试发现问题${NC}"
  echo "查看详细日志: cat /tmp/smoke-test.log"
fi
echo ""

# 11. 重启服务
echo -e "${YELLOW}[11/12] 重启服务...${NC}"
SERVICE_RESTARTED=false

# 尝试PM2
if command -v pm2 &> /dev/null; then
  if pm2 list | grep -q "qqbot"; then
    pm2 restart qqbot
    echo -e "${GREEN}✓ 服务已通过 pm2 重启${NC}"
    SERVICE_RESTARTED=true
  else
    echo -e "${YELLOW}⚠ PM2中未找到qqbot进程${NC}"
    echo "  使用以下命令启动:"
    echo "  pm2 start npm --name qqbot -- start"
  fi
fi

# 尝试systemctl
if ! $SERVICE_RESTARTED && command -v systemctl &> /dev/null; then
  if systemctl is-active --quiet qqbot; then
    sudo systemctl restart qqbot
    echo -e "${GREEN}✓ 服务已通过 systemctl 重启${NC}"
    SERVICE_RESTARTED=true
  else
    echo -e "${YELLOW}⚠ systemd中未找到qqbot服务${NC}"
  fi
fi

if ! $SERVICE_RESTARTED; then
  echo -e "${RED}⚠ 未找到服务管理工具，请手动重启服务${NC}"
  echo "  pm2 restart qqbot"
  echo "  或"
  echo "  sudo systemctl restart qqbot"
fi
echo ""

# 12. 查看服务状态和日志
echo -e "${YELLOW}[12/12] 查看服务状态...${NC}"
if command -v pm2 &> /dev/null && pm2 list | grep -q "qqbot"; then
  pm2 list | grep "qqbot"
  echo ""
  echo "最近30行日志:"
  pm2 logs qqbot --lines 30 --nostream || true
elif command -v systemctl &> /dev/null && systemctl is-active --quiet qqbot; then
  systemctl status qqbot --no-pager || true
  echo ""
  echo "最近30行日志:"
  sudo journalctl -u qqbot -n 30 --no-pager || true
else
  echo -e "${YELLOW}无法获取服务状态${NC}"
fi
echo ""

# 部署完成
echo "========================================"
echo -e "${GREEN}   部署完成！${NC}"
echo "========================================"
echo ""
echo "备份位置: $BACKUP_DIR"
echo ""
echo "如遇问题，使用以下命令回滚:"
echo "  cd $(dirname $(pwd))"
echo "  rm -rf qqbot"
echo "  cp -r $BACKUP_DIR qqbot"
echo "  cd qqbot"
echo "  pm2 restart qqbot"
echo ""
echo "查看日志:"
echo "  pm2 logs qqbot          # PM2日志"
echo "  tail -f logs/app.log    # 应用日志"
echo ""
echo "监控服务:"
echo "  pm2 status              # 服务状态"
echo "  pm2 monit               # 实时监控"
echo ""
