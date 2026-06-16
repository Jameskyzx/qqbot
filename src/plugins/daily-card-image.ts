import * as zlib from 'zlib';

interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface DailyCardImageOptions {
  title: string;
  label: string;
  subtitle?: string;
  score?: string;
  seed?: string;
  footer?: string;
  kind?: DailyCardImageKind;
}

const WIDTH = 900;
const HEIGHT = 500;

export type DailyCardImageKind =
  | 'player'
  | 'team'
  | 'map'
  | 'weapon'
  | 'skin'
  | 'role'
  | 'utility'
  | 'tactic'
  | 'clutch'
  | 'economy'
  | 'shotcall'
  | 'review'
  | 'knife'
  | 'mokoko'
  | 'genshin'
  | 'fact'
  | 'book'
  | 'poem'
  | 'duel'
  | 'quiz'
  | 'training'
  | 'daily'
  | 'movie'
  | 'music'
  | 'history'
  | 'science';

const GLYPHS: Record<string, string[]> = {
  'A': ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  'B': ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  'C': ['01111', '10000', '10000', '10000', '10000', '10000', '01111'],
  'D': ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  'E': ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  'F': ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  'G': ['01111', '10000', '10000', '10011', '10001', '10001', '01111'],
  'H': ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  'I': ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  'J': ['00111', '00010', '00010', '00010', '10010', '10010', '01100'],
  'K': ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  'L': ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  'M': ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  'N': ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  'O': ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  'P': ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  'Q': ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  'R': ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  'S': ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  'T': ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  'U': ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  'V': ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  'W': ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  'X': ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  'Y': ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  'Z': ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  '3': ['11110', '00001', '00001', '01110', '00001', '00001', '11110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '10000', '11110', '00001', '00001', '11110'],
  '6': ['01110', '10000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00001', '01110'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  '#': ['01010', '11111', '01010', '01010', '11111', '01010', '01010'],
  '+': ['00000', '00100', '00100', '11111', '00100', '00100', '00000'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
};

function hashCode(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function hslToRgb(h: number, s: number, l: number): Rgb {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function kindHue(kind: DailyCardImageKind, seed: string): number {
  const base = hashCode(seed || 'daily-cs') % 360;
  const overrides: Partial<Record<DailyCardImageKind, number>> = {
    player: 18,
    team: 204,
    map: 156,
    weapon: 42,
    skin: 294,
    role: 186,
    utility: 32,
    tactic: 116,
    clutch: 352,
    economy: 54,
    shotcall: 132,
    review: 206,
    knife: 260,
    mokoko: 330,
    genshin: 198,
    fact: 48,
    book: 24,
    poem: 172,
    duel: 8,
    quiz: 214,
    training: 96,
    movie: 276,
    music: 162,
    history: 38,
    science: 220,
  };
  return (overrides[kind] ?? base) + (base % 18) - 9;
}

function palette(seed: string, kind: DailyCardImageKind): { bg1: Rgb; bg2: Rgb; accent: Rgb; accent2: Rgb; text: Rgb; muted: Rgb; deep: Rgb; panel: Rgb } {
  const h = ((kindHue(kind, seed) % 360) + 360) % 360;
  const warmKinds = new Set<DailyCardImageKind>(['weapon', 'skin', 'knife', 'duel', 'fact', 'book', 'economy', 'movie']);
  const satBoost = warmKinds.has(kind) ? 0.08 : 0;
  return {
    bg1: hslToRgb((h + 214) % 360, 0.30 + satBoost, 0.10),
    bg2: hslToRgb((h + 18) % 360, 0.42 + satBoost, 0.19),
    accent: hslToRgb(h, 0.72 + satBoost, 0.58),
    accent2: hslToRgb((h + 52) % 360, 0.70 + satBoost, 0.62),
    text: { r: 246, g: 249, b: 242 },
    muted: { r: 180, g: 190, b: 188 },
    deep: hslToRgb((h + 225) % 360, 0.38, 0.07),
    panel: hslToRgb((h + 205) % 360, 0.22, 0.15),
  };
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

/** 绘制放射状光晕圆，多层叠加营造发光质感 */
function drawGlowCircle(buf: Buffer, cx: number, cy: number, radius: number, color: Rgb, intensity = 180): void {
  for (let r = radius + 10; r >= radius; r -= 2) {
    const a = Math.round(intensity * (r - radius) / 10 * 0.5);
    if (a > 0) fillCircle(buf, cx, cy, r, color, a);
  }
  fillCircle(buf, cx, cy, radius, color, intensity);
}

/** 绘制发光矩形边框（三层叠加：外晕、中晕、主边） */
function drawGlowRect(buf: Buffer, x: number, y: number, w: number, h: number, color: Rgb, thickness = 2): void {
  strokeRect(buf, x - 4, y - 4, w + 8, h + 8, color, 18, 1);
  strokeRect(buf, x - 2, y - 2, w + 4, h + 4, color, 52, 1);
  strokeRect(buf, x, y, w, h, color, 220, thickness);
}

/** 绘制十字星光（皮肤/刀卡用） */
function drawSparkle(buf: Buffer, cx: number, cy: number, size: number, color: Rgb, alpha: number): void {
  drawLine(buf, cx - size, cy, cx + size, cy, color, alpha, 2);
  drawLine(buf, cx, cy - size, cx, cy + size, color, alpha, 2);
  const d = Math.round(size * 0.65);
  drawLine(buf, cx - d, cy - d, cx + d, cy + d, color, Math.round(alpha * 0.55), 1);
  drawLine(buf, cx + d, cy - d, cx - d, cy + d, color, Math.round(alpha * 0.55), 1);
}

/** 在面板四角绘制L形装饰（强化设计感） */
function drawCornerMarks(buf: Buffer, x: number, y: number, w: number, h: number, color: Rgb, len = 14, alpha = 210): void {
  const t = 3;
  // 左上
  fillRect(buf, x, y, len, t, color, alpha);
  fillRect(buf, x, y, t, len, color, alpha);
  // 右上
  fillRect(buf, x + w - len, y, len, t, color, alpha);
  fillRect(buf, x + w - t, y, t, len, color, alpha);
  // 左下
  fillRect(buf, x, y + h - t, len, t, color, alpha);
  fillRect(buf, x, y + h - len, t, len, color, alpha);
  // 右下
  fillRect(buf, x + w - len, y + h - t, len, t, color, alpha);
  fillRect(buf, x + w - t, y + h - len, t, len, color, alpha);
}

function setPixel(buf: Buffer, x: number, y: number, color: Rgb, alpha: number = 255): void {
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
  const idx = (y * WIDTH + x) * 4;
  if (alpha >= 255 || buf[idx + 3] === 0) {
    buf[idx] = color.r;
    buf[idx + 1] = color.g;
    buf[idx + 2] = color.b;
    buf[idx + 3] = 255;
    return;
  }
  const t = alpha / 255;
  buf[idx] = Math.round(buf[idx] * (1 - t) + color.r * t);
  buf[idx + 1] = Math.round(buf[idx + 1] * (1 - t) + color.g * t);
  buf[idx + 2] = Math.round(buf[idx + 2] * (1 - t) + color.b * t);
  buf[idx + 3] = 255;
}

function fillRect(buf: Buffer, x: number, y: number, w: number, h: number, color: Rgb, alpha: number = 255): void {
  const x0 = Math.max(0, Math.floor(x));
  const y0 = Math.max(0, Math.floor(y));
  const x1 = Math.min(WIDTH, Math.ceil(x + w));
  const y1 = Math.min(HEIGHT, Math.ceil(y + h));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      setPixel(buf, xx, yy, color, alpha);
    }
  }
}

function fillCircle(buf: Buffer, cx: number, cy: number, radius: number, color: Rgb, alpha: number = 255): void {
  const r2 = radius * radius;
  const x0 = Math.max(0, Math.floor(cx - radius));
  const y0 = Math.max(0, Math.floor(cy - radius));
  const x1 = Math.min(WIDTH - 1, Math.ceil(cx + radius));
  const y1 = Math.min(HEIGHT - 1, Math.ceil(cy + radius));
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= r2) setPixel(buf, x, y, color, alpha);
    }
  }
}

function drawLine(buf: Buffer, x0: number, y0: number, x1: number, y1: number, color: Rgb, alpha = 255, thickness = 2): void {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    fillRect(buf, x - thickness / 2, y - thickness / 2, thickness, thickness, color, alpha);
  }
}

