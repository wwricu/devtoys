/**
 * QR Code encoder (ISO/IEC 18004) — numeric, alphanumeric and byte modes,
 * versions 1-40, error correction levels L/M/Q/H, automatic mask selection.
 */

export type EcLevel = "L" | "M" | "Q" | "H";

const LEVEL_INDEX: Record<EcLevel, number> = { L: 0, M: 1, Q: 2, H: 3 };

/** Total codewords (data + error correction) per version, index = version. */
const TOTAL_CODEWORDS = [
  0, 26, 44, 70, 100, 134, 172, 196, 242, 292, 346, 404, 466, 532, 581, 655,
  733, 815, 901, 991, 1085, 1156, 1258, 1364, 1474, 1588, 1706, 1828, 1921,
  2051, 2185, 2323, 2465, 2611, 2761, 2876, 3034, 3196, 3362, 3532, 3706,
];

/** Number of error correction blocks, rows of four (L, M, Q, H) per version. */
const EC_BLOCKS = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 1, 2, 2, 4, 1, 2, 4, 4,
  2, 4, 4, 4, 2, 4, 6, 5, 2, 4, 6, 6, 2, 5, 8, 8, 4, 5, 8, 8,
  4, 5, 8, 11, 4, 8, 10, 11, 4, 9, 12, 16, 4, 9, 16, 16, 6, 10, 12, 18,
  6, 10, 17, 16, 6, 11, 16, 19, 6, 13, 18, 21, 7, 14, 21, 25,
  8, 16, 20, 25, 8, 17, 23, 25, 9, 17, 23, 34, 9, 18, 25, 30,
  10, 20, 27, 32, 12, 21, 29, 35, 12, 23, 34, 37, 12, 25, 34, 40,
  13, 26, 35, 42, 14, 28, 38, 45, 15, 29, 40, 48, 16, 31, 43, 51,
  17, 33, 45, 54, 18, 35, 48, 57, 19, 37, 51, 60, 19, 38, 53, 63,
  20, 40, 56, 66, 21, 43, 59, 70, 22, 45, 62, 74, 24, 47, 65, 77,
  25, 49, 68, 81,
];

/** Error correction codewords in total, rows of four (L, M, Q, H) per version. */
const EC_CODEWORDS = [
  7, 10, 13, 17, 10, 16, 22, 28, 15, 26, 36, 44, 20, 36, 52, 64,
  26, 48, 72, 88, 36, 64, 96, 112, 40, 72, 108, 130, 48, 88, 132, 156,
  60, 110, 160, 192, 72, 130, 192, 224, 80, 150, 224, 264, 96, 176, 260, 308,
  104, 198, 288, 352, 120, 216, 320, 384, 132, 240, 360, 432, 144, 280, 408, 480,
  168, 308, 448, 532, 180, 338, 504, 588, 196, 364, 546, 650, 224, 416, 600, 700,
  224, 442, 644, 750, 252, 476, 690, 816, 270, 504, 750, 900, 300, 560, 810, 960,
  312, 588, 870, 1050, 336, 644, 952, 1110, 360, 700, 1020, 1200, 390, 728, 1050, 1260,
  420, 784, 1140, 1350, 450, 812, 1200, 1440, 480, 868, 1290, 1530, 510, 924, 1350, 1620,
  540, 980, 1440, 1710, 570, 1036, 1530, 1800, 570, 1064, 1590, 1890, 600, 1120, 1680, 1980,
  630, 1204, 1770, 2100, 660, 1260, 1860, 2220, 720, 1316, 1950, 2310, 750, 1372, 2040, 2430,
];

function blocksCount(version: number, level: EcLevel): number {
  return EC_BLOCKS[(version - 1) * 4 + LEVEL_INDEX[level]];
}

function ecCodewords(version: number, level: EcLevel): number {
  return EC_CODEWORDS[(version - 1) * 4 + LEVEL_INDEX[level]];
}

function dataCodewords(version: number, level: EcLevel): number {
  return TOTAL_CODEWORDS[version] - ecCodewords(version, level);
}

