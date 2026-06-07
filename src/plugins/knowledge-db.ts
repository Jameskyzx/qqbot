import * as fs from 'fs';
import * as path from 'path';

export interface KnowledgeDbSection {
  title: string;
  content: string;
  keywords: string[];
}

export interface KnowledgeDbSearchResult extends KnowledgeDbSection {
  dbScore: number;
}

export interface KnowledgeDbStats {
  mode: 'sqlite' | 'file';
  available: boolean;
  sections: number;
  queries: number;
  hits: number;
  misses: number;
  lastSyncAt: number;
  lastError: string;
  dbPath: string;
}

const DB_DIR = path.resolve(__dirname, '..', '..', 'knowledge', 'db');
const SQLITE_PATH = path.join(DB_DIR, 'wanjier.sqlite');
const FILE_INDEX_PATH = path.join(DB_DIR, 'wanjier-index.json');

type SqliteDatabase = {
  exec(sql: string): unknown;
  prepare(sql: string): {
    run(...args: unknown[]): unknown;
    all(...args: unknown[]): unknown[];
    get(...args: unknown[]): unknown;
  };
  close?(): unknown;
};

let sqliteDb: SqliteDatabase | null = null;
let sqliteTried = false;
let sqliteAvailable = false;
let lastSyncAt = 0;
let lastSyncedKey = '';
let lastError = '';
let queries = 0;
let hits = 0;
let misses = 0;
let fileSections: KnowledgeDbSection[] = [];

function ensureDir(): void {
  if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });
}

function getSqliteDb(): SqliteDatabase | null {
  if (sqliteTried) return sqliteDb;
  sqliteTried = true;
  ensureDir();
  try {
    const nodeRequire = eval('require') as NodeRequire;
    const sqlite = nodeRequire('node:sqlite') as { DatabaseSync: new (filename: string) => SqliteDatabase };
    sqliteDb = new sqlite.DatabaseSync(SQLITE_PATH);
    sqliteDb.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA synchronous = NORMAL;
      CREATE TABLE IF NOT EXISTS knowledge_sections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        keywords TEXT NOT NULL,
        searchable TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_knowledge_sections_updated ON knowledge_sections(updated_at);
      CREATE TABLE IF NOT EXISTS knowledge_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    sqliteAvailable = true;
    lastError = '';
    return sqliteDb;
  } catch (err) {
    sqliteAvailable = false;
    lastError = `sqlite unavailable: ${err instanceof Error ? err.message : String(err)}`.slice(0, 180);
    sqliteDb = null;
    return null;
  }
}

function normalize(input: string): string {
  return input.toLowerCase().replace(/\s+/g, ' ').trim();
}

function queryTerms(query: string): string[] {
  const terms = new Set<string>();
  const normalized = normalize(query);
  for (const item of normalized.match(/[\u4e00-\u9fa5]{2,12}|[a-z0-9][a-z0-9_-]{1,24}/g) || []) {
    if (item.length >= 2) terms.add(item);
    if (terms.size >= 16) break;
  }
  return [...terms];
}

function scoreSection(section: KnowledgeDbSection, query: string, terms: string[]): number {
  const haystack = normalize(`${section.title}\n${section.keywords.join(' ')}\n${section.content}`);
  const title = normalize(section.title);
  let score = 0;
  for (const term of terms) {
    if (title.includes(term)) score += 10;
    if (section.keywords.some((keyword) => normalize(keyword).includes(term))) score += 5;
    const index = haystack.indexOf(term);
    if (index >= 0) score += 2 + Math.max(0, 4 - Math.floor(index / 500));
  }
  if (query && title && normalize(query).includes(title)) score += 12;
  return score;
}

function syncFileIndex(sections: KnowledgeDbSection[], syncKey: string): void {
  ensureDir();
  fileSections = sections;
  const payload = {
    syncKey,
    updatedAt: Date.now(),
    sections,
  };
  fs.writeFileSync(FILE_INDEX_PATH, `${JSON.stringify(payload)}\n`, 'utf-8');
}

function loadFileIndex(): KnowledgeDbSection[] {
  if (fileSections.length > 0) return fileSections;
  try {
    if (!fs.existsSync(FILE_INDEX_PATH)) return [];
    const parsed = JSON.parse(fs.readFileSync(FILE_INDEX_PATH, 'utf-8'));
    if (!Array.isArray(parsed?.sections)) return [];
    fileSections = parsed.sections
      .filter((item: any) => item && typeof item.title === 'string' && typeof item.content === 'string')
      .map((item: any) => ({
        title: item.title,
        content: item.content,
        keywords: Array.isArray(item.keywords) ? item.keywords.filter((k: unknown) => typeof k === 'string') : [],
      }));
    return fileSections;
  } catch (err) {
    lastError = `file index read failed: ${err instanceof Error ? err.message : String(err)}`.slice(0, 180);
    return [];
  }
}