function strokeRect(buf: Buffer, x: number, y: number, w: number, h: number, color: Rgb, alpha = 255, thickness = 2): void {
  fillRect(buf, x, y, w, thickness, color, alpha);
  fillRect(buf, x, y + h - thickness, w, thickness, color, alpha);
  fillRect(buf, x, y, thickness, h, color, alpha);
  fillRect(buf, x + w - thickness, y, thickness, h, color, alpha);
}

function fillTriangle(buf: Buffer, ax: number, ay: number, bx: number, by: number, cx: number, cy: number, color: Rgb, alpha = 255): void {
  const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
  const x1 = Math.min(WIDTH - 1, Math.ceil(Math.max(ax, bx, cx)));
  const y0 = Math.max(0, Math.floor(Math.min(ay, by, cy)));
  const y1 = Math.min(HEIGHT - 1, Math.ceil(Math.max(ay, by, cy)));
  const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (area === 0) return;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const w0 = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
      const w1 = (cx - bx) * (y - by) - (cy - by) * (x - bx);
      const w2 = (ax - cx) * (y - cy) - (ay - cy) * (x - cx);
      if ((w0 >= 0 && w1 >= 0 && w2 >= 0) || (w0 <= 0 && w1 <= 0 && w2 <= 0)) {
        setPixel(buf, x, y, color, alpha);
      }
    }
  }
}

