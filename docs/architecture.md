# 项目架构说明

这份文档给后续维护和继续加功能用。目标是让机器人长期跑在 VPS 上，数据可靠、风格可控、问题可诊断。

## 运行链路

1. `src/index.ts` 加载 `.env` 和 `config.json`，启动 OneBot WebSocket、Web 管理后台和后台任务。
2. `src/handler.ts` 把 OneBot 消息标准化成插件上下文，负责命令解析、@ 检测、引用回复和私聊/群聊分流。
3. 插件按顺序执行：管理、统计、复读、工具、趣味、贴纸，最后由 `ai-chat` 做兜底 AI 对话。
4. AI 回复进入 `src/plugins/ai-chat.ts` 后，会依次处理 STT、识图、联网搜索、HLTV/CS API、知识库、历史记忆、LLM 调用、后处理、TTS 和发送。

## 数据与缓存

- `context_store/`：群/私聊上下文摘要和最近消息，重启后可恢复。
- `context_store/embeddings/`：轻量 RAG 历史索引，每个会话一个 jsonl。
- `knowledge/wanjier.md`：主知识库，适合写风格规则、短摘要、事实锚点、场景模板。
- `knowledge/inbox/`：管理员整理的授权素材入口，经 `/kb ingest -> /kb show -> /kb commit` 写入主库。
- `search_cache/`：联网搜索正/负缓存，减少重复搜索。
- `image_cache/`：图片下载缓存，服务识图和每日 CS 图片。
- `voice_cache/`、`stt_cache/`：TTS 输出和 STT 输入缓存。
- `scripts/sync-config.js`：部署后把新配置字段补进现有 `config.json`，保留用户密钥和已有值。

## 上下文与 RAG

- 最近消息走 `ContextManager`，只存纯文本，不存图片 base64，避免内存膨胀。
- 旧消息超过阈值后异步压缩成摘要，队列繁忙时会延后压缩。
- 轻量 RAG 不依赖外部 embedding API，使用中文字符/二元组和英文词特征做相似度召回。
- 运行时可调字段：
  - `enable_memory_retrieval`
  - `memory_top_k`
  - `memory_min_similarity`
  - `memory_inject_max_chars`
  - `memory_max_messages_per_session`
  - `memory_max_sessions_in_memory`
- 排查入口：
  - `/mem` 看当前会话和 RAG 索引状态。
  - `/mem recent [条数]` 看最近上下文和最近 RAG 索引，用来定位模型到底看到了什么。
  - `/mem search <关键词>` 查当前会话相关历史。
  - `/trace last` 看最近一条回复实际注入的记忆预览、知识分区、搜索/识图状态。

## 知识库策略

- 公开事实可以自动写入，但必须带来源和时效提示。
- 切片、直播、礼物感谢相关内容默认只做摘要和场景模板。
- `/scene [场景词]` 从主库抽取场景模板，适合把长切片学习结果转成“场景 -> 反应 -> 判断”结构。
- 长段逐字稿只允许管理员放进 `knowledge/inbox/`，并确认来源合法后人工提交。
- 运行回复时禁止暴露“知识库/临场笔记/模板”等内部词。

## CS 实时数据

- 首选 `api.csapi.de` 结构化数据，用于排名、赛果、选手/队伍状态。
- Liquipedia MediaWiki API 负责赛程/排名/图片等兜底，但有 30 秒级限流保护。
- webSearch 是最后兜底，适合查官宣、新闻和网页摘要。
- `/data`、`npm run data:test`、`/csimage test all` 是主要核验入口。

## 加新功能的建议位置

- 新命令但不需要 AI：优先加到独立插件或 `fun.ts`。
- 需要 AI 上下文/搜索/识图/语音：加到 `ai-chat.ts`，并同步 trace 字段。
- 需要持久化用户/群配置：新增 `data/` 或专门目录，避免写进 `config.json`。
- 需要定时任务：在插件内部暴露 start/stop，跟 `startAiChatBackgroundTasks` 一样可重载。
- 需要后台可观测：同时补 `/status`、`/diag` 或 `/maint status`。

## 下一批推荐实现

- `/watch team <队伍>`、`/watch player <选手>`：订阅赛程、赛果、转会提醒。
- `/predict`：赛前投票和比分竞猜，赛后按结果给群积分。
- `/train today`：按今日地图/武器/定位生成练枪和道具任务。
- `/kb import-url <链接>`：只抓标题、来源、短摘要，生成候选，不自动写长文本。
- Web 管理页：查看最近 trace、知识候选、缓存大小、实时数据健康度。
