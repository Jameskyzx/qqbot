import type { MessageSegment } from '../types';
import { firstMediaString, uniqueNonEmpty } from './media-utils';

export interface VisionDataUrlResolverBot {
  callApiAsync(action: string, params: Record<string, unknown>, timeoutMs?: number): Promise<unknown>;
}

export interface ResolveVisionDataUrlsOptions {
  bot: VisionDataUrlResolverBot;
  message: MessageSegment[];
  messageId: number;
  imageUrls: string[];
  limit: number;
  loadImageDataUrl: (source: string, stage: string) => Promise<string | null | undefined>;
  resolveMessageImageSources?: (message: MessageSegment[]) => Promise<string[]>;
  imageCacheLastError?: string | (() => string);
}

export interface ResolvedVisionDataUrls {
  dataUrls: string[];
  error: string;
}

export function normalizeInlineImageDataUrl(value: string): string {
  const cleaned = (value || '').trim();
  if (!cleaned) return '';
  if (cleaned.startsWith('data:image/')) return cleaned;
  if (cleaned.startsWith('base64://')) {
    return `data:image/jpeg;base64,${cleaned.slice('base64://'.length).replace(/\s+/g, '')}`;
  }
  const compact = cleaned.replace(/\s+/g, '');
  if (compact.length > 100 && /^[A-Za-z0-9+/_=-]+$/.test(compact)) {
    return `data:image/jpeg;base64,${compact}`;
  }
  return '';
}

function apiData<T = any>(response: unknown): T {
  return ((response as any)?.data || response) as T;
}

function imageRawFiles(message: MessageSegment[]): string[] {
  return uniqueNonEmpty(message
    .filter((seg) => seg.type === 'image')
    .map((seg) => seg.type === 'image' ? (seg.data.file || seg.data.url || '') : ''));
}

export async function resolveVisionDataUrls(options: ResolveVisionDataUrlsOptions): Promise<ResolvedVisionDataUrls> {
  const limit = Math.max(1, Math.floor(options.limit) || 1);
  const dataUrls: string[] = [];
  const seen = new Set<string>();
  let lastError = '';

  const pushIfDataUrl = (value: string): boolean => {
    if (dataUrls.length >= limit) return true;
    const dataUrl = normalizeInlineImageDataUrl(value);
    if (!dataUrl) return false;
    if (!seen.has(dataUrl)) {
      seen.add(dataUrl);
      dataUrls.push(dataUrl);
    }
    return true;
  };

  const loadSources = async (sources: string[], stage: string): Promise<void> => {
    for (const source of uniqueNonEmpty(sources)) {
      if (dataUrls.length >= limit) break;
      try {
        const dataUrl = await options.loadImageDataUrl(source, stage);
        if (dataUrl) pushIfDataUrl(dataUrl);
      } catch (err) {
        lastError = `${stage}: ${err instanceof Error ? err.message : String(err)}`.slice(0, 140);
      }
    }
  };

  await loadSources(options.imageUrls, 'message');
  if (dataUrls.length >= limit) return { dataUrls: dataUrls.slice(0, limit), error: '' };

  try {
    const msgRes = await options.bot.callApiAsync('get_msg', { message_id: options.messageId }, 6000);
    const msgData = apiData(msgRes);
    const msgSegs = Array.isArray((msgData as any)?.message) ? (msgData as any).message as MessageSegment[] : [];
    if (msgSegs.length > 0) {
      const reresolved = options.resolveMessageImageSources
        ? await options.resolveMessageImageSources(msgSegs)
        : imageRawFiles(msgSegs);
      await loadSources(reresolved, 'get_msg');
    }
  } catch (err) {
    lastError = `get_msg: ${err instanceof Error ? err.message : String(err)}`.slice(0, 140);
  }
  if (dataUrls.length >= limit) return { dataUrls: dataUrls.slice(0, limit), error: '' };

  for (const rawFile of imageRawFiles(options.message).slice(0, limit)) {
    if (dataUrls.length >= limit) break;
    try {
      const imageRes = await options.bot.callApiAsync('get_image', { file: rawFile }, 8000);
      const imageData = apiData(imageRes);
      if (pushIfDataUrl(String((imageData as any)?.base64 || (imageData as any)?.b64 || (imageData as any)?.base64_file || (imageData as any)?.file_base64 || ''))) continue;
      const best = firstMediaString(imageData, 'image/jpeg');
      if (best) await loadSources([best], 'get_image');
    } catch (err) {
      lastError = `get_image: ${err instanceof Error ? err.message : String(err)}`.slice(0, 140);
    }

    try {
      const fileRes = await options.bot.callApiAsync('get_file', { file_id: rawFile, file: rawFile }, 8000);
      const fileData = apiData(fileRes);
      if (pushIfDataUrl(String((fileData as any)?.base64 || (fileData as any)?.b64 || (fileData as any)?.file_base64 || ''))) continue;
      const best = firstMediaString(fileData, 'image/jpeg');
      if (best) await loadSources([best], 'get_file');
    } catch (err) {
      lastError = lastError || `get_file: ${err instanceof Error ? err.message : String(err)}`.slice(0, 140);
    }
  }

  return {
    dataUrls: dataUrls.slice(0, limit),
    error: lastError || (typeof options.imageCacheLastError === 'function' ? options.imageCacheLastError() : options.imageCacheLastError) || '',
  };
}