function fillDiamond(buf: Buffer, cx: number, cy: number, rx: number, ry: number, color: Rgb, alpha = 255): void {
  fillTriangle(buf, cx, cy - ry, cx + rx, cy, cx, cy + ry, color, alpha);
  fillTriangle(buf, cx, cy - ry, cx - rx, cy, cx, cy + ry, color, alpha);
}

function drawText(buf: Buffer, text: string, x: number, y: number, scale: number, color: Rgb): void {
  const normalized = normalizeText(text);
  let cursor = Math.floor(x);
  for (const ch of normalized) {
    const glyph = GLYPHS[ch] || GLYPHS[' '];
    for (let row = 0; row < glyph.length; row++) {
      for (let col = 0; col < glyph[row].length; col++) {
        if (glyph[row][col] !== '1') continue;
        fillRect(buf, cursor + col * scale, y + row * scale, Math.max(1, scale - 1), Math.max(1, scale - 1), color);
      }
    }
    cursor += 6 * scale;
  }
}

function measureText(text: string, scale: number): number {
  return normalizeText(text).length * 6 * scale;
}

function normalizeText(text: string): string {
  return (text || '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9 /#:+?.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function displayText(text: string, fallback: string): string {
  return normalizeText(text) || normalizeText(fallback) || 'DAILY';
}

function fitScale(text: string, maxWidth: number, preferred: number, min: number): number {
  for (let scale = preferred; scale >= min; scale--) {
    if (measureText(text, scale) <= maxWidth) return scale;
  }
  return min;
}

function writeUInt32(buf: Buffer, offset: number, value: number): void {
  buf.writeUInt32BE(value >>> 0, offset);
}

let crcTable: number[] | null = null;
function crc32(buf: Buffer): number {
  if (!crcTable) {
    crcTable = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      crcTable[n] = c >>> 0;
    }
  }
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, 'ascii');
  const out = Buffer.alloc(12 + data.length);
  writeUInt32(out, 0, data.length);
  typeBuf.copy(out, 4);
  data.copy(out, 8);
  writeUInt32(out, 8 + data.length, crc32(Buffer.concat([typeBuf, data])));
  return out;
}

function encodePng(rgba: Buffer): Buffer {
  const raw = Buffer.alloc((WIDTH * 4 + 1) * HEIGHT);
  for (let y = 0; y < HEIGHT; y++) {
    const rowStart = y * (WIDTH * 4 + 1);
    raw[rowStart] = 0;
    rgba.copy(raw, rowStart + 1, y * WIDTH * 4, (y + 1) * WIDTH * 4);
  }
  const ihdr = Buffer.alloc(13);
  writeUInt32(ihdr, 0, WIDTH);
  writeUInt32(ihdr, 4, HEIGHT);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 8 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function drawBackground(rgba: Buffer, colors: ReturnType<typeof palette>, seed: string): void {
  const hash = hashCode(seed);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const t = (x / WIDTH) * 0.52 + (y / HEIGHT) * 0.48;
      const base = mix(colors.bg1, colors.bg2, t);
      // 放射状暗角：以偏右偏上为亮点
      const vx = (x - 460) / (WIDTH * 0.68);
      const vy = (y - 220) / (HEIGHT * 0.72);
      const vignette = Math.min(1, vx * vx * 0.85 + vy * vy);
      const shaded = mix(base, colors.deep, Math.min(0.55, vignette * 0.52));
      // 细腻噪声颗粒
      const grain = ((x * 13 + y * 17 + hash) % 31) / 31;
      setPixel(rgba, x, y, mix(shaded, colors.accent, grain * 0.030));
    }
  }
  // 右上角与左下角三角装饰
  fillTriangle(rgba, 580, 0, 900, 0, 900, 260, colors.accent, 30);
  fillTriangle(rgba, 0, 500, 0, 320, 340, 500, colors.accent2, 24);
  // 左上角小三角
  fillTriangle(rgba, 0, 0, 110, 0, 0, 72, colors.accent2, 18);
  // 斜向装饰线（右侧面板区域）
  for (let i = 0; i < 9; i++) {
    const lineY = 48 + i * 54 + (hash % 19);
    const alpha = 24 + (i % 3) * 7;
    drawLine(rgba, 462, lineY, 900, lineY - 90, i % 2 ? colors.accent : colors.accent2, alpha, 2);
  }
  // 底部散点粒子
  for (let i = 0; i < 7; i++) {
    const px = 520 + ((hash + i * 67) % 330);
    const py = 452 + (i % 3) * 10;
    fillCircle(rgba, px, py, 2 + (i % 3), i % 2 ? colors.accent : colors.accent2, 110);
  }
}

