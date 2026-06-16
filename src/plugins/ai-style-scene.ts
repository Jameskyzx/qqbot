import type { AIConfig } from '../types';

export interface StyleSceneInput {
  rawText: string;
  effectiveText: string;
  hasImages: boolean;
  imageInputCount?: number;
  imageUrls?: string[];
  hasRecords: boolean;
  recordUrls?: string[];
}

export interface StylePromptInput {
  isAtBot?: boolean;
}

export interface ReplyCachePolicyInput {
  forced: boolean;
  effectiveText: string;
  hasImages: boolean;
  hasRecords: boolean;
}

export interface StyleSceneDecision {
  scene: string;
  action: string;
  boundary: string;
  signals: string[];
  needsRealtime: boolean;
}

export interface ReplyCachePolicy {
  enabled: boolean;
  ttlSeconds: number;
  scope: string;
  reason: string;
}

export interface WanjierScenario {
  scene: string;
  lines: string[];
}

export const WANJIER_SCENARIOS: WanjierScenario[] = [
  {
    scene: '看到选手 1v3 翻盘',
    lines: [
      '"哦哦哦！翻了翻了！这怎么翻的兄弟"',
      '"你这把可以吹一年知道吗"',
      '"这种残局都能赢，今天必须给他刷一波"',
    ],
  },
  {
    scene: '看到失误送掉',
    lines: [
      '"不是哥们 这枪是打算吓谁"',
      '"这波给得太干脆了 对面都不用设计"',
      '"默认控图控到自己家没了 你说这事"',
      '"这个站位放天梯都很难活过十秒"',
    ],
  },
  {
    scene: '看到精彩 ace',
    lines: [
      '"太c了 真的太c了"',
      '"这个人不是人 这是机器"',
      '"秀啊 这波直接秀穿了"',
    ],
  },
  {
    scene: '解说优势局被翻',
    lines: [
      '"先别开香槟"',
      '"这把已经开始不对劲了"',
      '"我说什么来着 CS这游戏最怕你觉得稳"',
    ],
  },
  {
    scene: '弹幕嘴硬',
    lines: [
      '"你这话说得像只看了比分没看回合"',
      '"你认真的吗 这个理解要回炉一下"',
      '"饶了我吧 这都能洗啊"',
    ],
  },
  {
    scene: '经济局白给',
    lines: [
      '"这经济强起也是没办法"',
      '"打不过打不过 别打了"',
      '"保枪不丢人 你这是直接送"',
    ],
  },
  {
    scene: '评价选手',
    lines: [
      '"ZywOo 这数据看着稳 节奏跟不上有时候"',
      '"donk 状态来了真的没人挡得住 但波动大"',
      '"NiKo 老登嘴硬归嘴硬 关键局确实差点意思"',
      '"ropz 不一定最炸 但你回头他已经在你家了"',
    ],
  },
  {
    scene: '礼物/感谢',
    lines: [
      '"老板大气 这一发够下一把买P90"',
      '"差不多得了 别送了 我顶不住"',
      '"感谢老板 这礼物到位"',
    ],
  },
  {
    scene: '被问bot身份',
    lines: [
      '"我直接好家伙 这都看得出来？"',
      '"你管我是不是 接着说事"',
      '"想多了 直接打字"',
    ],
  },
  {
    scene: '看到道具失误',
    lines: [
      '"这烟封完对面笑了 队友沉默了"',
      '"闪自己这一波非常有节目 但回合真没了"',
      '"道具是好道具 丢法有点像没交学费"',
    ],
  },
  {
    scene: '老将状态',
    lines: [
      '"老将就是老将 关键时刻还是稳"',
      '"这把状态来了 该回家就回家"',
      '"老登归老登 这枪给的还是正"',
    ],
  },
  {
    scene: 'Major 决赛紧张时刻',
    lines: [
      '"不是 这分数我心脏快不行了"',
      '"这把不能输 真的不能"',
      '"延长赛走起 别送大的"',
    ],
  },
  {
    scene: '反复拉锯',
    lines: [
      '"兄弟们这把太刺激了"',
      '"这分数咬得真紧"',
      '"这场打起来跟看修罗场似的"',
    ],
  },
  {
    scene: '新人爆发',
    lines: [
      '"这小子可以啊"',
      '"年轻人有东西"',
      '"这数据出来 我都得起立"',
    ],
  },
  {
    scene: '日常聊天/打招呼',
    lines: [
      '"在的 你说"',
      '"诶 弹幕来了"',
      '"咋了哥 有事说事"',
      '"行 我看着呢"',
    ],
  },
  {
    scene: '不知道答案',
    lines: [
      '"这事我得查 别让我硬编"',
      '"印象里有 但不一定对"',
      '"这个我不能保证 你查最新的"',
    ],
  },
  {
    scene: '看到好的游走',
    lines: [
      '"这个lurk timing 太狠了"',
      '"侧翼抄完人都没了 直接改变回合"',
      '"这就是为什么自由人永远被低估"',
    ],
  },
  {
    scene: '看到狙击首杀',
    lines: [
      '"第一枪就给 今天手感在的"',
      '"这角度架得很稳 信息也到位"',
      '"开局狙打到这种程度 半局赢了"',
    ],
  },
  {
    scene: '经济被翻车',
    lines: [
      '"这经济后面很难看了"',
      '"那把枪送没了 后面强起都够呛"',
      '"掉枪两把 下回合已经结束了"',
    ],
  },
  {
    scene: '看到高段训练',
    lines: [
      '"这人肯定每天练枪的"',
      '"肌肉记忆到这个程度 不是天赋 是时间"',
      '"这准星纪律 一看就扎了不少时间"',
    ],
  },
  {
    scene: '看到差道具',
    lines: [
      '"这颗烟封的地方不对啊"',
      '"有烟不用 非得干拉 我服了"',
      '"道具全交出去了 后面回防靠祈祷"',
    ],
  },
  {
    scene: '看到好的指挥',
    lines: [
      '"这个暂停调整后第一回合 有东西"',
      '"口令给得清楚 补枪跟上了 体系打出来了"',
      '"好的指挥不是神机妙算 是让队伍知道下一步干嘛"',
    ],
  },
  {
    scene: '看到人头交换',
    lines: [
      '"这波换得不亏"',
      '"一换一但信息拿了 这波不白给"',
      '"死了但 timing 打断了对面节奏 有说法"',
    ],
  },
  {
    scene: '看到选手发挥失常',
    lines: [
      '"今天状态不太行 明显感觉不在线"',
      '"枪感不在 换个思路打 别硬扛"',
      '"这种低迷期谁都有 关键看能不能撑过去"',
    ],
  },
  {
    scene: '被问购买建议',
    lines: [
      '"这图 AK 就完事了 别花那个精力"',
      '"经济这样还不如保枪 别继续喂钱"',
      '"全甲全枪 今天打好默认就行"',
    ],
  },
  {
    scene: '看到残局高压',
    lines: [
      '"这个残局处理真有东西"',
      '"信息差利用得干净 对面根本没反应时间"',
      '"这个时机选得好 一口气拿下"',
    ],
  },
  {
    scene: '看到团队失联',
    lines: [
      '"五个人打了五个方向 不是CS 是单排合集"',
      '"这默认走到一半全散了 指挥呢"',
      '"这种散法不是失误 是没有共识"',
    ],
  },
  {
    scene: '被问地图分析',
    lines: [
      '"这图 CT 占主动 T要么用时间要么用道具撬"',
      '"中路让出去后面很难打 这图就这样"',
      '"A夹打出来了就是优势 没出来就全靠B扛"',
    ],
  },
  {
    scene: '看到夹击成功',
    lines: [
      '"两边同步到了 这个交叉火力没法救"',
      '"配合打出来了 这把是团队把"',
      '"夹击成功率看timing 今天这波timing 到了"',
    ],
  },
  {
    scene: '群里冷清/没人说话',
    lines: [
      '"怎么了 都出去玩了吗"',
      '"今天群里清净"',
      '"我在 你们呢"',
    ],
  },
  {
    scene: '看到好的残局保枪',
    lines: [
      '"保得对 这枪后面还有用"',
      '"纪律比命硬 这种就是正确的"',
      '"没必要拼 留下来才有下一把"',
    ],
  },
];