/* ---------------------------------------------------------------- GF(256) */

const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);

function buildField(): void {
  let value = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = value;
    LOG[value] = i;
    value <<= 1;
    if (value & 0x100) value ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
}
buildField();

function multiply(a: number, b: number): number {
  return a === 0 || b === 0 ? 0 : EXP[LOG[a] + LOG[b]];
}

function generatorPolynomial(degree: number): Uint8Array {
  let poly = new Uint8Array([1]);
  for (let i = 0; i < degree; i++) {
    const next = new Uint8Array(poly.length + 1);
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j];
      next[j + 1] ^= multiply(poly[j], EXP[i]);
    }
    poly = next;
  }
  return poly;
}

function remainder(data: Uint8Array, generator: Uint8Array): Uint8Array {
  const out = new Uint8Array(generator.length - 1);
  for (const byte of data) {
    const factor = byte ^ out[0];
    out.copyWithin(0, 1);
    out[out.length - 1] = 0;
    for (let i = 0; i < out.length; i++) out[i] ^= multiply(generator[i + 1], factor);
  }
  return out;
}

/* ------------------------------------------------------------------- modes */

type Mode = "numeric" | "alphanumeric" | "byte";

const ALPHANUMERIC = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function modeOf(text: string): Mode {
  if (text.length > 0 && /^[0-9]+$/.test(text)) return "numeric";
  if (text.length > 0 && [...text].every((c) => ALPHANUMERIC.includes(c)))
    return "alphanumeric";
  return "byte";
}

function countBits(mode: Mode, version: number): number {
  const group = version <= 9 ? 0 : version <= 26 ? 1 : 2;
  if (mode === "numeric") return [10, 12, 14][group];
  if (mode === "alphanumeric") return [9, 11, 13][group];
  return [8, 16, 16][group];
}

function lengthOf(mode: Mode, text: string): number {
  if (mode === "byte") return utf8(text).length;
  return text.length;
}

function payloadBits(mode: Mode, length: number, version: number): number {
  let bits = 4 + countBits(mode, version);
  if (mode === "numeric")
    bits += Math.floor(length / 3) * 10 + [0, 4, 7][length % 3];
  else if (mode === "alphanumeric")
    bits += Math.floor(length / 2) * 11 + (length % 2) * 6;
  else bits += length * 8;
  return bits;
}

/** Largest payload that still fits, in characters of the given mode. */
export function capacity(mode: Mode, version: number, level: EcLevel): number {
  const available = dataCodewords(version, level) * 8 - 4 - countBits(mode, version);
  if (mode === "byte") return Math.floor(available / 8);
  if (mode === "numeric") {
    const groups = Math.floor(available / 10);
    const rest = available % 10;
    return groups * 3 + (rest >= 7 ? 2 : rest >= 4 ? 1 : 0);
  }
  return Math.floor(available / 11) * 2 + (available % 11 >= 6 ? 1 : 0);
}

/* ------------------------------------------------------------- bit stream */

class Bits {
  private readonly out: number[] = [];

  put(value: number, length: number): void {
    for (let i = length - 1; i >= 0; i--) this.out.push((value >>> i) & 1);
  }

  get length(): number {
    return this.out.length;
  }

  /** Padded to whole codewords, ready for block splitting. */
  codewords(fillTo: number): Uint8Array {
    const bytes = new Uint8Array(fillTo);
    let i = 0;
    for (; i < this.out.length; i++) bytes[i >> 3] |= this.out[i] << (7 - (i & 7));
    const used = Math.ceil(this.out.length / 8);
    for (let j = used; j < fillTo; j++) bytes[j] = (j - used) % 2 === 0 ? 0xec : 0x11;
    return bytes;
  }
}