function drawTopBars(rgba: Buffer, colors: ReturnType<typeof palette>): void {
  fillRect(rgba, 0, 0, WIDTH, 10, colors.accent);
  fillRect(rgba, 0, HEIGHT - 10, WIDTH, 10, colors.accent2);
  fillRect(rgba, 0, 10, WIDTH, 2, colors.text, 50);
  fillRect(rgba, 0, HEIGHT - 12, WIDTH, 2, colors.text, 40);
  // 顶栏内侧细高光
  fillRect(rgba, 0, 9, WIDTH, 1, colors.accent2, 80);
  fillRect(rgba, 0, HEIGHT - 11, WIDTH, 1, colors.accent, 70);
}

function drawArtPanel(rgba: Buffer, colors: ReturnType<typeof palette>): void {
  // 外发光层（两层叠加）
  fillRect(rgba, 481, 51, 356, 366, colors.accent, 22);
  fillRect(rgba, 482, 52, 354, 364, colors.accent, 38);
  // 主面板
  fillRect(rgba, 484, 54, 350, 360, colors.panel, 96);
  // 双边框：外细框 + 内主框
  strokeRect(rgba, 484, 54, 350, 360, colors.text, 22, 1);
  strokeRect(rgba, 485, 55, 348, 358, colors.accent, 115, 2);
  // 内容区底色
  fillRect(rgba, 506, 78, 306, 312, colors.deep, 42);
  // 内边框左上高光
  fillRect(rgba, 506, 78, 306, 1, colors.text, 28);
  fillRect(rgba, 506, 78, 1, 312, colors.text, 22);
}

function drawMapArt(rgba: Buffer, colors: ReturnType<typeof palette>, seed: string): void {
  drawArtPanel(rgba, colors);
  const hash = hashCode(seed);
  const rooms = [
    [546, 106, 76, 64],
    [650, 96, 120, 74],
    [565, 205, 96, 92],
    [704, 220, 82, 94],
    [604, 330, 170, 28],
  ];
  for (const [x, y, w, h] of rooms) {
    strokeRect(rgba, x, y, w, h, (hash + x) % 2 ? colors.accent : colors.accent2, 140, 4);
  }
  drawLine(rgba, 622, 138, 650, 132, colors.muted, 130, 4);
  drawLine(rgba, 661, 251, 704, 267, colors.muted, 130, 4);
  drawLine(rgba, 610, 297, 630, 330, colors.muted, 130, 4);
  fillCircle(rgba, 584, 138, 8, colors.accent2, 210);
  fillCircle(rgba, 744, 268, 8, colors.accent, 210);
}

function drawWeaponArt(rgba: Buffer, colors: ReturnType<typeof palette>, seed: string, skin = false): void {
  drawArtPanel(rgba, colors);
  const y = 250 + (hashCode(seed) % 24) - 12;
  const body = skin ? colors.accent2 : colors.accent;
  const trim = skin ? colors.accent : colors.accent2;
  fillRect(rgba, 476, y, 260, 28, body, 210);
  fillRect(rgba, 708, y - 10, 102, 14, trim, 210);
  fillRect(rgba, 540, y + 28, 44, 86, body, 190);
  fillRect(rgba, 454, y + 12, 42, 34, colors.muted, 150);
  fillRect(rgba, 615, y - 30, 92, 14, colors.muted, 120);
  fillTriangle(rgba, 490, y - 18, 560, y - 18, 524, y + 8, trim, skin ? 160 : 70);
  fillDiamond(rgba, 668, y + 14, 34, 18, trim, skin ? 175 : 70);
  if (skin) {
    for (let x = 496; x < 720; x += 44) drawLine(rgba, x, y - 12, x + 38, y + 38, colors.deep, 95, 4);
    // 皮肤卡专属：星光粒子
    const hash = hashCode(seed);
    for (let i = 0; i < 9; i++) {
      const sx = 510 + ((hash + i * 53) % 280);
      const sy = 88 + ((hash >> 2) + i * 37) % 268;
      const sz = 5 + (i % 3) * 4;
      drawSparkle(rgba, sx, sy, sz, i % 2 ? colors.accent : colors.text, 120 + (i % 3) * 22);
    }
  }
  drawLine(rgba, 480, y + 70, 812, y - 70, colors.text, 45, 1);
  for (let x = 468; x < 824; x += 36) fillRect(rgba, x, y + 58, 18, 2, trim, 170);
}

