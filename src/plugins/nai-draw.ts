import { MessageSegment, Plugin } from '../types';
import { createLogger } from '../logger';
import { callLLM, ChatMessage } from './llm-api';

const log = createLogger('NaiDraw');

const DEFAULT_BASE_URL = 'https://api.idlecloud.cc';
const DEFAULT_MODEL = 'nai-diffusion-4-5-full';
const DEFAULT_POSITIVE_SUFFIX = `artist:wlopc, 1.2::xiaoluo_xl::, 1.3::Artist: misaka_12003-gou::, 1.2::Artist:shexyo::, 0.7::Artist:b.sa_(bbbs)::, 1::Artist:qiandaiyiyu::, 1.05::artist:natedecock::, 1.05::artist:kunaboto::, 0.75::artist:kandata_nijou::, 1.05::artist:zer0.zer0 ::, 1.05::artist:jasony::, 0.75::misaka_12003-gou ::, dino_(dinoartforame), wanke, liduke, year 2025, realistic, 4k, -2::green::, textless version, The image is highly intricate finished drawn, write realistically, true to life, 3d, Only the character's face is in anime style, but their body is in realistic style, 1.35::A highly finished photo-style artwork that has lively color, graphic texture, realistic skin surface, and lifelike flesh with little obliques::, 1.63::photorealistic::, 1.63::photo(medium)::, 10::best quality, absurdres, very aesthetic, detailed, masterpiece::, -5.1::artist collaboration, -5::flat_color::, 1.2::breast_focus::, uncensored, very aesthetic, masterpiece, no text`;
const DEFAULT_CHARACTER1_SUFFIX = 'mature female, plump, oily skin, curvy, 1.3::gigantic_Breasts::';
const DEFAULT_NEGATIVE = 'nsfw, lowres, artistic error, film grain, scan artifacts, worst quality, bad quality, jpeg artifacts, very displeasing, chromatic aberration, dithering, halftone, screentone, multiple views, logo, too many watermarks, negative space, blank page, 1990s (style), mutation, deformed, distorted, disfigured, artistic error, distorted anatomy, anatomical structure error, asymmetrical face, unnatural hair, bad eyes, cloudy eyes, blank eyes, 4koma, 2koma, veins, lowres, badanatomy, badhands, badfoots, wrong, badfingers, text, error, missingfingers, extradigit, fewerdigits, cropped, worstquality, lowquality, normalquality, jpegartifacts, signature, watermark, usemame, blury, badfeet, logo, too many watermarks, three legs, wrong hand, wrong feet, wrong fingers, deformed leg, abnormal, malformation, lowres, bad anatomy, bad hands, text, error, missing fingers, extra digits, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry, bad feet, extra legs, poorly drawn shoes, bad proportions, bad limb, bad hands, extra hands, bad hand structure, extra digits, fewer digits, bad legs, extra legs, amputee, distorted composition, bad perspective, multiple views, negative space, animation error, chromatic aberration, disorganized colors, scan artifacts, jpeg artifacts, vertical lines, vertical banding, worst quality, bad quality, blurry, upscaled, fewer details, unfinished, incomplete, amateur, cheesy, unsatisfactory, inadequate, deficient, subpar, poor, displeasing, very displeasing, bad illustration, bad portrait, in container';
const DEFAULT_SAMPLER = 'k_dpmpp_2m_sde';
const MIN_INTERVAL_MS = 20_000;
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_MS = 180_000;
const SUBMIT_TIMEOUT_MS = 45_000;
const RESULT_TIMEOUT_MS = 30_000;

let lastSubmitAt = 0;
let inFlight = false;

type DrawOptions = {
  prompt: string;
  negativePrompt: string;
  model: string;
  width: number;
  height: number;
  steps: number;
  scale: number;
  sampler: string;
  seed?: number;
};

type AiDrawSpec = Partial<{
  prompt: string;
  character: string;
  negativePrompt: string;
  model: string;
  width: number;
  height: number;
  steps: number;
  scale: number;
  sampler: string;
  seed: number;
}>;

type SubmitResponse = {
  job_id?: string;
  queue_position?: number;
  error?: string;
  message?: string;
};

type ResultResponse = {
  status?: 'queued' | 'processing' | 'completed' | 'failed' | string;
  image_url?: string;
  video_url?: string;
  queue_position?: number;
  error?: string;
  message?: string;
};