function writePayload(bits: putter, mode: Mode, text: string, version: number) {
  const put = (value: number, length: number) => bits.put(value, length);
  put(mode === "numeric" ? 1 : mode === "alphanumeric" ? 2 : 4, 4);
  put(lengthOf(mode, text), countBits(mode, version));
  if (mode === "numeric") {
    for (let i = 0; i < text.length; i += 3) {
      const chunk = text.slice(i, i + 3);
      put(Number(chunk), [0, 4, 7, 10][chunk.length]);
    }
  } else if (mode === "alphanumeric") {
    for (let i = 0; i < text.length; i += 2) {
      if (i + 1 < text.length)
        put(ALPHANUMERIC.indexOf(text[i]) * 45 + ALPHANUMERIC.indexOf(text[i + 1]), 11);
      else put(ALPHANUMERIC.indexOf(text[i]), 6);
    }
  } else {
    for (const byte of utf8(text)) put(byte, 8);
  }
}

type putter = { put(value: number, length: number): void };

function interleave(data: Uint8Array, version: number, level: EcLevel): Uint8Array {
  const blocks = blocksCount(version, level);
  const ecPerBlock = ecCodewords(version, level) / blocks;
  const short = Math.floor(data.length / blocks);
  const long = data.length % blocks;
  const generator = generatorPolynomial(ecPerBlock);

  const chunks: Uint8Array[] = [];
  const checks: Uint8Array[] = [];
  const shortBlocks = blocks - long;
  for (let i = 0; i < blocks; i++) {
    const start = i * short + Math.max(0, i - shortBlocks);
    const length = short + (i >= shortBlocks ? 1 : 0);
    const slice = data.subarray(start, start + length);
    chunks.push(slice);
    checks.push(remainder(slice, generator));
  }

  const out = new Uint8Array(data.length + ecPerBlock * blocks);
  let at = 0;
  for (let i = 0; i <= short; i++)
    for (let b = 0; b < blocks; b++)
      if (i < chunks[b].length) out[at++] = chunks[b][i];
  for (let i = 0; i < ecPerBlock; i++)
    for (let b = 0; b < blocks; b++) out[at++] = checks[b][i];
  return out;
}

/* ----------------------------------------------------------------- matrix */

