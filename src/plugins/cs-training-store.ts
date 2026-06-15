import * as fs from 'fs';
import * as path from 'path';
import { writeJsonFileAtomic } from './runtime-storage';

export type TrainingArea = 'aim' | 'utility' | 'map' | 'role' | 'clutch' | 'review' | 'match';

export interface CsTrainingLogEntry {
  id: string;
  chatType: 'group' | 'private';
  chatId: number;
  groupId?: number;
  userId: number;
  displayName: string;
  area: TrainingArea;
  minutes: number;
  map: string;
  weapon: string;
  note: string;
  createdAt: number;
}

interface CsTrainingStore {
  version: 1;
  logs: CsTrainingLogEntry[];
}

const DEFAULT_TRAINING_STORE_PATH = path.resolve(__dirname, '..', '..', 'data', 'cs-training.json');
const MAX_TRAINING_LOGS = 2000;
const TRAINING_RETENTION_MS = 180 * 24 * 60 * 60 * 1000;
let trainingStorePathOverride = '';

function trainingStorePath(): string {
  return trainingStorePathOverride || DEFAULT_TRAINING_STORE_PATH;
}

function emptyTrainingStore(): CsTrainingStore {
  return { version: 1, logs: [] };
}

export function cleanTrainingText(value: string, max = 80): string {
  return (value || '')
    .replace(/\s+/g, ' ')
    .replace(/[|`<>]/g, '')
    .trim()
    .slice(0, max);
}

export function clampMinutes(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 30;
  return Math.max(1, Math.min(360, Math.round(parsed)));
}

export function normalizeTrainingArea(value: unknown): TrainingArea {
  const text = String(value || '').toLowerCase();
  if (['utility', 'nade', '道具', '投掷物'].includes(text)) return 'utility';
  if (['map', '地图', '控图'].includes(text)) return 'map';
  if (['role', '定位', '位置'].includes(text)) return 'role';
  if (['clutch', '残局', '回防'].includes(text)) return 'clutch';
  if (['review', 'demo', '复盘', '录像'].includes(text)) return 'review';
  if (['match', '实战', '天梯', '排位'].includes(text)) return 'match';
  return 'aim';
}

export function areaLabel(area: TrainingArea): string {
  const labels: Record<TrainingArea, string> = {
    aim: '练枪',
    utility: '道具',
    map: '地图',
    role: '定位',
    clutch: '残局',
    review: '复盘',
    match: '实战',
  };
  return labels[area];
}

export function loadTrainingStore(): CsTrainingStore {
  const filepath = trainingStorePath();
  if (!fs.existsSync(filepath)) return emptyTrainingStore();
  try {
    const parsed = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    const logs = Array.isArray(parsed?.logs) ? parsed.logs : [];
    return {
      version: 1,
      logs: logs
        .filter((item: Partial<CsTrainingLogEntry>) => item && item.id && item.userId && item.chatId && item.createdAt)
        .map((item: CsTrainingLogEntry) => ({
          id: String(item.id),
          chatType: item.chatType === 'private' ? 'private' : 'group',
          chatId: Number(item.chatId),
          groupId: item.groupId ? Number(item.groupId) : undefined,
          userId: Number(item.userId),
          displayName: cleanTrainingText(item.displayName || `user${item.userId}`, 24),
          area: normalizeTrainingArea(item.area),
          minutes: clampMinutes(item.minutes),
          map: cleanTrainingText(item.map || '', 32),
          weapon: cleanTrainingText(item.weapon || '', 32),
          note: cleanTrainingText(item.note || '', 100),
          createdAt: Number(item.createdAt || 0),
        })),
    };
  } catch {
    return emptyTrainingStore();
  }
}

export function saveTrainingStore(store: CsTrainingStore): void {
  const filepath = trainingStorePath();
  const cutoff = Date.now() - TRAINING_RETENTION_MS;
  const logs = store.logs
    .filter((item) => item.createdAt >= cutoff)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_TRAINING_LOGS)
    .sort((a, b) => a.createdAt - b.createdAt);
  writeJsonFileAtomic(filepath, { version: 1, logs }, { trailingNewline: false });
}

export function logsForUser(chatType: 'group' | 'private', chatId: number | string, userId: number, days = 14): CsTrainingLogEntry[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return loadTrainingStore().logs
    .filter((item) => item.chatType === chatType && String(item.chatId) === String(chatId) && item.userId === userId && item.createdAt >= cutoff)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function clearTrainingLogs(chatType: 'group' | 'private', chatId: number | string, userId: number): number {
  const store = loadTrainingStore();
  const before = store.logs.length;
  store.logs = store.logs.filter((item) => !(item.chatType === chatType && String(item.chatId) === String(chatId) && item.userId === userId));
  saveTrainingStore(store);
  return before - store.logs.length;
}

export function setTrainingStorePathForTests(filepath?: string): void {
  trainingStorePathOverride = filepath || '';
}