function envString(name: string, fallback = ''): string {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
}

function envNumber(name: string, fallback: number, min: number, max: number): number {
  const raw = process.env[name];
  const parsed = raw === undefined ? NaN : Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(parsed, max));
}

function envBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clampMultipleOf64(value: number, fallback: number): number {
  const numeric = Number.isFinite(value) ? value : fallback;
  const rounded = Math.round(numeric / 64) * 64;
  return Math.max(64, Math.min(2048, rounded));
}

function sanitizePrompt(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 5000);
}

function appendDefaultPositiveSuffix(prompt: string): string {
  const cleanPrompt = sanitizePrompt(prompt);
  const suffix = sanitizePrompt(envString('WANJIER_NAI_POSITIVE_SUFFIX', DEFAULT_POSITIVE_SUFFIX));
  if (!suffix) return cleanPrompt;
  if (cleanPrompt.toLowerCase().includes(suffix.toLowerCase())) return cleanPrompt;
  return sanitizePrompt(`${cleanPrompt}, ${suffix}`);
}

function appendCharacter1Suffix(character: string): string {
  const cleanCharacter = sanitizePrompt(character);
  if (!cleanCharacter) return '';
  const suffix = sanitizePrompt(envString('WANJIER_NAI_CHARACTER1_SUFFIX', DEFAULT_CHARACTER1_SUFFIX));
  if (!suffix) return cleanCharacter;
  if (cleanCharacter.toLowerCase().includes(suffix.toLowerCase())) return cleanCharacter;
  return sanitizePrompt(`${cleanCharacter}, ${suffix}`);
}

function clampDrawOptions(options: DrawOptions): DrawOptions {
  let width = clampMultipleOf64(options.width, 1216);
  let height = clampMultipleOf64(options.height, 832);
  const pixels = width * height;
  if (pixels > 1_048_576) {
    const ratio = Math.sqrt(1_048_576 / pixels);
    width = clampMultipleOf64(width * ratio, 1024);
    height = clampMultipleOf64(height * ratio, 1024);
  }
  return {
    ...options,
    prompt: appendDefaultPositiveSuffix(options.prompt),
    negativePrompt: sanitizePrompt(options.negativePrompt),
    model: options.model.trim().slice(0, 80) || DEFAULT_MODEL,
    width,
    height,
    steps: Math.max(1, Math.min(28, Math.floor(options.steps))),
    scale: Math.max(1, Math.min(10, options.scale)),
    sampler: options.sampler.trim().slice(0, 80) || DEFAULT_SAMPLER,
    seed: options.seed === undefined ? undefined : Math.max(0, Math.min(4_294_967_295, Math.floor(options.seed))),
  };
}

function stripBotMention(text: string): string {
  return text.replace(/\[CQ:at,qq=\d+\]/g, '').trim();
}

