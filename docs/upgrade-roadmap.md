# 长效升级路线

本项目当前已经具备 QQ 群聊触发、上下文、联网搜索、CS 结构化数据、每日 CS 图片、识图、语音、知识库候选和自动刷新。下面是后续继续把机器人做得更好玩、更可靠的路线。

## 已落地重点

- CS 数据：优先 `https://api.csapi.de` 的结构化 JSON，回答中标注 CS API / VRS / 选手统计快照；Liquipedia 和 webSearch 作为兜底。
- 真实图片：每日 CS 全分支优先解析 Liquipedia / Counter-Strike Wiki / Wikimedia 外部真实图源；失败才发本地签位卡，并用 `/csimage test all` 可验。
- 识图：`/vision test` 会下载图片、报告图片大小、模型、payload 模式，并判断模型是否真的返回可见描述。
- 语音：TTS/STT 都支持 API、本地命令和自动模式；建议 VPS 上接授权本地 TTS/STT，API 作兜底。
- 知识库：公开来源只做事实/短摘要，长视频和切片素材走 `knowledge/inbox/`，用 `/kb ingest -> show -> commit` 审核入库。
- VPS 更新：`scripts/update.sh --hard` 可备份配置后强制对齐 `origin/main`，避免 VPS 仍停在旧代码。

## 可继续新增的功能

- 比赛订阅：`/watch Vitality`、`/watch player donk`，开赛/赛果/换人自动提醒。
- 群内竞猜：赛前投票、地图比分预测、赛后结算积分榜。
- CS 日报：每天固定推送昨日赛果、今日赛程、热门新闻、选手状态变化。
- 个人训练建议：按用户抽到的地图/武器/定位，生成当天练枪/道具任务。
- 贴纸包增强：按关键词自动发本地贴纸，如白给、开香槟、保枪、老板大气。
- 管理后台：Web 页查看队列、缓存、知识候选、错误日志和最近真实数据源。
- RAG 增强：给知识库增加向量索引，分“风格、事实、切片摘要、礼物模板、CS数据”多路召回。

## 真识图建议

1. 配置真正支持视觉的模型，`vision_model` 不要填纯文本模型。
2. 群里跑 `/vision status` 看模型、payload 和图片缓存。
3. 跑 `/vision test <图片URL>`，看是否出现“模型返回了可见描述”。
4. 直接发图片加 `/vision test`，测试 NapCat `get_image` 链路。
5. 若下载 OK 但调用失败，调 `vision_payload_mode`：`auto`、`image_url_object`、`image_url_string`、`input_image`、`image_base64` 逐个试。

## 语音优化建议

- STT：VPS 优先用本地 Whisper/faster-whisper 命令，环境变量读取 `QQBOT_STT_INPUT/QQBOT_STT_OUTPUT`。
- TTS：只用授权声音样本；本地 TTS 生成失败时 API 兜底。
- QQ 发送：Docker NapCat 建议 `tts_send_mode=base64`，减少容器路径问题。
- 缓存：常用短句缓存命中高，`tts_cache_hours` 和 `tts_cache_max_mb` 可以按 VPS 空间调大。

## 风格与素材边界

- 可以学习“场景 -> 反应方式 -> 可用话术”，不要长篇复制公开视频字幕。
- 礼物感谢建议做拟态模板，例如“感谢老板，这波经济直接拉满”，不要标成真实原话。
- 机器人可以更像直播间接弹幕，但不冒充现实本人，不代表本人发言。
- 攻击性只打操作、决策、逻辑和理解，不打现实身份和人身属性。

## VPS 核验清单

```bash
git log --oneline -1
npm run build
npm run doctor
npm run data:test
pm2 restart wanjier --update-env
pm2 logs wanjier --lines 80 --nostream
```

群里再跑：

```text
/data
/csplayer status
/csimage test all
/vision status
/trace last
```