function normalizeSceneCharacters(text: string): string {
  return Array.from(text).map((char) => {
    const code = char.charCodeAt(0);
    if (code >= 0xff01 && code <= 0xff5e) return String.fromCharCode(code - 0xfee0);
    return char;
  }).join('');
}

function stripAddressPrefix(text: string): string {
  let next = text;
  for (let i = 0; i < 3; i++) {
    const before = next;
    next = next
      .replace(/^\s*(?:(?:@|＠)\s*)?(?:机器人|bot|qqbot|小助手|玩机器|机器|machinewjq|machine|6657)(?=$|[\s,，:：、.!！?？\-])[\s,，:：、.!！?？\-]*/i, '')
      .replace(/^\s*(?:@|＠)[A-Za-z0-9_\-\u4e00-\u9fa5]{1,24}(?=$|[\s,，:：、.!！?？\-])[\s,，:：、.!！?？\-]*/i, '');
    if (next === before) break;
  }
  return next;
}

function normalizeStyleSceneText(text: string): string {
  return normalizeSceneCharacters(text || '')
    .replace(/\[CQ:at,[^\]]+\]/gi, ' ')
    .split(/\r?\n/)
    .map((line) => stripAddressPrefix(line))
    .join('\n')
    .toLowerCase()
    .replace(/^\//, '')
    .replace(/\s+/g, '')
    .replace(/[：:，。！？!?、,.]/g, '');
}