function parseDrawOptions(rawArgs: string[]): DrawOptions | null {
  const tokens = [...rawArgs];
  const promptParts: string[] = [];
  let negativePrompt = envString('WANJIER_NAI_NEGATIVE_PROMPT', DEFAULT_NEGATIVE);
  let model = envString('WANJIER_NAI_MODEL', DEFAULT_MODEL);
  let width = envNumber('WANJIER_NAI_WIDTH', 1216, 64, 2048);
  let height = envNumber('WANJIER_NAI_HEIGHT', 832, 64, 2048);
  let steps = Math.floor(envNumber('WANJIER_NAI_STEPS', 28, 1, 28));
  let scale = envNumber('WANJIER_NAI_SCALE', 5, 1, 10);
  let sampler = envString('WANJIER_NAI_SAMPLER', DEFAULT_SAMPLER);
  let seed: number | undefined;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const next = tokens[i + 1];
    const readValue = (): string | null => {
      if (token.includes('=')) return token.slice(token.indexOf('=') + 1);
      if (next !== undefined) {
        i++;
        return next;
      }
      return null;
    };

    if (token === '--neg' || token === '--negative' || token.startsWith('--neg=') || token.startsWith('--negative=')) {
      const value = readValue();
      if (value) negativePrompt = sanitizePrompt(value);
      continue;
    }
    if (token === '--model' || token.startsWith('--model=')) {
      const value = readValue();
      if (value) model = value.trim().slice(0, 80);
      continue;
    }
    if (token === '--w' || token === '--width' || token.startsWith('--w=') || token.startsWith('--width=')) {
      const value = Number(readValue());
      width = clampMultipleOf64(value, width);
      continue;
    }
    if (token === '--h' || token === '--height' || token.startsWith('--h=') || token.startsWith('--height=')) {
      const value = Number(readValue());
      height = clampMultipleOf64(value, height);
      continue;
    }
    if (token === '--steps' || token.startsWith('--steps=')) {
      const value = Number(readValue());
      if (Number.isFinite(value)) steps = Math.max(1, Math.min(28, Math.floor(value)));
      continue;
    }
    if (token === '--scale' || token.startsWith('--scale=')) {
      const value = Number(readValue());
      if (Number.isFinite(value)) scale = Math.max(1, Math.min(10, value));
      continue;
    }
    if (token === '--sampler' || token.startsWith('--sampler=')) {
      const value = readValue();
      if (value) sampler = value.trim().slice(0, 80);
      continue;
    }
    if (token === '--seed' || token.startsWith('--seed=')) {
      const value = Number(readValue());
      if (Number.isFinite(value)) seed = Math.max(0, Math.min(4_294_967_295, Math.floor(value)));
      continue;
    }
    promptParts.push(token);
  }

  const prompt = sanitizePrompt(promptParts.join(' ')).replace(/^(?:raw|原样)\s*[:：]\s*/i, '');
  if (!prompt) return null;

  return clampDrawOptions({ prompt, negativePrompt, model, width, height, steps, scale, sampler, seed });
}

function extractJsonObject(text: string): AiDrawSpec | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced || text;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(candidate.slice(start, end + 1));
    return parsed && typeof parsed === 'object' ? parsed as AiDrawSpec : null;
  } catch {
    return null;
  }
}

function applyAiSpec(base: DrawOptions, spec: AiDrawSpec | null): DrawOptions {
  if (!spec) return base;
  const character = typeof spec.character === 'string' ? appendCharacter1Suffix(spec.character) : '';
  const prompt = typeof spec.prompt === 'string' && spec.prompt.trim()
    ? sanitizePrompt(character ? `${spec.prompt}, ${character}` : spec.prompt)
    : base.prompt;
  const negativePrompt = typeof spec.negativePrompt === 'string' && spec.negativePrompt.trim()
    ? sanitizePrompt(spec.negativePrompt)
    : base.negativePrompt;
  const model = typeof spec.model === 'string' && spec.model.trim() ? spec.model : base.model;
  const width = Number.isFinite(Number(spec.width)) ? Number(spec.width) : base.width;
  const height = Number.isFinite(Number(spec.height)) ? Number(spec.height) : base.height;
  const steps = Number.isFinite(Number(spec.steps)) ? Number(spec.steps) : base.steps;
  const scale = Number.isFinite(Number(spec.scale)) ? Number(spec.scale) : base.scale;
  const sampler = typeof spec.sampler === 'string' && spec.sampler.trim() ? spec.sampler : base.sampler;
  const seed = Number.isFinite(Number(spec.seed)) ? Number(spec.seed) : base.seed;
  return clampDrawOptions({ prompt, negativePrompt, model, width, height, steps, scale, sampler, seed });
}

function shouldUseAiParse(input: string): boolean {
  if (!envBoolean('WANJIER_NAI_AI_PARSE', true)) return false;
  const text = input.trim();
  if (!text) return false;
  if (/^(?:raw|原样)\s*[:：]/i.test(text)) return false;
  if (text.length > 500 && /::|,\s*\w|artist:/i.test(text)) return false;
  return /[\u4e00-\u9fff]|seed|尺寸|大小|宽|高|角色|character|prompt|负面|反向|不要|别|步数|steps|scale|cfg|模型|model/i.test(text);
}