function drawKnifeArt(rgba: Buffer, colors: ReturnType<typeof palette>, seed: string): void {
  drawArtPanel(rgba, colors);
  const hash = hashCode(seed);
  const cy = 234 + (hash % 20) - 10;
  // 刀刃主体
  fillTriangle(rgba, 490, cy - 16, 790, cy - 4, 490, cy + 16, colors.accent, 220);
  // 刀背线
  drawLine(rgba, 490, cy - 16, 790, cy - 4, colors.text, 90, 2);
  // 护手
  fillRect(rgba, 484, cy - 28, 14, 56, colors.muted, 200);
  fillRect(rgba, 478, cy - 20, 12, 40, colors.accent2, 180);
  // 刀柄
  fillRect(rgba, 456, cy - 14, 32, 28, colors.panel, 220);
  strokeRect(rgba, 456, cy - 14, 32, 28, colors.accent2, 140, 2);
  for (let i = 0; i < 4; i++) fillRect(rgba, 460, cy - 10 + i * 7, 24, 3, colors.muted, 150);
  // 发光轮廓
  drawLine(rgba, 490, cy + 16, 790, cy - 4, colors.accent2, 100, 2);
  // 星光粒子
  for (let i = 0; i < 7; i++) {
    const sx = 510 + ((hash + i * 71) % 270);
    const sy = 90 + ((hash >> 3) + i * 41) % 280;
    const sz = 4 + (i % 3) * 3;
    drawSparkle(rgba, sx, sy, sz, i % 2 ? colors.accent : colors.accent2, 100 + (i % 3) * 25);
  }
  // 光芒扫线
  drawLine(rgba, 560, cy - 16, 760, cy - 40, colors.text, 55, 1);
  drawLine(rgba, 620, cy - 12, 780, cy - 28, colors.text, 35, 1);
}

function drawTeamArt(rgba: Buffer, colors: ReturnType<typeof palette>, seed: string): void {
  drawArtPanel(rgba, colors);
  fillRect(rgba, 574, 80, 14, 304, colors.muted, 170);
  drawLine(rgba, 586, 96, 784, 132, colors.accent, 230, 8);
  drawLine(rgba, 586, 218, 784, 132, colors.accent2, 230, 8);
  fillRect(rgba, 594, 104, 188, 116, colors.panel, 190);
  strokeRect(rgba, 594, 104, 188, 116, colors.accent, 140, 3);
  fillCircle(rgba, 690, 162, 36, colors.accent2, 160);
  fillDiamond(rgba, 690, 162, 52, 38, colors.text, 35);
  for (let i = 0; i < 5; i++) {
    const x = 540 + i * 58 + (hashCode(seed) % 12);
    fillRect(rgba, x, 304 + (i % 2) * 10, 38, 42, i % 2 ? colors.accent : colors.accent2, 150);
  }
}

function drawPlayerArt(rgba: Buffer, colors: ReturnType<typeof palette>, seed: string): void {
  drawArtPanel(rgba, colors);
  const hash = hashCode(seed);
  fillCircle(rgba, 662, 154, 52, colors.accent, 165);
  fillRect(rgba, 604, 214, 118, 150, colors.accent2, 145);
  fillTriangle(rgba, 556, 364, 604, 214, 604, 364, colors.panel, 185);
  fillTriangle(rgba, 722, 214, 784, 364, 722, 364, colors.panel, 185);
  drawLine(rgba, 522, 168 + (hash % 36), 806, 118 + (hash % 48), colors.text, 50, 2);
  for (let i = 0; i < 6; i++) fillCircle(rgba, 542 + i * 52, 344 - (i % 3) * 28, 7, i % 2 ? colors.accent : colors.accent2, 180);
}

function drawUtilityArt(rgba: Buffer, colors: ReturnType<typeof palette>, seed: string): void {
  drawArtPanel(rgba, colors);
  const hash = hashCode(seed);
  fillCircle(rgba, 670, 242, 74, colors.accent, 155);
  fillCircle(rgba, 670, 242, 38, colors.deep, 180);
  for (let i = 0; i < 18; i++) {
    const angle = (Math.PI * 2 * i) / 18 + (hash % 17) / 30;
    const x0 = 670 + Math.cos(angle) * 52;
    const y0 = 242 + Math.sin(angle) * 52;
    const x1 = 670 + Math.cos(angle) * (110 + (i % 3) * 22);
    const y1 = 242 + Math.sin(angle) * (110 + (i % 3) * 22);
    drawLine(rgba, x0, y0, x1, y1, i % 2 ? colors.accent : colors.accent2, 110, 3);
  }
}

