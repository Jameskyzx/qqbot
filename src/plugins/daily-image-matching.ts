import * as fs from 'fs';
import * as path from 'path';
import { compactManifestValue, type AuthorizedImageManifestCard } from './authorized-image-manifest';

const dailyLocalImageExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const defaultLocalPackScanLimit = 5000;

export type DailyImageManifestCard = AuthorizedImageManifestCard;

export function dailyImageSlug(value: unknown): string {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[《》「」『』“”‘’]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\|/g, ' ')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

export function dailyImageSlugCandidates(values: unknown[]): string[] {
  const slugs: string[] = [];
  for (const value of values) {
    const slug = dailyImageSlug(value);
    if (slug) slugs.push(slug);
    const dense = slug.replace(/-/g, '');
    if (dense && dense !== slug) slugs.push(dense);
  }
  return [...new Set(slugs)].filter(Boolean);
}

export function dailyImagePairSecondSlugCandidates(firstSlugs: string[], secondValues: unknown[]): string[] {
  const secondSlugs = dailyImageSlugCandidates(secondValues);
  const result = new Set(secondSlugs);
  for (const first of firstSlugs) {
    const firstDense = first.replace(/-/g, '');
    for (const second of secondSlugs) {
      if (second.startsWith(`${first}-`)) result.add(second.slice(first.length + 1));
      const secondDense = second.replace(/-/g, '');
      if (firstDense && secondDense.startsWith(firstDense) && secondDense.length > firstDense.length) {
        result.add(secondDense.slice(firstDense.length));
      }
    }
  }
  return [...result].filter(Boolean);
}

export function scanDailyLocalPackImages(directory: string, limit = defaultLocalPackScanLimit): string[] {
  const images: string[] = [];
  const stack = [directory];
  while (stack.length > 0 && images.length < limit) {
    const current = stack.pop()!;
    let entries: fs.Dirent[] = [];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const filepath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(filepath);
        continue;
      }
      if (entry.isFile() && dailyLocalImageExtensions.has(path.extname(entry.name).toLowerCase())) images.push(filepath);
    }
  }
  return images;
}

export function manifestSearchValues(card: DailyImageManifestCard): string[] {
  return [
    card.key,
    card.itemKey,
    card.nick,
    card.name,
    card.itemName,
    card.characterKey,
    card.characterName,
    card.weapon,
    card.skin,
    card.title,
    ...(Array.isArray(card.tags) ? card.tags : []),
  ].map(compactManifestValue).filter(Boolean);
}

export function manifestBeautyScore(card: DailyImageManifestCard): number {
  const text = [
    card.title,
    card.style,
    card.quality,
    ...(Array.isArray(card.tags) ? card.tags : []),
  ].join(' ').toLowerCase();
  let score = Number.isFinite(Number(card.priority)) ? Number(card.priority) : 0;
  if (/(splash|card|art|artwork|illustration|poster|wallpaper|keyvisual|scene|stage|ingame|inspect|render|showcase|cinematic|卡面|立绘|海报|壁纸|场景|舞台|检视|展示|官图|美图)/i.test(text)) score += 80;
  if (/(headshot|portrait|avatar|profile|idphoto|大头|头像|证件|半身像)/i.test(text)) score -= 120;
  return score;
}

export function preferBeautyManifestImages(cards: DailyImageManifestCard[]): DailyImageManifestCard[] {
  const sorted = [...cards].sort((a, b) => manifestBeautyScore(b) - manifestBeautyScore(a));
  const beautiful = sorted.filter((card) => manifestBeautyScore(card) > -80);
  return beautiful.length > 0 ? beautiful : sorted;
}

export function uniqueManifestCardsByUrl(cards: DailyImageManifestCard[]): DailyImageManifestCard[] {
  const seen = new Set<string>();
  return cards.filter((card) => {
    const url = String(card.url || '').trim();
    if (!url || seen.has(url)) return false;
    seen.add(url);
    return true;
  });
}

export function dailyLocalPackCardsFromDirs(kind: string, label: string, directories: string[]): DailyImageManifestCard[] {
  const cards: DailyImageManifestCard[] = [];
  const seen = new Set<string>();
  for (const directory of directories) {
    const resolved = path.resolve(directory);
    if (seen.has(resolved) || !fs.existsSync(resolved)) continue;
    seen.add(resolved);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(resolved);
    } catch {
      continue;
    }
    if (!stat.isDirectory()) continue;
    for (const filepath of scanDailyLocalPackImages(resolved)) {
      cards.push({
        kind,
        key: dailyImageSlug(label),
        name: label,
        title: `${label} local ${path.basename(filepath, path.extname(filepath))}`,
        tags: ['local', 'authorized', 'image-pack'],
        priority: 70,
        url: filepath,
      });
    }
  }
  return preferBeautyManifestImages(cards);
}

export function compactDailyImageFields(fields: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    const text = String(value || '').trim();
    if (text) result[key] = text;
  }
  return result;
}