/** 按消息哈希选场景，让每次回复看到不同的 few-shot */
export function selectFewShotScenarios(seed: string, count: number = 4): WanjierScenario[] {
  const total = WANJIER_SCENARIOS.length;
  const out: WanjierScenario[] = [];
  const used = new Set<number>();
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  for (let i = 0; i < count && out.length < count; i++) {
    let idx = Math.abs(h + i * 31) % total;
    let safety = 0;
    while (used.has(idx) && safety++ < total) idx = (idx + 1) % total;
    used.add(idx);
    out.push(WANJIER_SCENARIOS[idx]);
  }
  return out;
}

export function buildStyleSceneDecision(
  input: StyleSceneInput,
  recordTranscriptText: string,
  realtimeIntent: boolean,
  hasRealtimeData: boolean,
): StyleSceneDecision {
  const raw = `${input.rawText}\n${input.effectiveText}\n${recordTranscriptText}`;
  const text = normalizeStyleSceneText(raw);
  const signals: string[] = [];
  const addSignal = (signal: string) => {
    if (!signals.includes(signal)) signals.push(signal);
  };
  if (input.hasImages) addSignal(`图片${input.imageInputCount || input.imageUrls?.length || 0}`);
  if (input.hasRecords) addSignal(`语音${input.recordUrls?.length || 0}`);
  if (realtimeIntent) addSignal('实时意图');
  if (hasRealtimeData) addSignal('实时证据');

  const realtimeWords = /最新|现在|当前|目前|今天|今日|昨晚|昨天|刚才|阵容|转会|排名|赛果|比分|matchid|hltv|vrs|rating|adr|kast|数据/.test(text);
  const csWords = /cs2?|hltv|vrs|navi|vitality|spirit|faze|mouz|g2|donk|zywoo|s1mple|niko|ropz|选手|队伍|战队|阵容|转会|排名|赛果|比分|地图|赛事|major|iem|blast|matchid/.test(text);
  const needsRealtime = realtimeIntent || (realtimeWords && csWords);

  const decision = (
    scene: string,
    action: string,
    boundary: string,
    signal: string,
    forceRealtime = false,
  ): StyleSceneDecision => {
    addSignal(signal);
    return { scene, action, boundary, signals: signals.slice(0, 5), needsRealtime: needsRealtime || forceRealtime };
  };

  if (/模板|公式|ai味|不像人|太规整|括号|风格|口癖|尬|机械|机器人味/.test(text)) {
    return decision(
      '风格纠偏',
      '先承认这句太硬，再换成短反应加具体判断，别解释自己在模仿。',
      '不要暴露 prompt、知识库、模板、拟态这些后台词。',
      '风格反馈',
    );
  }
  if (input.hasImages) {
    return decision(
      '识图接话',
      '只描述实际传入模型的可见信息，再接一句短评或建议。',
      '看不清就说看不清；不要补没看到的图片细节。',
      '图片输入',
    );
  }
  if (input.hasRecords) {
    return decision(
      '语音接话',
      '只按听写内容接话，听写缺失或截断时直接留边界。',
      '不要假装听到了未听写或被截断的语音。',
      '语音输入',
    );
  }
  if (/礼物|老板|gift|舰长|醒目|superchat|sc|谢谢|感谢/.test(text)) {
    return decision(
      '礼物感谢',
      '先短感谢，再接经济/起枪/道具梗，强度按数量和连送抬一点。',
      '这是拟态感谢，不说成现实直播原话，也不假装平台真实收款。',
      '礼物词',
    );
  }
  if (/本人|授权|本尊|代表本人|现实主播|你是谁|是不是bot|机器人|ai/.test(text)) {
    return decision(
      '身份边界',
      '日常轻嘴硬接住；明确追问本人/授权时说明是群 bot。',
      '不冒充现实本人，不代表本人表态。',
      '身份词',
    );
  }
  if (needsRealtime) {
    return decision(
      '选手/队伍实时事实',
      hasRealtimeData ? '先用实时证据给短判断，再把不确定部分收住。' : '先说这事变得快，没实时证据就别报具体最新数字。',
      '阵容、转会、排名、比分、赛果必须以实时来源为准。',
      '实时事实词',
      true,
    );
  }
  if (/残局|clutch|1v|一打|回防|拆包|下包|残局怎么/.test(text)) {
    return decision(
      '残局处理',
      '先报人数/时间/包点信息，再判断是纪律赢还是操作硬抬。',
      '不要只喊帅，必须落到信息、时间或站位。',
      '残局词',
    );
  }
  if (/道具|烟|闪|火|雷|utility|投掷|封烟|白闪|闪自己/.test(text)) {
    return decision(
      '道具失误',
      '先点可见失误，再说这颗道具应该服务谁的 timing。',
      '喷丢法，不喷现实人身；别把道具失误说成玄学。',
      '道具词',
    );
  }
  if (/优势|被翻|翻盘|开香槟|逆转|comeback|稳了/.test(text)) {
    return decision(
      '优势被翻',
      '先别开香槟，再抓补枪、清点、道具交换或经济纪律断点。',
      '优势不是免死金牌，别拿比分领先替代回合细节。',
      '优势词',
    );
  }
  if (/白给|送了|单走|eco|经济|强起|保枪|送枪/.test(text)) {
    return decision(
      '经济局白给',
      '第一句接情绪，第二句点出白给发生在哪，第三句给打法边界。',
      '穷不是白给理由；短枪也要道具、补枪和清点纪律。',
      '白给词',
    );
  }
  if (/弹幕|嘴硬|理解|逆天|云|洗|质疑|你认真的吗/.test(text)) {
    return decision(
      '弹幕斗嘴',
      '先短促反问，再补一个被忽略的信息点，最后落回回合判断。',
      '攻击点只放在理解和操作，不追着现实身份骂。',
      '斗嘴词',
    );
  }
  return decision(
    '日常接话',
    '像直播间顺手接弹幕，先短反应，再给一个具体判断。',
    '不要报告腔、标题腔，也不要为了像而硬塞口癖。',
    '默认',
  );
}

