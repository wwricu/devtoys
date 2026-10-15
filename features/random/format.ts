/** Uniform integer in [0, span) by rejection sampling, so the distribution stays even. */
function randomBelow(span: number): number {
  if (span <= 2 ** 32) {
    const limit = Math.floor(2 ** 32 / span) * span;
    const buffer = new Uint32Array(1);
    let value = 0;
    do {
      crypto.getRandomValues(buffer);
      value = buffer[0];
    } while (value >= limit);
    return value % span;
  }
  const limit = Math.floor(2 ** 53 / span) * span;
  let value = 0;
  do {
    value = Math.floor(randomUnit() * 2 ** 53);
  } while (value >= limit);
  return value % span;
}

export function randomInt(min: number, max: number): number {
  if (!Number.isInteger(min) || !Number.isInteger(max))
    throw new Error("Bounds must be whole numbers");
  if (max < min) throw new Error("Upper bound is below the lower bound");
  const span = max - min + 1;
  if (span > 2 ** 53) throw new Error("That range is too wide");
  return min + randomBelow(span);
}

export interface IntOptions {
  min: number;
  max: number;
  count: number;
  unique: boolean;
  sort: boolean;
}

export function randomInts(options: IntOptions): number[] {
  const { min, max, count, unique, sort } = options;
  const span = max - min + 1;
  if (count < 1) throw new Error("Pick at least one number");
  if (unique && count > span) throw new Error(`Only ${span} unique values exist in that range`);
  const out: number[] = [];
  if (unique) {
    const pool = new Set<number>();
    while (pool.size < count) pool.add(randomInt(min, max));
    out.push(...pool);
  } else {
    for (let i = 0; i < count; i++) out.push(randomInt(min, max));
  }
  if (sort) out.sort((a, b) => a - b);
  return out;
}

export interface FloatOptions {
  min: number;
  max: number;
  count: number;
  decimals: number;
}

export function randomFloats(options: FloatOptions): string[] {
  const { min, max, count, decimals } = options;
  if (!(max > min)) throw new Error("Upper bound must be above the lower bound");
  if (count < 1) throw new Error("Pick at least one number");
  const places = Math.max(0, Math.min(12, decimals));
  const out: string[] = [];
  for (let i = 0; i < count; i++) out.push((min + randomUnit() * (max - min)).toFixed(places));
  return out;
}

/** Fractional value in [0, 1). */
export function randomUnit(): number {
  const buffer = new Uint32Array(2);
  crypto.getRandomValues(buffer);
  return ((buffer[0] >>> 11) * 2 ** 32 + (buffer[1] >>> 11)) / 2 ** 53;
}

export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  const buffer = new Uint32Array(out.length);
  if (out.length > 0) {
    crypto.getRandomValues(buffer);
    for (let i = out.length - 1; i > 0; i--) {
      const j = buffer[i] % (i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
  }
  return out;
}
