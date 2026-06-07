import { Plugin } from '../types';
import { CONFIG_VERSION } from '../config';
import { getAiChatStats } from './ai-chat';
import { getCacheStats } from './image-cache';
import { getKnowledgeStats } from './knowledge-base';
import { getSearchStats } from './web-search';
import { getSttStats } from './stt';
import { getVoiceStats } from './tts';

const startTime = Date.now();

function formatTime(timestamp: number): string {
  if (!timestamp) return '无';
  return new Date(timestamp).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
}

export const statusPlugin: Plugin = {
  name: 'status',
  description: '查看机器人运行状态',
  handler: (ctx) => {
    if (ctx.command === 'status') {
      const uptime = Math.floor((Date.now() - startTime) / 1000);
      const hours = Math.floor(uptime / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const seconds = uptime % 60;

      const memUsage = process.memoryUsage();
      const memMB = (memUsage.heapUsed / 1024 / 1024).toFixed(1);
      const rssMB = (memUsage.rss / 1024 / 1024).toFixed(1);
      const config = ctx.bot.getConfig();
      const imageStats = getCacheStats();
      const searchStats = getSearchStats();
      const voiceStats = getVoiceStats(config.ai);
      const sttStats = getSttStats(config.ai);
      const knowledgeStats = getKnowledgeStats();
      const aiStats = getAiChatStats();
      const runtime = ctx.bot.getRuntimeStats();
      const lastRefresh = knowledgeStats.lastAutoRefreshAt
        ? new Date(knowledgeStats.lastAutoRefreshAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
        : '无';

      const statusText = [
        '🤖 运行状态',
        '',
        `⏱ 运行: ${hours}h ${minutes}m ${seconds}s`,
        `💾 内存: heap ${memMB} MB / rss ${rssMB} MB`,
        `🆔 Bot: self_id ${ctx.event.self_id} / 配置 ${config.bot_qq || '未填写'}`,
        `🔌 OneBot: ${runtime.readyState} connected=${runtime.connected ? 'yes' : 'no'} pendingApi=${runtime.pendingApi} 断开${runtime.totalDisconnects} 早断${runtime.consecutiveEarlyDisconnects} 心跳重连${runtime.staleHeartbeatReconnects} 重连=${runtime.reconnectScheduled ? Math.round(runtime.reconnectIntervalMs / 1000) + 's' : '无'}`,
        `🔐 QQ登录: ${runtime.lastLoginOk ? 'ok' : '异常/未确认'} self=${runtime.lastLoginUserId || '-'} ${runtime.lastLoginNickname || ''} 检查${formatTime(runtime.lastLoginCheckAt)} OK${formatTime(runtime.lastLoginOkAt)} 失败${runtime.loginCheckFailures} 成功${runtime.loginCheckSuccesses}${runtime.lastLoginError ? ` 错误=${runtime.lastLoginError}` : ''}`,
        `📨 事件: frames=${runtime.framesReceived} events=${runtime.eventsReceived} 最后帧${formatTime(runtime.lastFrameAt)} 最后事件${formatTime(runtime.lastEventAt)}`,
        `📤 发送/API: 群${runtime.groupSendAttempts - runtime.groupSendFailures}/${runtime.groupSendAttempts} 私聊${runtime.privateSendAttempts - runtime.privateSendFailures}/${runtime.privateSendAttempts} API ${runtime.apiResponses}/${runtime.apiCalls} timeout=${runtime.apiTimeouts} fail=${runtime.apiFailures}`,
        ...(runtime.lastDisconnectedAt ? [`🔌 最近断开: ${formatTime(runtime.lastDisconnectedAt)} code=${runtime.lastDisconnectCode}${runtime.lastDisconnectReason ? ` reason=${runtime.lastDisconnectReason}` : ''}`] : []),
        ...(runtime.lastError ? [`🔌 最近WS错误: ${runtime.lastError}`] : []),
        ...(runtime.lastConnectionHint ? [`🔌 连接提示: ${runtime.lastConnectionHint}`] : []),
        `🧾 配置版本: ${config.config_version || '未填写'} / ${CONFIG_VERSION}${(config.config_version || 0) < CONFIG_VERSION ? ' 偏旧' : ''}`,
        `🎭 当前预设: ${config.ai?.active_preset || '无'}`,
        `📚 知识库: ${knowledgeStats.sections}块 ${knowledgeStats.chars}字 词${knowledgeStats.keywords} 候选${knowledgeStats.candidates}`,
        `📖 知识命中: 检索${knowledgeStats.searchHits}/${knowledgeStats.searchMisses} 注入${knowledgeStats.selectHits}/${knowledgeStats.selectMisses}`,
        `📚 知识DB: ${knowledgeStats.dbMode} ${knowledgeStats.dbSections}块 命中${knowledgeStats.dbHits}/${knowledgeStats.dbMisses} 查询${knowledgeStats.dbQueries}${knowledgeStats.dbLastError ? ` 错误=${knowledgeStats.dbLastError}` : ''}`,
        ...(aiStats.lastKnowledgeTitles.length > 0 ? [`📖 最近知识分区: ${aiStats.lastKnowledgeTitles.join(' / ')}`] : []),
        `🔄 知识自动: ${knowledgeStats.autoEnabled && config.ai?.knowledge_auto_update !== false ? 'on' : 'off'} ${aiStats.knowledgeAutoRunning ? '刷新中' : '空闲'} 间隔${aiStats.knowledgeAutoIntervalMinutes || config.ai?.knowledge_auto_interval_minutes || '-'}m 最近${lastRefresh} 写入${knowledgeStats.autoCommitted} 主库分层 审计${knowledgeStats.auditIssues} 源状态${knowledgeStats.sourceStates}`,
        `🧠 上下文: ${aiStats.sessions}会话 队列${aiStats.queuedGroups}群 待处理${aiStats.pendingJobs} 强触发${aiStats.forcedJobs} 最老${Math.round(aiStats.oldestQueueAgeMs / 1000)}s`,
        `🚧 并发闸门: AI ${aiStats.gates.ai.active}/${aiStats.gates.ai.limit}+${aiStats.gates.ai.queued} 搜索 ${aiStats.gates.search.active}/${aiStats.gates.search.limit}+${aiStats.gates.search.queued} 图 ${aiStats.gates.vision.active}/${aiStats.gates.vision.limit}+${aiStats.gates.vision.queued} 听写 ${aiStats.gates.stt.active}/${aiStats.gates.stt.limit}+${aiStats.gates.stt.queued} 语音 ${aiStats.gates.tts.active}/${aiStats.gates.tts.limit}+${aiStats.gates.tts.queued}`,
        `🚧 Gate背压: 普通拒绝 AI${aiStats.gates.ai.rejectedPassive} 搜索${aiStats.gates.search.rejectedPassive} 图${aiStats.gates.vision.rejectedPassive} 听写${aiStats.gates.stt.rejectedPassive} 语音${aiStats.gates.tts.rejectedPassive} 高水位AI${aiStats.gates.ai.highWaterQueued}`,
        `⚡ AI缓存: ${aiStats.replyCacheEntries}条 命中${aiStats.replyCacheHits}/${aiStats.replyCacheMisses}`,
        `🧩 上下文压缩: 完成${aiStats.completedCompressions} 延后${aiStats.deferredCompressions} 失败${aiStats.failedCompressions}`,
        `🚦 主动接话跳过: ${aiStats.skippedPassiveReplies}`,
        `🗣 开头去重: 最近${aiStats.lastOpenerDeduped ? '触发过' : '未触发'}`,
        `🔍 搜索缓存: ${searchStats.cacheEntries}/${searchStats.maxEntries}条 空${searchStats.negativeEntries} 命中${searchStats.hits}/${searchStats.misses} 磁盘${searchStats.diskHits} 飞行${searchStats.inFlight}`,
        `🧾 自动批次: ${knowledgeStats.batches}个 可回滚${knowledgeStats.rollbackableBatches}`,
        `🖼 图片缓存: ${imageStats.count}/${imageStats.maxFiles}张 ${imageStats.sizeMB}/${imageStats.maxSizeMB}MB 单图${imageStats.maxFileMB}MB ${imageStats.maxAgeHours}h 跳转${imageStats.maxRedirects} 清理${imageStats.cleanupIntervalMinutes}m 命中${imageStats.hits}/${imageStats.misses} 失败${imageStats.downloadFailures} 飞行${imageStats.inFlight}`,
        `🧹 图片清理: 最近${imageStats.lastCleanupAt ? new Date(imageStats.lastCleanupAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '无'} 删除${imageStats.lastCleanupDeleted} 累计${imageStats.cleanupDeletedTotal}`,
        ...(imageStats.lastError ? [`图片最近错误: ${imageStats.lastError}`] : []),
        `🎧 语音听写: ${sttStats.enabled ? 'on' : 'off'} ${sttStats.provider}${sttStats.localReady ? '/local' : ''} payload=${sttStats.payloadMode}/${sttStats.lastPayloadMode || '-'} record=${sttStats.recordFormat} 缓存${sttStats.cacheFiles}/${sttStats.maxCacheFiles}条 ${sttStats.sizeMB}/${sttStats.maxCacheMB}MB 命中${sttStats.hits}/${sttStats.misses} 本地${sttStats.localRuns} API${sttStats.apiRuns} 下载失败${sttStats.downloadMisses} 空转写${sttStats.transcriptMisses}`,
        `🧹 听写清理: 最近${sttStats.lastCleanupAt ? new Date(sttStats.lastCleanupAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '无'} 删除${sttStats.lastCleanupDeleted} 累计${sttStats.cleanupDeletedTotal}`,
        `🔊 语音: ${voiceStats.provider}${voiceStats.localReady ? '/local' : ''} send=${voiceStats.sendMode} 缓存${voiceStats.cacheFiles}/${voiceStats.maxCacheFiles}条 ${voiceStats.sizeMB}/${voiceStats.maxCacheMB}MB 命中${voiceStats.hits}/${voiceStats.misses} 本地${voiceStats.localRuns} API${voiceStats.apiRuns} 克隆${voiceStats.cloneEnabled ? (voiceStats.cloneReady ? 'ready' : 'missing') : 'off'}`,
        `🧹 语音清理: 最近${voiceStats.lastCleanupAt ? new Date(voiceStats.lastCleanupAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '无'} 删除${voiceStats.lastCleanupDeleted} 累计${voiceStats.cleanupDeletedTotal}`,
        ...(voiceStats.lastMode ? [`🔊 最近TTS模式: ${voiceStats.lastMode}`] : []),
        ...(voiceStats.lastError ? [`🔊 语音最近错误: ${voiceStats.lastError}`] : []),
        `📦 Node ${process.version}`,
      ].join('\n');

      ctx.reply(statusText);
      return true;
    }
    return false;
  },
};
