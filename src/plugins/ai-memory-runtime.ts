import type { AIConfig } from '../types';
import { deleteSession } from './context-store';
import { ContextManager } from './ai-context';
import { clearSessionIndex, getEmbeddingStats, type MemorySearchResult } from './embedding-store';

export type MemoryMutationHook = (sessionId: string) => void;

export interface MemoryRuntime {
  getContextManager(config: AIConfig): ContextManager;
  onMemoryMutated?: MemoryMutationHook;
}

export function getMemoryDiagnostics(runtime: MemoryRuntime, config: AIConfig, sessionId: string): {
  enabled: boolean;
  session: ReturnType<ContextManager['getSessionMeta']>;
  embeddings: ReturnType<typeof getEmbeddingStats>;
  injectMaxChars: number;
} {
  const cm = runtime.getContextManager(config);
  return {
    enabled: cm.isMemoryEnabled(),
    session: cm.getSessionMeta(sessionId),
    embeddings: getEmbeddingStats(),
    injectMaxChars: cm.getMemoryInjectMaxChars(),
  };
}

export function searchSessionMemory(
  runtime: MemoryRuntime,
  config: AIConfig,
  sessionId: string,
  query: string,
  topK?: number,
): MemorySearchResult[] {
  const cm = runtime.getContextManager(config);
  return cm.retrieveSimilar(
    sessionId,
    query,
    topK ?? config.memory_top_k ?? 4,
    config.memory_min_similarity ?? 0.15,
  );
}

export function getRecentSessionMemory(
  runtime: MemoryRuntime,
  config: AIConfig,
  sessionId: string,
  limit: number = 8,
): {
  context: Array<{ role: string; text: string }>;
  indexed: Array<{ role: 'user' | 'assistant'; text: string; ts: number }>;
} {
  const cm = runtime.getContextManager(config);
  return {
    context: cm.getRecentMessages(sessionId, limit).map((message) => ({
      role: message.role,
      text: typeof message.content === 'string' ? message.content : '',
    })),
    indexed: cm.getRecentIndexedMessages(sessionId, limit),
  };
}

export function clearAiSessionMemory(
  sessionId: string,
  contextManager?: ContextManager | null,
  onMemoryMutated?: MemoryMutationHook,
): void {
  if (contextManager) {
    contextManager.clearSession(sessionId);
  } else {
    deleteSession(sessionId);
    clearSessionIndex(sessionId);
  }
  onMemoryMutated?.(sessionId);
}

export function trimAiSessionMemory(
  runtime: MemoryRuntime,
  config: AIConfig,
  sessionId: string,
  keepMessages: number,
): {
  contextBefore: number;
  contextAfter: number;
  summaryBeforeChars: number;
  summaryAfterChars: number;
  indexBefore: number;
  indexAfter: number;
} {
  const cm = runtime.getContextManager(config);
  const result = cm.trimSession(sessionId, keepMessages);
  runtime.onMemoryMutated?.(sessionId);
  return result;
}

export function dropAiSessionMemoryByQuery(
  runtime: MemoryRuntime,
  config: AIConfig,
  sessionId: string,
  query: string,
): {
  contextBefore: number;
  contextAfter: number;
  contextRemoved: number;
  summaryBeforeChars: number;
  summaryAfterChars: number;
  summaryDropped: boolean;
  indexBefore: number;
  indexAfter: number;
  indexRemoved: number;
  samples: Array<{ role: string; text: string; ts?: number }>;
} {
  const cm = runtime.getContextManager(config);
  const result = cm.dropSessionMemoryByQuery(sessionId, query);
  if (result.contextRemoved > 0 || result.indexRemoved > 0 || result.summaryDropped) {
    runtime.onMemoryMutated?.(sessionId);
  }
  return result;
}

export function inspectAiSessionMemoryByUser(
  runtime: MemoryRuntime,
  config: AIConfig,
  sessionId: string,
  userId: number,
): {
  contextTotal: number;
  contextMatched: number;
  summaryChars: number;
  indexTotal: number;
  indexMatched: number;
  samples: Array<{ role: string; text: string; ts?: number }>;
} {
  const cm = runtime.getContextManager(config);
  return cm.inspectSessionMemoryByUser(sessionId, userId);
}

export function dropAiSessionMemoryByUser(
  runtime: MemoryRuntime,
  config: AIConfig,
  sessionId: string,
  userId: number,
): {
  contextBefore: number;
  contextAfter: number;
  contextRemoved: number;
  summaryBeforeChars: number;
  summaryAfterChars: number;
  summaryDropped: boolean;
  indexBefore: number;
  indexAfter: number;
  indexRemoved: number;
  samples: Array<{ role: string; text: string; ts?: number }>;
} {
  const cm = runtime.getContextManager(config);
  const result = cm.dropSessionMemoryByUser(sessionId, userId);
  if (result.contextRemoved > 0 || result.indexRemoved > 0 || result.summaryDropped) {
    runtime.onMemoryMutated?.(sessionId);
  }
  return result;
}
