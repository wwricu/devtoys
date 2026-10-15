export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Hsla {
  h: number;
  s: number;
  l: number;
  a: number;
}

const clamp255 = (n: number) => Math.min(255, Math.max(0, n));
const clamp1 = (n: number) => Math.min(1, Math.max(0, n));

const hex2 = (n: number) => clamp255(Math.round(n)).toString(16).padStart(2, "0");

export function parseColor(text: string): Rgba | null {
  const raw = text.trim().toLowerCase();
  if (raw === "") return null;

  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/.exec(raw);
  if (short) {
    return {
      r: parseInt(short[1] + short[1], 16),
      g: parseInt(short[2] + short[2], 16),
      b: parseInt(short[3] + short[3], 16),
      a: short[4] ? parseInt(short[4] + short[4], 16) / 255 : 1,
    };
  }

  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/.exec(raw);
  if (long) {
    return {
      r: parseInt(long[1], 16),
      g: parseInt(long[2], 16),
      b: parseInt(long[3], 16),
      a: long[4] ? parseInt(long[4], 16) / 255 : 1,
    };
  }

  const func = /^([a-z]+)\((.*)\)$/.exec(raw);
  if (func) {
    const kind = func[1];
    const body = func[2].replace(/\//g, " ").replace(/,/g, " ").trim();
    const parts = body.split(/\s+/).filter((p) => p !== "");
    const nums = parts.map((p) =>
      p.endsWith("%") ? Number(p.slice(0, -1)) : Number(p),
    );
    if (nums.some((n) => Number.isNaN(n))) return null;

    if (kind === "rgb" || kind === "rgba") {
      const scale = parts[0]?.endsWith("%");
      return {
        r: clamp255(scale ? (nums[0] / 100) * 255 : nums[0]),
        g: clamp255(scale ? (nums[1] / 100) * 255 : nums[1]),
        b: clamp255(scale ? (nums[2] / 100) * 255 : nums[2]),
        a: nums.length > 3 ? clamp1(nums[3]) : 1,
      };
    }
    if (kind === "hsl" || kind === "hsla") {
      return hslToRgba({
        h: ((nums[0] % 360) + 360) % 360,
        s: clamp1(nums[1] / 100),
        l: clamp1(nums[2] / 100),
        a: nums.length > 3 ? clamp1(nums[3]) : 1,
      });
    }
  }
  return null;
}

export function rgbaToHex(c: Rgba): string {
  const base = `#${hex2(c.r)}${hex2(c.g)}${hex2(c.b)}`;
  return c.a >= 0.999 ? base : `${base}${hex2(c.a * 255)}`;
}

export function rgbaToRgbString(c: Rgba): string {
  const body = `${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}`;
  return c.a >= 0.999 ? `rgb(${body})` : `rgba(${body}, ${round3(c.a)})`;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function rgbaToHsl(c: Rgba): Hsla {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return { h: Math.round(h), s: round3(s), l: round3(l), a: c.a };
}

export function hslToRgba(c: Hsla): Rgba {
  const { h, s, l } = c;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return {
    r: Math.round(f(0) * 255),
    g: Math.round(f(8) * 255),
    b: Math.round(f(4) * 255),
    a: c.a,
  };
}

export function rgbaToHsv(c: Rgba): { h: number; s: number; v: number } {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return { h: Math.round(h), s: max === 0 ? 0 : round3(d / max), v: round3(max) };
}

export function rgbaToCmyk(c: Rgba): { c: number; m: number; y: number; k: number } {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const k = 1 - Math.max(r, g, b);
  if (k >= 0.999) return { c: 0, m: 0, y: 0, k: 1 };
  const inv = (v: number) => round3((1 - v - k) / (1 - k));
  return { c: inv(r), m: inv(g), y: inv(b), k: round3(k) };
}

/** WCAG relative luminance of the sRGB channels. */
export function luminance(c: Rgba): number {
  const ch = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
}

export function contrastRatio(a: Rgba, b: Rgba): number {
  const la = luminance(a);
  const lb = luminance(b);
  const light = Math.max(la, lb);
  const dark = Math.min(la, lb);
  return round3((light + 0.05) / (dark + 0.05));
}

export function formatHsl(c: Hsla): string {
  return `hsl(${c.h}, ${round3(c.s * 100)}%, ${round3(c.l * 100)}%)`;
}
