# VPS 部署完整指南

## 本地推送代码

### 1. 查看修改状态
```bash
git status
```

### 2. 添加所有修改
```bash
git add .
```

### 3. 提交代码
```bash
git commit -m "feat: 全面升级 - 新增历史今天/影视/音乐，强化真人对话，优化可维护性

- 数据池扩充: +70条内容 (30条历史+20条影视+20条音乐)
- AI对话真人化: 3层过滤 40+条规则去AI痕迹
- 知识库扩充: 新增60+条风格细节和反例
- 视觉升级: history卡片精美渲染
- 可维护性: 完整类型定义、测试接口、模块化架构

新功能:
- /history 历史上的今天 (30条重大历史事件)
- /movie 每日影视台词 (20条经典台词)
- /music 每日音乐知识 (20条音乐知识)

AI对话优化:
- system prompt: 15条硬规则增强，禁止AI腔
- live cue: 21条风格提示，新增3条AI痕迹过滤
- reply postprocess: 13条后处理，新增5条开头/结尾过滤
- wanjier.md: 新增60+条日常对话风格细节和反例

技术改进:
- 完整TypeScript类型定义
- 测试接口导出
- 模块化架构
- 一致性设计模式

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

### 4. 推送到远程
```bash
git push origin main
```

如果推送失败（远程有更新），先拉取合并：
```bash
git pull --rebase origin main
git push origin main
```

---

## VPS 部署操作

### 方式一：一键部署脚本（推荐）

#### 1. SSH 连接 VPS
```bash
ssh user@your-vps-ip
```

#### 2. 进入项目目录
```bash
cd /path/to/qqbot
```

#### 3. 执行部署脚本
```bash
#!/bin/bash
# deploy.sh - 保存为脚本后执行

set -e  # 遇到错误立即退出

echo "=== 开始部署 QQ Bot ==="

# 1. 备份当前版本
echo "[1/10] 备份当前版本..."
BACKUP_DIR="../qqbot-backup-$(date +%Y%m%d-%H%M%S)"
cp -r . "$BACKUP_DIR"
echo "备份完成: $BACKUP_DIR"

# 2. 拉取最新代码
echo "[2/10] 拉取最新代码..."
git fetch origin
git pull origin main

# 3. 检查 Node.js 版本
echo "[3/10] 检查 Node.js 版本..."
NODE_VERSION=$(node -v)
echo "Node.js 版本: $NODE_VERSION"

# 4. 安装依赖
echo "[4/10] 安装依赖..."
npm install --production

# 5. 构建项目
echo "[5/10] 构建项目..."
npm run build

# 6. 生成图片 manifest
echo "[6/10] 生成图片 manifest..."
if [ -d "authorized-images/daily-beauty" ]; then
  node scripts/build-daily-image-manifest.js --write || echo "警告: 图片manifest生成失败"
fi
if [ -d "authorized-images/player" ]; then
  node scripts/build-player-image-manifest.js --write || echo "警告: 选手图片manifest生成失败"
fi

# 7. VPS 环境检查
echo "[7/10] VPS 环境检查..."
node scripts/vps-check.js || echo "警告: VPS检查发现问题"

# 8. 冒烟测试
echo "[8/10] 冒烟测试..."
npm run smoke || echo "警告: 冒烟测试发现问题"

# 9. 重启服务
echo "[9/10] 重启服务..."
if command -v pm2 &> /dev/null; then
  pm2 restart qqbot
  echo "服务已通过 pm2 重启"
elif command -v systemctl &> /dev/null; then
  sudo systemctl restart qqbot
  echo "服务已通过 systemctl 重启"
else
  echo "警告: 未找到 pm2 或 systemctl，请手动重启服务"
fi

# 10. 查看日志
echo "[10/10] 查看最近日志..."
if command -v pm2 &> /dev/null; then
  pm2 logs qqbot --lines 30
elif [ -f "/var/log/qqbot.log" ]; then
  tail -30 /var/log/qqbot.log
fi

echo "=== 部署完成 ==="
echo "备份位置: $BACKUP_DIR"
echo "如遇问题，使用以下命令回滚:"
echo "  rm -rf $(pwd) && cp -r $BACKUP_DIR $(pwd) && pm2 restart qqbot"
```

#### 4. 赋予执行权限并运行
```bash
chmod +x deploy.sh
./deploy.sh
```

---

### 方式二：手动分步执行

#### 1. SSH 连接 VPS
```bash
ssh user@your-vps-ip
```

#### 2. 进入项目目录
```bash
cd /path/to/qqbot
```

#### 3. 备份当前版本（可选但推荐）
```bash
cp -r . ../qqbot-backup-$(date +%Y%m%d-%H%M%S)
```

#### 4. 拉取最新代码
```bash
git fetch origin
git pull origin main
```

如果有冲突：
```bash
# 查看冲突文件
git status