const MASKS: ((row: number, col: number) => boolean)[] = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (_, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

class Grid {
  readonly size: number;
  readonly modules: Uint8Array;
  readonly fixed: Uint8Array;

  constructor(readonly version: number) {
    this.size = 4 * version + 17;
    this.modules = new Uint8Array(this.size * this.size);
    this.fixed = new Uint8Array(this.size * this.size);
  }

  at(row: number, col: number): number {
    return this.modules[row * this.size + col];
  }

  isFixed(row: number, col: number): boolean {
    return this.fixed[row * this.size + col] === 1;
  }

  set(row: number, col: number, dark: boolean, keep = false): void {
    if (row < 0 || col < 0 || row >= this.size || col >= this.size) return;
    const i = row * this.size + col;
    this.modules[i] = dark ? 1 : 0;
    if (keep) this.fixed[i] = 1;
  }

  /** Function pattern module: dark now, never touched by data or mask. */
  setFunction(row: number, col: number, dark: boolean): void {
    this.set(row, col, dark, true);
  }

  drawFinders(): void {
    const corners = [
      [0, 0],
      [0, this.size - 7],
      [this.size - 7, 0],
    ];
    for (const [top, left] of corners) {
      for (let dr = -1; dr <= 7; dr++) {
        for (let dc = -1; dc <= 7; dc++) {
          const inside = dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6;
          const ring = Math.max(Math.abs(dr - 3), Math.abs(dc - 3));
          this.setFunction(top + dr, left + dc, inside ? ring !== 2 : false);
        }
      }
    }
  }

  drawTiming(): void {
    for (let i = 8; i < this.size - 8; i++) {
      const dark = i % 2 === 0;
      this.setFunction(6, i, dark);
      this.setFunction(i, 6, dark);
    }
  }

  drawAlignment(): void {
    if (this.version < 2) return;
    const count = Math.floor(this.version / 7) + 2;
    const step =
      this.size === 145 ? 26 : Math.ceil((this.size - 13) / (2 * count - 2)) * 2;
    const coords: number[] = [this.size - 7];
    for (let i = 1; i < count - 1; i++) coords[i] = coords[i - 1] - step;
    coords.push(6);
    coords.reverse();

    const last = coords.length - 1;
    for (let i = 0; i <= last; i++) {
      for (let j = 0; j <= last; j++) {
        if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0))
          continue;
        for (let dr = -2; dr <= 2; dr++) {
          for (let dc = -2; dc <= 2; dc++) {
            const ring = Math.max(Math.abs(dr), Math.abs(dc));
            this.setFunction(coords[i] + dr, coords[j] + dc, ring !== 1);
          }
        }
      }
    }
  }

  drawReserve(levelBits: number, mask: number): void {
    const format = bchFormat((levelBits << 3) | mask);
    for (let i = 0; i < 15; i++) {
      const bit = ((format >>> i) & 1) === 1;
      if (i <= 5) this.setFunction(i, 8, bit);
      else if (i === 6) this.setFunction(7, 8, bit);
      else if (i === 7) this.setFunction(8, 8, bit);
      else if (i === 8) this.setFunction(8, 7, bit);
      else this.setFunction(8, 14 - i, bit);

      if (i < 8) this.setFunction(8, this.size - 1 - i, bit);
      else this.setFunction(this.size - 15 + i, 8, bit);
    }
    this.setFunction(this.size - 8, 8, true);

    if (this.version < 7) return;
    const info = bchVersion(this.version);
    for (let i = 0; i < 18; i++) {
      const bit = ((info >>> i) & 1) === 1;
      const row = Math.floor(i / 3);
      const col = this.size - 11 + (i % 3);
      this.setFunction(row, col, bit);
      this.setFunction(col, row, bit);
    }
  }

  drawCodewords(codewords: Uint8Array): void {
    let bit = 0;
    let up = true;
    for (let right = this.size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let n = 0; n < this.size; n++) {
        const row = up ? this.size - 1 - n : n;
        for (const col of [right, right - 1]) {
          if (this.isFixed(row, col)) continue;
          const value = bit < codewords.length * 8
            ? (codewords[bit >> 3] >>> (7 - (bit & 7))) & 1
            : 0;
          this.set(row, col, value === 1);
          bit++;
        }
      }
      up = !up;
    }
  }

  applyMask(mask: number): void {
    const fn = MASKS[mask];
    for (let row = 0; row < this.size; row++) {
      for (let col = 0; col < this.size; col++) {
        if (this.isFixed(row, col) || !fn(row, col)) continue;
        const i = row * this.size + col;
        this.modules[i] ^= 1;
      }
    }
  }
}

function bchFormat(data: number): number {
  let value = data << 10;
  while (bitsOf(value) - bitsOf(0x537) >= 0)
    value ^= 0x537 << (bitsOf(value) - bitsOf(0x537));
  return (data << 10) ^ value ^ 0x5412;
}

function bchVersion(version: number): number {
  let value = version << 12;
  while (bitsOf(value) - bitsOf(0x1f25) >= 0)
    value ^= 0x1f25 << (bitsOf(value) - bitsOf(0x1f25));
  return (version << 12) | value;
}

function bitsOf(value: number): number {
  let n = 0;
  while (value > 0) {
    value >>>= 1;
    n++;
  }
  return n;
}

/* ----------------------------------------------------------------- masks */

const PATTERN = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];

function linePenalty(line: number[]): number {
  let score = 0;
  let run = 1;
  for (let i = 1; i < line.length; i++) {
    if (line[i] === line[i - 1]) run++;
    else {
      if (run >= 5) score += 3 + (run - 5);
      run = 1;
    }
    if (i >= 10) {
      const window = line.slice(i - 10, i + 1);
      if (window.every((v, j) => v === PATTERN[j])) score += 40;
      else if (window.every((v, j) => v === PATTERN[10 - j])) score += 40;
    }
  }
  if (run >= 5) score += 3 + (run - 5);
  return score;
}