export function syncKnowledgeDb(sections: KnowledgeDbSection[], sourceMtime: number): void {
  const syncKey = `${sourceMtime}:${sections.length}:${sections.reduce((sum, item) => sum + item.content.length, 0)}`;
  if (syncKey === lastSyncedKey) return;
  ensureDir();
  lastSyncedKey = syncKey;
  lastSyncAt = Date.now();

  const db = getSqliteDb();
  if (!db) {
    syncFileIndex(sections, syncKey);
    return;
  }

  try {
    db.exec('BEGIN IMMEDIATE');
    db.exec('DELETE FROM knowledge_sections');
    const stmt = db.prepare('INSERT INTO knowledge_sections (title, content, keywords, searchable, updated_at) VALUES (?, ?, ?, ?, ?)');
    const now = Date.now();
    for (const section of sections) {
      const keywords = section.keywords.join(' ');
      stmt.run(
        section.title,
        section.content,
        keywords,
        normalize(`${section.title}\n${keywords}\n${section.content}`),
        now,
      );
    }
    const meta = db.prepare('INSERT OR REPLACE INTO knowledge_meta (key, value) VALUES (?, ?)');
    meta.run('syncKey', syncKey);
    meta.run('updatedAt', String(now));
    db.exec('COMMIT');
    fileSections = sections;
    lastError = '';
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch { /* noop */ }
    lastError = `sqlite sync failed: ${err instanceof Error ? err.message : String(err)}`.slice(0, 180);
    syncFileIndex(sections, syncKey);
  }
}

export function searchKnowledgeDb(query: string, limit: number = 12): KnowledgeDbSearchResult[] {
  queries++;
  const terms = queryTerms(query);
  if (terms.length === 0) {
    misses++;
    return [];
  }

  const db = getSqliteDb();
  let candidates: KnowledgeDbSection[] = [];
  if (db) {
    try {
      const where = terms.slice(0, 8).map(() => 'searchable LIKE ?').join(' OR ');
      const params = terms.slice(0, 8).map((term) => `%${term}%`);
      const rows = db.prepare(
        `SELECT title, content, keywords FROM knowledge_sections WHERE ${where} ORDER BY updated_at DESC LIMIT ?`,
      ).all(...params, Math.max(limit * 5, 30)) as Array<{ title: string; content: string; keywords: string }>;
      candidates = rows.map((row) => ({
        title: row.title,
        content: row.content,
        keywords: row.keywords ? row.keywords.split(/\s+/).filter(Boolean) : [],
      }));
    } catch (err) {
      lastError = `sqlite search failed: ${err instanceof Error ? err.message : String(err)}`.slice(0, 180);
    }
  }

  if (candidates.length === 0) {
    candidates = loadFileIndex().filter((section) => {
      const haystack = normalize(`${section.title}\n${section.keywords.join(' ')}\n${section.content}`);
      return terms.some((term) => haystack.includes(term));
    }).slice(0, Math.max(limit * 5, 30));
  }

  const scored = candidates
    .map((section) => ({ ...section, dbScore: scoreSection(section, query, terms) }))
    .filter((item) => item.dbScore > 0)
    .sort((a, b) => b.dbScore - a.dbScore)
    .slice(0, limit);

  if (scored.length > 0) hits++;
  else misses++;
  return scored;
}

export function getKnowledgeDbStats(): KnowledgeDbStats {
  const db = getSqliteDb();
  let sections = fileSections.length;
  if (db) {
    try {
      const row = db.prepare('SELECT COUNT(*) AS count FROM knowledge_sections').get() as { count?: number };
      sections = Number(row?.count || 0);
    } catch { /* keep fallback */ }
  } else if (sections === 0) {
    sections = loadFileIndex().length;
  }
  return {
    mode: sqliteAvailable ? 'sqlite' : 'file',
    available: sqliteAvailable || sections > 0,
    sections,
    queries,
    hits,
    misses,
    lastSyncAt,
    lastError,
    dbPath: sqliteAvailable ? SQLITE_PATH : FILE_INDEX_PATH,
  };
}

export function closeKnowledgeDb(): void {
  try {
    sqliteDb?.close?.();
  } catch { /* noop */ }
  sqliteDb = null;
  sqliteTried = false;
  sqliteAvailable = false;
}