function drawTacticArt(rgba: Buffer, colors: ReturnType<typeof palette>, seed: string): void {
  drawArtPanel(rgba, colors);
  const points = [
    [570, 130],
    [748, 118],
    [790, 260],
    [650, 350],
    [540, 280],
  ];
  for (let i = 0; i < points.length; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[(i + 1) % points.length];
    drawLine(rgba, x0, y0, x1, y1, colors.accent, 150, 3);
  }
  for (const [x, y] of points) {
    fillCircle(rgba, x, y, 17, colors.accent2, 210);
    fillCircle(rgba, x, y, 7, colors.text, 190);
  }
  const hash = hashCode(seed);
  drawLine(rgba, 570, 130, 650 + (hash % 50), 350, colors.text, 80, 2);
  drawLine(rgba, 748, 118, 540, 280, colors.text, 70, 2);
}

function drawClutchArt(rgba: Buffer, colors: ReturnType<typeof palette>, seed: string): void {
  drawArtPanel(rgba, colors);
  const hash = hashCode(seed);
  fillCircle(rgba, 670, 240, 118, colors.deep, 150);
  strokeRect(rgba, 570, 138, 204, 204, colors.accent, 120, 3);
  drawText(rgba, '1V', 596, 188, 12, colors.text);
  drawText(rgba, String(2 + (hash % 4)), 704, 188, 12, colors.accent2);
  for (let i = 0; i < 5; i++) {
    const x = 552 + i * 62;
    const y = 330 - ((hash + i * 19) % 120);
    fillCircle(rgba, x, y, i === 0 ? 14 : 8, i === 0 ? colors.accent2 : colors.muted, 190);
  }
}

function drawRoleArt(rgba: Buffer, colors: ReturnType<typeof palette>, seed: string): void {
  drawArtPanel(rgba, colors);
  const hash = hashCode(seed);
  const lanes = [558, 610, 662, 714, 766];
  for (let i = 0; i < lanes.length; i++) {
    drawLine(rgba, lanes[i], 350, lanes[i] + ((hash + i * 17) % 72) - 36, 112, i % 2 ? colors.accent2 : colors.accent, 120, 5);
    fillCircle(rgba, lanes[i], 350, 14, colors.panel, 210);
  }
  fillDiamond(rgba, 670, 220, 60, 48, colors.accent, 130);
  drawText(rgba, 'POS', 612, 204, 8, colors.text);
}

function drawEconomyArt(rgba: Buffer, colors: ReturnType<typeof palette>, seed: string): void {
  drawArtPanel(rgba, colors);
  const hash = hashCode(seed);
  fillRect(rgba, 538, 112, 266, 226, colors.panel, 172);
  strokeRect(rgba, 538, 112, 266, 226, colors.accent, 120, 3);
  const rows = ['BUY', 'SAVE', 'ECO'];
  for (let i = 0; i < rows.length; i++) {
    const y = 142 + i * 62;
    const width = 96 + ((hash >> (i * 3)) % 86);
    fillRect(rgba, 570, y + 8, 186, 20, colors.deep, 155);
    fillRect(rgba, 570, y + 8, width, 20, i === 1 ? colors.accent2 : colors.accent, 205);
    drawText(rgba, rows[i], 584, y - 10, 5, colors.text);
    fillCircle(rgba, 770, y + 18, 18, colors.accent2, 150);
    fillCircle(rgba, 770, y + 18, 11, colors.deep, 170);
  }
  for (let i = 0; i < 7; i++) {
    const x = 552 + i * 34;
    const y = 348 - (i % 3) * 16;
    fillCircle(rgba, x, y, 15, i % 2 ? colors.accent : colors.accent2, 132);
    fillCircle(rgba, x, y, 8, colors.deep, 90);
  }
}

function drawShotcallArt(rgba: Buffer, colors: ReturnType<typeof palette>, seed: string): void {
  drawArtPanel(rgba, colors);
  const hash = hashCode(seed);
  const nodes = [
    [564, 152, 'A'],
    [696, 112, 'B'],
    [784, 214, 'X'],
    [700, 338, 'C'],
    [546, 292, 'D'],
  ] as const;
  for (let i = 0; i < nodes.length; i++) {
    const [x0, y0] = nodes[i];
    const [x1, y1] = nodes[(i + 1 + (hash % 2)) % nodes.length];
    drawLine(rgba, x0, y0, x1, y1, i % 2 ? colors.accent2 : colors.accent, 138, 4);
    const angle = Math.atan2(y1 - y0, x1 - x0);
    fillTriangle(
      rgba,
      x1,
      y1,
      x1 - Math.cos(angle - 0.55) * 18,
      y1 - Math.sin(angle - 0.55) * 18,
      x1 - Math.cos(angle + 0.55) * 18,
      y1 - Math.sin(angle + 0.55) * 18,
      i % 2 ? colors.accent2 : colors.accent,
      142,
    );
  }
  for (const [x, y, label] of nodes) {
    fillCircle(rgba, x, y, 24, colors.deep, 210);
    fillCircle(rgba, x, y, 16, colors.accent, 165);
    drawText(rgba, label, x - 12, y - 16, 5, colors.text);
  }
  fillRect(rgba, 588, 374, 172, 24, colors.deep, 145);
  drawText(rgba, 'CALL', 618, 368, 5, colors.accent2);
}