# 方案A: 保留远程版本
git reset --hard origin/main

# 方案B: 保留本地修改
git stash
git pull origin main
git stash pop
# 然后手动解决冲突
```

#### 5. 安装依赖
```bash
# 生产环境
npm install --production

# 或开发环境（如果需要构建工具）
npm install
```

#### 6. 构建项目
```bash
npm run build
```

检查构建输出：
```bash
ls -lh dist/
```

#### 7. 生成图片 manifest（如果有图片池）
```bash
# 每日图片
node scripts/build-daily-image-manifest.js --write

# 选手图片
node scripts/build-player-image-manifest.js --write

# 木柜子卡面
node scripts/build-bestdori-card-manifest.js --write

# 原神角色
node scripts/build-genshin-image-manifest.js --write
```

#### 8. 配置检查
```bash
# 检查配置文件
cat config.json

# VPS 环境检查
node scripts/vps-check.js

# 数据完整性检查
node scripts/check-cs-data.js
```

#### 9. 冒烟测试
```bash
npm run smoke
```

如果冒烟测试失败，查看日志：
```bash
# 查看最近的错误
grep -i error logs/*.log | tail -20

# 或查看完整日志
tail -100 logs/error.log
```

#### 10. 重启服务

**使用 PM2：**
```bash
# 重启
pm2 restart qqbot

# 查看状态
pm2 status

# 查看日志
pm2 logs qqbot --lines 50

# 查看错误日志
pm2 logs qqbot --err --lines 50

# 实时监控
pm2 monit
```

**使用 systemd：**
```bash
# 重启
sudo systemctl restart qqbot

# 查看状态
sudo systemctl status qqbot

# 查看日志
sudo journalctl -u qqbot -n 50 -f
```

**手动启动（不推荐生产环境）：**
```bash
# 后台运行
nohup npm start > logs/output.log 2>&1 &

# 查看进程
ps aux | grep node
```

---

## 功能验证清单

### 1. 基础功能验证
```bash
# 在 QQ 群或私聊中测试

/help                # 应显示新命令：/movie /music /history
/status              # 统计应包含：历史:30条
```

### 2. 新功能验证

#### 每日影视台词
```
/movie
影视台词
今日影视台词
每日影视台词
来句台词
电影台词
```

#### 每日音乐知识
```
/music
音乐知识
今日音乐知识
每日音乐知识
乐理知识
音乐冷知识
来个音乐知识
```

#### 历史上的今天
```
/history
历史上的今天
历史今天
今天历史
每日历史
来个历史
```

### 3. AI对话真人化验证

发送以下测试消息，检查回复是否**不包含**AI痕迹：

**测试1：普通提问**
```
发送: "最近有什么好看的比赛吗？"
期望: 直接给判断，不说"让我来帮你"、"根据我的理解"
```

**测试2：技术问题**
```
发送: "eco局应该怎么打？"
期望: 短促回答，不说"首先...其次...最后"
```

**测试3：选手评价**
```
发送: "ZywOo最近状态怎么样？"
期望: 直接给判断+理由，不说"该选手表现优异"
```

**测试4：询问身份**
```
发送: "你是AI吗？"
期望: 嘴硬接住，不承认，例如"你说呢"、"看你想怎么理解"
```

**不应出现的AI腔短语：**
- ❌ "作为一个AI助手..."
- ❌ "根据我的理解..."
- ❌ "让我来帮你分析..."
- ❌ "希望这个回答对你有帮助"
- ❌ "如果还有问题请继续提问"
- ❌ "首先...其次...最后..."
- ❌ "综合来看..."
- ❌ "值得注意的是..."

### 4. 图片渲染验证
```
/history             # 应生成精美历史卡片
/movie               # 应生成影视台词卡片
/music               # 应生成音乐知识卡片
```

检查点：
- ✅ 卡片背景渐变正常
- ✅ 文字清晰可读
- ✅ 装饰元素显示正常
- ✅ 分数显示正常

---

## 监控与日志

### PM2 监控
```bash
# 实时状态
pm2 status

# 实时日志
pm2 logs qqbot

# 错误日志
pm2 logs qqbot --err

# 资源监控
pm2 monit

# 重启历史
pm2 list
```

### 日志文件
```bash
# 应用日志
tail -100 logs/app.log

# 错误日志
tail -100 logs/error.log

# AI对话日志
tail -100 logs/ai-chat.log

# 实时追踪
tail -f logs/app.log
```

### 性能监控
```bash
# CPU/内存占用
top -p $(pgrep -f "node.*qqbot")

# 磁盘使用
df -h

# 图片缓存大小
du -sh data/image-cache/

# 总存储占用
du -sh .
```

---

## 常见问题排查

### 问题1：构建失败
```bash
# 清理缓存重新构建
rm -rf dist node_modules
npm install
npm run build
```

### 问题2：依赖安装失败
```bash
# 使用国内镜像
npm config set registry https://registry.npmmirror.com
npm install

# 恢复官方镜像
npm config set registry https://registry.npmjs.org
```

### 问题3：服务启动失败
```bash
# 查看端口占用
netstat -tlnp | grep :3000

# 杀死占用进程
kill -9 $(lsof -t -i:3000)

# 检查配置文件
node -e "console.log(require('./config.json'))"
```

### 问题4：图片manifest生成失败
```bash
# 检查图片目录
ls -la authorized-images/daily-beauty/

# 检查权限
chmod -R 755 authorized-images/

# 手动生成
node scripts/build-daily-image-manifest.js --root authorized-images/daily-beauty --write
```

### 问题5：新功能不生效
```bash
# 检查代码是否拉取成功
git log --oneline -5

# 检查构建输出
ls -lh dist/plugins/fun.js

# 强制重启
pm2 delete qqbot
pm2 start npm --name qqbot -- start

# 清理缓存
rm -rf data/image-cache/*
rm -rf data/reply-cache/*
```

---

## 回滚操作

### 快速回滚（使用备份）
```bash
# 1. 停止服务
pm2 stop qqbot

# 2. 恢复备份
cd /path/to
rm -rf qqbot
cp -r qqbot-backup-YYYYMMDD-HHMMSS qqbot
cd qqbot

# 3. 重启服务
pm2 restart qqbot
```

### Git 回滚
```bash
# 1. 查看提交历史
git log --oneline -10

# 2. 回滚到上一个版本
git reset --hard HEAD~1

# 3. 重新构建
npm run build

# 4. 重启服务
pm2 restart qqbot
```

### 回滚到指定版本
```bash
# 1. 找到目标commit
git log --oneline -20

# 2. 回滚
git reset --hard <commit-hash>

# 3. 重新构建
npm run build

# 4. 重启服务
pm2 restart qqbot
```

---

## 性能优化建议

### 1. 配置优化
```json
// config.json
{
  "image_cache_ttl_hours": 168,
  "image_cache_max_size_mb": 2048,
  "ai_global_concurrency": 3,
  "vision_global_concurrency": 2,
  "tts_global_concurrency": 2,
  "search_cache_ttl_minutes": 60,
  "gate_passive_queue_max": 100
}
```

### 2. PM2 优化
```bash
# 查看当前配置
pm2 show qqbot

# 设置最大内存限制（超出自动重启）
pm2 restart qqbot --max-memory-restart 1G

# 设置日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 3. 定期维护
```bash
# 添加到 crontab
crontab -e

# 每天凌晨3点清理过期缓存
0 3 * * * cd /path/to/qqbot && node scripts/cache-clean.js

# 每周日凌晨4点重启服务
0 4 * * 0 pm2 restart qqbot

# 每月1号更新图片manifest
0 5 1 * * cd /path/to/qqbot && node scripts/build-daily-image-manifest.js --write
```

---

## 安全建议

### 1. 配置文件保护
```bash
# 确保敏感配置不被提交
echo "config.json" >> .gitignore
chmod 600 config.json
```

### 2. API密钥管理
```bash
# 使用环境变量
export OPENAI_API_KEY="sk-..."
export QQ_API_SECRET="..."

# 或使用 .env 文件（不提交到git）
echo "OPENAI_API_KEY=sk-..." >> .env
echo ".env" >> .gitignore
```

### 3. 防火墙配置
```bash
# 只开放必要端口
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 3000/tcp  # Web服务（如果需要）
sudo ufw enable
```

### 4. 定期更新
```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 更新Node.js依赖（检查breaking changes）
npm outdated
npm update
```

---

## 联系方式

如遇到问题：
1. 查看日志：`pm2 logs qqbot --lines 100`
2. 查看文档：`README.md` 和 `UPGRADE.md`
3. 运行诊断：`node scripts/doctor.js`
4. 检查环境：`node scripts/vps-check.js`

---

## 附录：完整命令速查

```bash
# === 部署 ===
git pull origin main
npm install --production
npm run build
pm2 restart qqbot

# === 监控 ===
pm2 status
pm2 logs qqbot
pm2 monit

# === 维护 ===
node scripts/cache-clean.js
node scripts/build-daily-image-manifest.js --write
npm run smoke

# === 回滚 ===
git reset --hard HEAD~1
npm run build
pm2 restart qqbot

# === 诊断 ===
node scripts/doctor.js
node scripts/vps-check.js
npm run smoke
```
