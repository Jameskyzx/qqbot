import { uniqueNonEmpty } from './media-utils';

export interface MediaCheckSources {
  images: string[];
  records: string[];
}

const DIRECT_SOURCE_RE = /(?:https?:\/\/[^\s<>"']+|data:(?:image|audio)\/[^\s<>"']+|base64:\/\/[^\s<>"']+|file:\/\/[^\s<>"']+|[a-zA-Z]:[\\/][^\s<>"']+|\\\\[^\s<>"']+|\/[^\s<>"']+)/gi;
const QUOTED_SOURCE_RE = /["']([^"']{2,1200})["']/g;

function cleanSourceCandidate(value: string): string {
  let next = (value || '').trim();
  const markdown = next.match(/^!?\[[^\]]*]\((.+)\)$/);
  if (markdown?.[1]) next = markdown[1].trim();
  const angle = next.match(/^<(.+)>$/);
  if (angle?.[1]) next = angle[1].trim();
  next = next
    .replace(/^[([{<"'“”‘’]+/g, '')
    .replace(/[)\]}>，。！？!?,;；"'“”‘’]+$/g, '')
    .trim();
  return next;
}

function looksLikeLocalPath(source: string): boolean {
  return /^(?:[a-zA-Z]:[\\/]|\/|\\)/.test(source);
}

export function extractMediaSourceCandidates(text: string): string[] {
  const raw = (text || '').trim();
  if (!raw) return [];
  const candidates: Array<{ value: string; index: number }> = [];
  const quoted: string[] = [];
  for (const match of raw.matchAll(QUOTED_SOURCE_RE)) {
    if (match[1]) {
      quoted.push(match[1]);
      candidates.push({ value: match[1], index: match.index ?? 0 });
    }
  }
  for (const match of raw.matchAll(DIRECT_SOURCE_RE)) {
    if (quoted.some((item) => item !== match[0] && item.includes(match[0]))) continue;
    candidates.push({ value: match[0], index: match.index ?? 0 });
  }
  for (const tokenMatch of raw.matchAll(/\S+/g)) {
    const token = tokenMatch[0];
    const cleaned = cleanSourceCandidate(token);
    if (quoted.some((item) => item !== cleaned && item.includes(cleaned))) continue;
    if (/^(?:https?:\/\/|data:(?:image|audio)\/|base64:\/\/|file:\/\/)/i.test(cleaned) || looksLikeLocalPath(cleaned)) {
      candidates.push({ value: cleaned, index: tokenMatch.index ?? 0 });
    }
  }
  return uniqueNonEmpty(candidates
    .sort((a, b) => a.index - b.index)
    .map((item) => cleanSourceCandidate(item.value))
    .filter(Boolean));
}

export function looksLikeAudioSource(source: string): boolean {
  const text = (source || '').toLowerCase();
  return /^data:audio\//.test(text)
    || /\.(?:mp3|wav|m4a|amr|ogg|opus|flac|aac)(?:[?#].*)?$/.test(text)
    || /(?:^|[?&])(?:audio|record|voice)=/.test(text);
}

export function looksLikeImageSource(source: string): boolean {
  const text = (source || '').toLowerCase();
  if (/^data:image\//.test(text)) return true;
  if (looksLikeAudioSource(text)) return false;
  if (text.startsWith('base64://')) return true;
  if (/\.(?:png|jpe?g|webp|gif|bmp|avif)(?:[?#].*)?$/.test(text)) return true;
  return /^https?:\/\//i.test(source) || /^file:\/\//i.test(source) || looksLikeLocalPath(source);
}

export function extractVisionCheckSources(text: string): string[] {
  const candidates = extractMediaSourceCandidates(text);
  return candidates.length > 0
    ? uniqueNonEmpty(candidates.filter((source) => !looksLikeAudioSource(source)))
    : [];
}

export function extractMediaCheckSources(text: string): MediaCheckSources {
  const sources = extractMediaSourceCandidates(text);
  return {
    images: uniqueNonEmpty(sources.filter(looksLikeImageSource)),
    records: uniqueNonEmpty(sources.filter(looksLikeAudioSource)),
  };
}

export function isWarmupCommandSource(source: string): boolean {
  const raw = (source || '').trim();
  if (!raw || raw.length > 260 || /\s/.test(raw)) return false;
  if (/^(?:data:|base64:\/\/)/i.test(raw)) return false;
  return /^(?:https?:\/\/|file:\/\/|[a-zA-Z]:[\\/]|\/|\\)/.test(raw);
}

export function traceWarmupSources(sources: string[], limit = 4): string[] {
  return uniqueNonEmpty(sources)
    .filter(isWarmupCommandSource)
    .slice(0, Math.max(1, limit));
}
