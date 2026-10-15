export interface PasswordOptions {
  length: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
  requireEach: boolean;
}

const SETS = {
  lower: "abcdefghijklmnopqrstuvwxyz",
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  digits: "0123456789",
  symbols: "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~",
};
const AMBIGUOUS = new Set("Il1O0o|`'\";:,.{}()[]\\/");

function activeSets(opts: PasswordOptions): string[] {
  const out: string[] = [];
  (Object.keys(SETS) as (keyof typeof SETS)[]).forEach((k) => {
    if (opts[k]) {
      let s = SETS[k];
      if (opts.excludeAmbiguous)
        s = s
          .split("")
          .filter((c) => !AMBIGUOUS.has(c))
          .join("");
      if (s) out.push(s);
    }
  });
  return out;
}

function randInt(max: number): number {
  // unbiased integer in [0, max)
  const limit = Math.floor(0xffffffff / max) * max;
  const buf = new Uint32Array(1);
  let x = 0;
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % max;
}

export function generatePassword(opts: PasswordOptions): string {
  const sets = activeSets(opts);
  if (sets.length === 0) return "";
  const pool = sets.join("");
  const len = Math.min(128, Math.max(1, opts.length));
  const chars: string[] = [];
  if (opts.requireEach) {
    for (const s of sets) chars.push(s[randInt(s.length)]);
  }
  while (chars.length < len) chars.push(pool[randInt(pool.length)]);
  // trim if requireEach exceeded length, then shuffle the remainder
  const result = chars.slice(0, len);
  // Fisher-Yates shuffle
  for (let i = result.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result.join("");
}

export function passwordEntropy(opts: PasswordOptions): number {
  const sets = activeSets(opts);
  if (sets.length === 0) return 0;
  const poolSize = sets.join("").length;
  return Math.round(Math.log2(poolSize) * Math.min(128, Math.max(1, opts.length)));
}
