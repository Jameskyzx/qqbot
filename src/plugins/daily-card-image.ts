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
}

const WIDTH = 900;
const HEIGHT = 500;

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

function palette(seed: string): { bg1: Rgb; bg2: Rgb; accent: Rgb; accent2: Rgb; text: Rgb; muted: Rgb } {
  const h = hashCode(seed || 'daily-cs') % 360;
  return {
    bg1: hslToRgb((h + 210) % 360, 0.35, 0.12),
    bg2: hslToRgb((h + 20) % 360, 0.45, 0.2),
    accent: hslToRgb(h, 0.72, 0.58),
    accent2: hslToRgb((h + 55) % 360, 0.74, 0.62),
    text: { r: 246, g: 249, b: 242 },
    muted: { r: 180, g: 190, b: 188 },
  };
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
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

export function buildDailyCardImageDataUrl(options: DailyCardImageOptions): string {
  const colors = palette(`${options.seed || ''}:${options.label}`);
  const rgba = Buffer.alloc(WIDTH * HEIGHT * 4);

  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const t = (x / WIDTH) * 0.65 + (y / HEIGHT) * 0.35;
      const base = mix(colors.bg1, colors.bg2, t);
      const vignette = Math.min(1, Math.hypot((x - WIDTH / 2) / WIDTH, (y - HEIGHT / 2) / HEIGHT) * 1.5);
      setPixel(rgba, x, y, mix(base, { r: 8, g: 10, b: 12 }, vignette * 0.35));
    }
  }

  fillRect(rgba, 0, 0, WIDTH, 12, colors.accent);
  fillRect(rgba, 0, HEIGHT - 12, WIDTH, 12, colors.accent2);
  for (let x = 0; x < WIDTH; x += 42) fillRect(rgba, x, 42, 1, HEIGHT - 84, mix(colors.accent, colors.bg1, 0.6), 190);
  for (let y = 70; y < HEIGHT - 40; y += 42) fillRect(rgba, 42, y, WIDTH - 84, 1, mix(colors.accent2, colors.bg1, 0.68), 170);
  fillRect(rgba, 46, 48, WIDTH - 92, HEIGHT - 96, { r: 14, g: 20, b: 24 }, 190);
  fillRect(rgba, 58, 60, WIDTH - 116, HEIGHT - 120, { r: 20, g: 27, b: 30 }, 160);

  const title = normalizeText(options.title || 'DAILY CS');
  drawText(rgba, title, 72, 78, 5, colors.muted);

  const label = normalizeText(options.label || 'CS CARD') || normalizeText(options.seed || 'CS CARD');
  const labelScale = fitScale(label, WIDTH - 150, 14, 6);
  drawText(rgba, label, Math.max(72, Math.floor((WIDTH - measureText(label, labelScale)) / 2)), 170, labelScale, colors.text);

  const subtitle = normalizeText(options.subtitle || '');
  if (subtitle) {
    const subScale = fitScale(subtitle, WIDTH - 160, 5, 3);
    drawText(rgba, subtitle, Math.max(74, Math.floor((WIDTH - measureText(subtitle, subScale)) / 2)), 310, subScale, colors.muted);
  }

  if (options.score) {
    drawText(rgba, normalizeText(options.score), 72, 382, 6, colors.accent2);
  }
  drawText(rgba, normalizeText(options.footer || 'WANJIER DAILY'), 72, 438, 4, colors.muted);

  const hash = hashCode(`${options.seed}:${options.label}`);
  for (let i = 0; i < 24; i++) {
    const x = 650 + ((hash + i * 37) % 230);
    const y = 76 + ((hash >> 3) + i * 53) % 320;
    fillRect(rgba, x, y, 6 + (i % 3) * 3, 3, i % 2 ? colors.accent : colors.accent2, 210);
  }

  const png = encodePng(rgba);
  return `data:image/png;base64,${png.toString('base64')}`;
}
