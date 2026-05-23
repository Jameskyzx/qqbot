import { Bot } from '../bot';
import { NoticeEvent } from '../types';
import { getRandomKnowledgeLine } from './knowledge-base';

/**
 * 戳一戳回应插件
 * 有人戳bot时回应一句话
 */

const pokeReplies = [
  '让人不禁感叹',
  '让人不禁想问',
  '真的可以吗',
  '#查询黄河凌汛程度',
  '#查询太行山积雪厚度',
  '先别急 直接说事',
  '可以 我看到了',
  '有事说事 别光戳',
  '这波先收一下',
  '等一下 我在',
];

function shortKnowledgeReply(): string {
  const queries = ['戳一戳', '公式解说', '让人不禁感叹', '让人不禁想问', '真的可以吗', '黄河凌汛', '太行山积雪'];
  for (let i = 0; i < queries.length; i++) {
    const query = queries[Math.floor(Math.random() * queries.length)];
    const line = getRandomKnowledgeLine('quote', query);
    if (line && line.length <= 32 && !line.includes('{gift}') && !line.includes('模板') && !line.includes('待核验')) {
      return line.replace(/[。.!！]+$/, '');
    }
  }
  return '';
}

export function registerPokeListener(bot: Bot): void {
  bot.onEvent((event) => {
    if (event.post_type !== 'notice') return;

    const notice = event as NoticeEvent;
    // 戳一戳事件
    if (notice.notice_type !== 'notify' || (notice as any).sub_type !== 'poke') return;

    const targetId = (notice as any).target_id;
    // 只有被戳的是bot自己才回应
    if (targetId !== notice.self_id) return;

    const groupId = notice.group_id;
    if (!groupId) return;

    const config = bot.getConfig();
    if (config.enabled_groups.length > 0 && !config.enabled_groups.includes(groupId)) return;
    const probability = Math.max(0, Math.min(config.ai?.poke_reply_probability ?? 1, 1));
    if (Math.random() > probability) return;

    const reply = shortKnowledgeReply() || pokeReplies[Math.floor(Math.random() * pokeReplies.length)];
    const userId = (notice as any).user_id;
    const message = userId
      ? [
        { type: 'at' as const, data: { qq: String(userId) } },
        { type: 'text' as const, data: { text: ' ' + reply } },
      ]
      : reply;
    bot.sendGroupMessage(groupId, message);
  });

  console.log('[Poke] 戳一戳回应已启用');
}