function drawReviewArt(rgba: Buffer, colors: ReturnType<typeof palette>, seed: string): void {
  drawArtPanel(rgba, colors);
  const hash = hashCode(seed);
  fillRect(rgba, 528, 112, 280, 172, colors.deep, 126);
  strokeRect(rgba, 528, 112, 280, 172, colors.accent2, 98, 3);
  drawText(rgba, 'VOD', 584, 150, 10, colors.text);
  drawLine(rgba, 554, 328, 790, 328, colors.muted, 120, 5);
  for (let i = 0; i < 6; i++) {
    const x = 558 + i * 46;
    const high = i === hash % 6;
    fillCircle(rgba, x, 328, high ? 15 : 9, high ? colors.accent : colors.accent2, high ? 230 : 150);
    drawLine(rgba, x, 328, x, 294 - (i % 2) * 34, high ? colors.accent : colors.muted, high ? 128 : 70, 2);
  }
  const cursor = 558 + (hash % 6) * 46;
  fillTriangle(rgba, cursor - 12, 360, cursor + 12, 360, cursor, 338, colors.accent, 210);
  fillRect(rgba, 548, 380, 230, 18, colors.panel, 150);
  fillRect(rgba, 548, 380, 72 + (hash % 128), 18, colors.accent2, 170);
}

function drawBookArt(rgba: Buffer, colors: ReturnType<typeof palette>, kind: DailyCardImageKind): void {
  drawArtPanel(rgba, colors);
  const paper = kind === 'poem' ? { r: 232, g: 236, b: 214 } : { r: 226, g: 218, b: 198 };
  fillRect(rgba, 520, 88, 250, 300, paper, 230);
  fillRect(rgba, 546, 112, 250, 300, mix(paper, colors.accent2, 0.08), 225);
  strokeRect(rgba, 546, 112, 250, 300, colors.deep, 90, 3);
  for (let y = 156; y <= 342; y += 36) fillRect(rgba, 586, y, 170, 4, mix(colors.deep, colors.accent, 0.4), 110);
  if (kind === 'poem') {
    fillCircle(rgba, 778, 112, 52, colors.accent, 70);
    drawLine(rgba, 590, 354, 728, 226, colors.accent2, 105, 3);
  }
}

function drawCharacterArt(rgba: Buffer, colors: ReturnType<typeof palette>, seed: string, kind: DailyCardImageKind): void {
  drawArtPanel(rgba, colors);
  const hash = hashCode(seed);
  const frame = kind === 'genshin' ? colors.accent : colors.accent2;
  fillRect(rgba, 560, 92, 210, 300, colors.panel, 170);
  strokeRect(rgba, 560, 92, 210, 300, frame, 120, 4);
  fillCircle(rgba, 666, 178, 58, colors.accent, 150);
  fillRect(rgba, 610, 236, 112, 126, colors.accent2, 135);
  if (kind === 'genshin') {
    fillDiamond(rgba, 666, 178, 82, 62, colors.text, 28);
    for (let i = 0; i < 7; i++) {
      const angle = (Math.PI * 2 * i) / 7;
      fillCircle(rgba, 666 + Math.cos(angle) * 104, 178 + Math.sin(angle) * 82, 9, frame, 110);
    }
  } else {
    drawLine(rgba, 560, 116, 770, 368, colors.accent, 72, 5);
    drawLine(rgba, 770, 116, 560, 368, colors.accent2, 72, 5);
  }
  for (let i = 0; i < 7; i++) {
    const x = 552 + ((hash + i * 47) % 260);
    const y = 74 + ((hash + i * 31) % 330);
    fillCircle(rgba, x, y, 8 + (i % 3) * 4, i % 2 ? colors.accent : colors.accent2, 105);
  }
}

function drawDuelArt(rgba: Buffer, colors: ReturnType<typeof palette>): void {
  drawArtPanel(rgba, colors);
  drawLine(rgba, 548, 346, 802, 122, colors.accent, 220, 11);
  drawLine(rgba, 554, 122, 808, 346, colors.accent2, 220, 11);
  fillCircle(rgba, 680, 236, 86, colors.deep, 130);
  strokeRect(rgba, 594, 150, 174, 174, colors.text, 50, 2);
  drawText(rgba, 'VS', 638, 210, 10, colors.text);
}