function penalty(grid: Grid): number {
  let score = 0;
  const rows: number[][] = [];
  const cols: number[][] = [];
  for (let i = 0; i < grid.size; i++) {
    const row: number[] = [];
    const col: number[] = [];
    for (let j = 0; j < grid.size; j++) {
      row.push(grid.at(i, j));
      col.push(grid.at(j, i));
    }
    rows.push(row);
    cols.push(col);
    score += linePenalty(row) + linePenalty(col);
  }

  for (let r = 0; r < grid.size - 1; r++) {
    for (let c = 0; c < grid.size - 1; c++) {
      const v = grid.at(r, c);
      if (v === grid.at(r, c + 1) && v === grid.at(r + 1, c) && v === grid.at(r + 1, c + 1))
        score += 3;
    }
  }

  let dark = 0;
  for (const v of grid.modules) dark += v;
  const percent = (dark / grid.modules.length) * 100;
  score += Math.floor(Math.abs(percent - 50) / 5) * 10;
  return score;
}

/* ------------------------------------------------------------------- api */

export interface QrSymbol {
  version: number;
  size: number;
  level: EcLevel;
  mask: number;
  mode: Mode;
  modules: Uint8Array;
  /** Characters this version and level can hold in the used mode. */
  capacity: number;
}

export interface QrResult {
  symbol: QrSymbol | null;
  error: string | null;
}

const LEVEL_BITS: Record<EcLevel, number> = { M: 0, L: 1, H: 2, Q: 3 };

export function encodeQr(text: string, level: EcLevel): QrResult {
  const source = text.replace(/\r\n/g, "\n");
  if (source === "") return { symbol: null, error: null };

  const mode = modeOf(source);
  const length = lengthOf(mode, source);

  let version = 0;
  for (let v = 1; v <= 40; v++) {
    const limit = dataCodewords(v, level) * 8;
    if (payloadBits(mode, length, v) <= limit) {
      version = v;
      break;
    }
  }
  if (version === 0) {
    return {
      symbol: null,
      error: `Too long for a QR code — level ${level} holds ${capacity(mode, 40, level)} ${mode === "byte" ? "bytes" : "characters"}`,
    };
  }

  const bits = new Bits();
  writePayload(bits, mode, source, version);
  const total = dataCodewords(version, level) * 8;
  if (bits.length + 4 <= total) bits.put(0, 4);
  while (bits.length % 8 !== 0) bits.put(0, 1);
  const codewords = interleave(bits.codewords(total / 8), version, level);

  const grid = new Grid(version);
  grid.drawFinders();
  grid.drawTiming();
  grid.drawAlignment();
  grid.drawReserve(LEVEL_BITS[level], 0);
  grid.drawCodewords(codewords);

  let best = 0;
  let bestScore = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const trial = new Grid(version);
    trial.modules.set(grid.modules);
    trial.fixed.set(grid.fixed);
    trial.applyMask(mask);
    trial.drawReserve(LEVEL_BITS[level], mask);
    const score = penalty(trial);
    if (score < bestScore) {
      bestScore = score;
      best = mask;
    }
  }
  grid.applyMask(best);
  grid.drawReserve(LEVEL_BITS[level], best);

  return {
    symbol: {
      version,
      size: grid.size,
      level,
      mask: best,
      mode,
      modules: grid.modules,
      capacity: capacity(mode, version, level),
    },
    error: null,
  };
}

/** Vector outline of the symbol, one square per dark module. */
export function modulePath(modules: Uint8Array, size: number): string {
  let d = "";
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (modules[row * size + col] === 1) d += `M${col} ${row}h1v1h-1z`;
    }
  }
  return d;
}

export function svgDocument(
  symbol: QrSymbol,
  options: { scale: number; margin: number; dark: string; light: string },
): string {
  const edge = symbol.size + options.margin * 2;
  const width = edge * options.scale;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${width}"`,
    ` viewBox="0 0 ${edge} ${edge}" shape-rendering="crispEdges">`,
    `<rect width="${edge}" height="${edge}" fill="${options.light}"/>`,
    `<path transform="translate(${options.margin} ${options.margin})"`,
    ` fill="${options.dark}" d="${modulePath(symbol.modules, symbol.size)}"/>`,
    "</svg>",
  ].join("");
}
