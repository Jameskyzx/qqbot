import type { ChatMessage, MessageContent } from './llm-api';
import { buildRealtimeReferencePack } from './ai-evidence';

export interface BuildApiMessagesInput {
  systemPrompt: string;
  summary?: string;
  history: ChatMessage[];
  currentMessage: ChatMessage;
  searchInfo?: string;
  knowledgeInfo?: string;
  similarMemories?: string;
  styleSceneInfo?: string;
  userProfileInfo?: string;
}

// Keep volatile facts close to the current user turn so the stable prompt/history
// prefix remains cache-friendly and realtime evidence cannot look like old memory.
export function buildApiMessages(input: BuildApiMessagesInput): ChatMessage[] {
  const {
    systemPrompt,
    summary = '',
    history,
    currentMessage,
    searchInfo = '',
    knowledgeInfo = '',
    similarMemories = '',
    styleSceneInfo = '',
    userProfileInfo = '',
  } = input;
  const result: ChatMessage[] = [{ role: 'system', content: systemPrompt }];

  if (knowledgeInfo) {
    result.push({ role: 'system', content: `[临场笔记-本地语态与背景]\n${knowledgeInfo}` });
  }

  if (userProfileInfo) {
    result.push({ role: 'system', content: `[用户画像-自填偏好]\n${userProfileInfo}` });
  }

  if (styleSceneInfo) {
    result.push({ role: 'system', content: `[本条风格场景-不要外显]\n${styleSceneInfo}` });
  }

  if (summary) {
    result.push({ role: 'system', content: `[历史摘要]\n${summary}` });
  }

  if (similarMemories) {
    result.push({ role: 'system', content: `[相关历史片段，仅供参考，不要直接复述]\n${similarMemories}` });
  }

  result.push(...history);

  if (!searchInfo) {
    result.push(currentMessage);
    return result;
  }

  const realtimePack = buildRealtimeReferencePack(searchInfo);
  if (typeof currentMessage.content === 'string') {
    result.push({
      role: 'user',
      content: `${realtimePack}\n\n[当前消息]\n${currentMessage.content}`,
    });
    return result;
  }

  const newContent: MessageContent[] = [
    { type: 'text', text: realtimePack },
    ...currentMessage.content,
  ];
  result.push({ role: 'user', content: newContent });
  return result;
}