function drawDailyArt(rgba: Buffer, colors: ReturnType<typeof palette>, kind: DailyCardImageKind, seed: string): void {
  switch (kind) {
    case 'map':
      drawMapArt(rgba, colors, seed);
      break;
    case 'weapon':
      drawWeaponArt(rgba, colors, seed);
      break;
    case 'knife':
      drawKnifeArt(rgba, colors, seed);
      break;
    case 'skin':
      drawWeaponArt(rgba, colors, seed, true);
      break;
    case 'player':
      drawPlayerArt(rgba, colors, seed);
      break;
    case 'team':
      drawTeamArt(rgba, colors, seed);
      break;
    case 'clutch':
      drawClutchArt(rgba, colors, seed);
      break;
    case 'utility':
      drawUtilityArt(rgba, colors, seed);
      break;
    case 'tactic':
    case 'training':
    case 'quiz':
      drawTacticArt(rgba, colors, seed);
      break;
    case 'economy':
      drawEconomyArt(rgba, colors, seed);
      break;
    case 'shotcall':
      drawShotcallArt(rgba, colors, seed);
      break;
    case 'review':
      drawReviewArt(rgba, colors, seed);
      break;
    case 'role':
      drawRoleArt(rgba, colors, seed);
      break;
    case 'book':
    case 'poem':
    case 'fact':
    case 'movie':
    case 'music':
    case 'history':
    case 'science':
      drawBookArt(rgba, colors, kind);
      break;
    case 'mokoko':
    case 'genshin':
      drawCharacterArt(rgba, colors, seed, kind);
      break;
    case 'duel':
      drawDuelArt(rgba, colors);
      break;
    default:
      drawUtilityArt(rgba, colors, seed);
      break;
  }
}

export function buildDailyCardImageDataUrl(options: DailyCardImageOptions): string {
  const kind = options.kind || 'daily';
  const colors = palette(`${options.seed || ''}:${options.label}`, kind);
  const rgba = Buffer.alloc(WIDTH * HEIGHT * 4);

  drawBackground(rgba, colors, `${options.seed}:${options.label}`);
  drawTopBars(rgba, colors);

  // 左侧文字面板
  fillRect(rgba, 48, 54, 390, 360, colors.panel, 188);
  strokeRect(rgba, 48, 54, 390, 360, colors.accent, 95, 3);
  fillRect(rgba, 70, 76, 346, 316, colors.deep, 95);
  // 左面板内边框高光
  fillRect(rgba, 70, 76, 346, 1, colors.text, 25);
  fillRect(rgba, 70, 76, 1, 316, colors.text, 20);

  drawDailyArt(rgba, colors, kind, `${options.seed}:${options.label}`);

  // 四角装饰标记
  drawCornerMarks(rgba, 48, 54, 390, 360, colors.accent2, 14, 200);
  drawCornerMarks(rgba, 484, 54, 350, 360, colors.accent, 12, 185);

  const title = displayText(options.title || 'DAILY CS', 'DAILY CS');
  drawText(rgba, title, 76, 84, fitScale(title, 320, 5, 3), colors.muted);

  const label = displayText(options.label, options.seed || 'CS CARD');
  const labelScale = fitScale(label, 334, 11, 5);
  drawText(rgba, label, 76, 164, labelScale, colors.text);

  const subtitle = displayText(options.subtitle || '', '');
  if (subtitle) {
    const subScale = fitScale(subtitle, 330, 4, 3);
    drawText(rgba, subtitle, 78, 294, subScale, colors.muted);
  }

  if (options.score) {
    const scoreText = displayText(options.score, 'SCORE');
    // 分数前绘制小装饰线
    fillRect(rgba, 76, 338, 30, 2, colors.accent2, 180);
    drawText(rgba, scoreText, 76, 346, fitScale(scoreText, 330, 5, 3), colors.accent2);
  }

  // 底部页脚区：分隔线 + 文字
  fillRect(rgba, 70, 424, 346, 1, colors.muted, 70);
  drawText(rgba, displayText(options.footer || 'WANJIER DAILY', 'WANJIER DAILY'), 76, 434, 4, colors.muted);

  // 右侧面板散点装饰（更丰富：矩形 + 圆点混合）
  const hash = hashCode(`${options.seed}:${options.label}`);
  for (let i = 0; i < 20; i++) {
    const x = 490 + ((hash + i * 37) % 336);
    const y = 68 + ((hash >> 3) + i * 51) % 348;
    if (i % 4 === 0) {
      // 小圆点
      fillCircle(rgba, x, y, 3 + (i % 3), i % 2 ? colors.accent : colors.accent2, 130);
    } else {
      const w = 10 + (i % 4) * 7;
      const h = i % 6 === 0 ? w : 3;
      fillRect(rgba, x, y, w, h, i % 3 === 0 ? colors.accent : (i % 3 === 1 ? colors.accent2 : colors.muted), 145 + (i % 3) * 12);
    }
  }

  const png = encodePng(rgba);
  return `data:image/png;base64,${png.toString('base64')}`;
}