async function parseWithAi(ctx: Parameters<Plugin['handler']>[0], rawInput: string, base: DrawOptions): Promise<DrawOptions> {
  if (!shouldUseAiParse(rawInput)) return base;
  const config = ctx.bot.getConfig().ai;
  if (!config?.api_key || !config?.api_url || !config?.model) return base;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: [
        '你是 NovelAI/NAI 画图参数解析器，只输出 JSON，不要解释。',
        '从用户中文或英文请求中提取文生图参数。',
        '字段: prompt, character, negativePrompt, width, height, steps, scale, sampler, seed, model。',
        'prompt 使用适合 NAI 的英文 tags/短语，保留用户指定风格和构图。',
        'character 放角色名/人物名/作品角色特征；如果已写进 prompt 可以留空。',
        'negativePrompt 放用户说的“不要/负面/反向”，没有则用默认质量反向词。',
        'width/height 必须是64倍数，乘积不超过1048576；steps最大28，scale范围1-10。',
        '如果用户没指定某字段就不要编造，使用 null 或省略。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        user_request: rawInput,
        current_defaults: {
          prompt: base.prompt,
          negativePrompt: base.negativePrompt,
          width: base.width,
          height: base.height,
          steps: base.steps,
          scale: base.scale,
          sampler: base.sampler,
          seed: base.seed ?? null,
          model: base.model,
        },
      }),
    },
  ];

  try {
    const aiConfig = {
      ...config,
      max_tokens: Math.min(config.max_tokens || 800, 800),
      temperature: 0.1,
      api_timeout_ms: Math.min(config.api_timeout_ms || 60_000, 45_000),
    };
    const text = await callLLM(aiConfig, messages, false);
    return applyAiSpec(base, extractJsonObject(text));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log.warn('AI parse failed, fallback to raw draw options:', message);
    return base;
  }
}

function buildPayload(options: DrawOptions): Record<string, unknown> {
  return {
    model: options.model,
    positivePrompt: options.prompt,
    negativePrompt: options.negativePrompt,
    scale: options.scale,
    steps: options.steps,
    width: options.width,
    height: options.height,
    promptGuidanceRescale: 0,
    noise_schedule: 'karras',
    seed: options.seed,
    sampler: options.sampler,
    sm: false,
    sm_dyn: false,
    decrisp: false,
    variety: false,
    prefer_brownian: true,
    deliberate_euler_ancestral_bug: false,
    legacy: false,
    legacy_uc: false,
    legacy_v3_extend: false,
    ucPreset: 1,
    autoSmea: false,
    use_coords: false,
    use_upscale_credits: false,
  };
}

async function withTimeout<T>(timeoutMs: number, action: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  timer.unref();
  try {
    return await action(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function postJson<T>(url: string, apiKey: string, payload: Record<string, unknown>): Promise<T> {
  const response = await withTimeout(SUBMIT_TIMEOUT_MS, (signal) => fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  }));
  const text = await response.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text.slice(0, 300) };
  }
  if (!response.ok) {
    const message = typeof data === 'object' && data && 'message' in data ? String((data as { message?: unknown }).message) : text;
    throw new Error(`HTTP ${response.status}: ${message.slice(0, 300)}`);
  }
  return data as T;
}

async function getJson<T>(url: string, apiKey: string): Promise<T> {
  const response = await withTimeout(RESULT_TIMEOUT_MS, (signal) => fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
    },
    signal,
  }));
  const text = await response.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text.slice(0, 300) };
  }
  if (!response.ok) {
    const message = typeof data === 'object' && data && 'message' in data ? String((data as { message?: unknown }).message) : text;
    throw new Error(`HTTP ${response.status}: ${message.slice(0, 300)}`);
  }
  return data as T;
}

async function generateImage(options: DrawOptions): Promise<{ imageUrl: string; jobId: string }> {
  const apiKey = envString('WANJIER_NAI_API_KEY');
  if (!apiKey) throw new Error('缺少 WANJIER_NAI_API_KEY');

  const baseUrl = envString('WANJIER_NAI_BASE_URL', DEFAULT_BASE_URL).replace(/\/+$/, '');
  const submitUrl = `${baseUrl}/api/generate_image`;
  log.info(`submit model=${options.model} size=${options.width}x${options.height} steps=${options.steps} sampler=${options.sampler} seed=${options.seed ?? 'random'}`);
  const submit = await postJson<SubmitResponse>(submitUrl, apiKey, buildPayload(options));
  if (!submit.job_id) {
    throw new Error(submit.error || submit.message || '提交成功但没有返回 job_id');
  }
  log.info(`submitted job=${submit.job_id} queue=${submit.queue_position ?? 'unknown'}`);

  const startedAt = Date.now();
  let lastStatus = 'queued';
  while (Date.now() - startedAt < MAX_POLL_MS) {
    await sleep(POLL_INTERVAL_MS);
    const result = await getJson<ResultResponse>(`${baseUrl}/api/get_result/${encodeURIComponent(submit.job_id)}`, apiKey);
    lastStatus = result.status || lastStatus;
    log.info(`poll job=${submit.job_id} status=${lastStatus} queue=${result.queue_position ?? 'unknown'}`);
    if (result.status === 'completed') {
      if (result.image_url) return { imageUrl: result.image_url, jobId: submit.job_id };
      throw new Error('任务完成但本次响应没有 image_url，接口提示不要重复轮询同一 job_id');
    }
    if (result.status === 'failed') {
      throw new Error(result.error || result.message || '任务失败');
    }
  }

  throw new Error(`等待超时，最后状态: ${lastStatus}`);
}