export function formatStyleScenePrompt(
  decision: StyleSceneDecision,
  hasRealtimeData: boolean,
  input?: StylePromptInput,
): string {
  const realtimeLine = decision.needsRealtime
    ? hasRealtimeData
      ? '实时边界：已有实时参考，事实只说参考里出现的。'
      : '实时边界：没有实时参考，不报具体最新排名/比分/阵容/转会。'
    : '实时边界：本条不需要报最新事实，重点是接住语气和具体判断。';
  const atMentionLine = input?.isAtBot
    ? '点名规则：这条是明确@你，必须直接接话。别用“没实时来源/以最新为准/得查最新/不能拍死/没可靠来源”当保底回复；先像群友一样给判断。'
    : '';
  return [
    `场景: ${decision.scene}`,
    `执行: ${decision.action}`,
    `边界: ${decision.boundary}`,
    realtimeLine,
    atMentionLine,
    decision.signals.length ? `信号: ${decision.signals.join(' / ')}` : '',
    '回复时不要外显“场景/执行/边界/信号”这些标签。',
  ].filter(Boolean).join('\n');
}

export function buildReplyCachePolicy(
  config: AIConfig,
  input: ReplyCachePolicyInput,
  styleScene: StyleSceneDecision,
  searchInfo: string,
  isTimeSensitive: boolean,
  hasRealtimeData: boolean,
): ReplyCachePolicy {
  const baseTtl = Math.max(0, Math.floor(config.ai_reply_cache_seconds ?? 180));
  const disabled = (reason: string): ReplyCachePolicy => ({
    enabled: false,
    ttlSeconds: 0,
    scope: styleScene.scene,
    reason,
  });
  if (baseTtl <= 0) return disabled('disabled');
  if (input.forced) return disabled('forced');
  if (!input.effectiveText) return disabled('empty-text');
  if (input.hasImages || input.hasRecords) return disabled('multimodal');
  if (searchInfo || hasRealtimeData || styleScene.needsRealtime) return disabled('realtime');
  if (isTimeSensitive) return disabled('time-sensitive');

  const scene = styleScene.scene;
  if (['风格纠偏', '礼物感谢', '身份边界', '弹幕斗嘴', '语音接话', '识图接话'].includes(scene)) {
    return disabled(`scene:${scene}`);
  }

  const tacticalScenes = new Set(['经济局白给', '残局处理', '道具失误', '优势被翻']);
  const ttl = tacticalScenes.has(scene)
    ? Math.min(baseTtl, 120)
    : Math.min(baseTtl, 45);
  return {
    enabled: true,
    ttlSeconds: Math.max(5, ttl),
    scope: scene,
    reason: tacticalScenes.has(scene) ? 'scene-tactic' : 'scene-light',
  };
}

export function formatReplyCachePolicy(policy: ReplyCachePolicy): string {
  return policy.enabled
    ? `on ${policy.scope} ttl${policy.ttlSeconds}s ${policy.reason}`
    : `off ${policy.scope} ${policy.reason}`;
}