function helpText(): string {
  return [
    'NAI画图用法:',
    '/draw <提示词>',
    '/画图 <提示词>',
    '/nai <提示词>',
    '也可以自然说: /画图 角色初音未来，seed 123，1024x1024，不要文字水印',
    '可选参数: --w 1024 --h 1024 --steps 28 --scale 5 --sampler k_dpmpp_2m_sde --seed 123 --neg 反向提示词',
    '想完全原样不让AI整理: /draw raw: 1girl, masterpiece',
  ].join('\n');
}

function shouldHandleNatural(text: string): string | null {
  const normalized = stripBotMention(text).trim();
  const match = normalized.match(/^(?:画图|绘图|帮我画|给我画|来张图|生成图片|画一张)\s*[:：,，]?\s*(.+)$/i);
  return match ? match[1].trim() : null;
}

export const naiDrawPlugin: Plugin = {
  name: 'nai-draw',
  description: 'NAI/IDLECLOUD 文生图',
  handler: async (ctx) => {
    const command = (ctx.command || '').toLowerCase();
    const drawCommands = ['draw', 'paint', 'nai', 'nai-draw', 'image', '画图', '绘图', '生图'];
    const matchedCommand = drawCommands.find((item) => command === item || command.startsWith(item));
    const fusedCommandText = matchedCommand && command !== matchedCommand
      ? command.slice(matchedCommand.length)
      : '';
    const isCommand = Boolean(matchedCommand);
    const naturalPrompt = isCommand ? null : shouldHandleNatural(ctx.rawText);
    if (!isCommand && !naturalPrompt) return false;

    const commandArgs = fusedCommandText ? [fusedCommandText, ...ctx.args] : ctx.args;

    if ((commandArgs[0] || '').toLowerCase() === 'help') {
      ctx.reply(helpText());
      return true;
    }

    const rawInput = isCommand ? commandArgs.join(' ') : (naturalPrompt || '');
    const parsedOptions = parseDrawOptions(isCommand ? commandArgs : [naturalPrompt || '']);
    if (!parsedOptions) {
      ctx.reply(helpText());
      return true;
    }
    if (inFlight) {
      ctx.replyQuote('画图队列现在有一张正在跑，等它出图再来一张。');
      return true;
    }

    const waitMs = Math.max(0, MIN_INTERVAL_MS - (Date.now() - lastSubmitAt));
    if (waitMs > 0) {
      ctx.replyQuote(`NAI接口限速20秒，先等 ${Math.ceil(waitMs / 1000)} 秒再画。`);
      return true;
    }

    inFlight = true;
    lastSubmitAt = Date.now();
    ctx.replyQuote('收到，正在整理参数并提交 NAI。');

    try {
      const options = await parseWithAi(ctx, rawInput, parsedOptions);
      ctx.replyQuote(`开画。${options.width}x${options.height}，steps=${options.steps}，sampler=${options.sampler}，seed=${options.seed ?? '随机'}。`);
      const result = await generateImage(options);
      const message: MessageSegment[] = [
        { type: 'reply', data: { id: String(ctx.event.message_id) } },
        { type: 'image', data: { file: result.imageUrl, url: result.imageUrl } },
        { type: 'text', data: { text: `\nseed=${options.seed ?? '随机'} job=${result.jobId}` } },
      ];
      ctx.reply(message);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error('NAI draw failed:', message);
      ctx.replyQuote(`画图失败: ${message}`);
    } finally {
      inFlight = false;
    }

    return true;
  },
};
