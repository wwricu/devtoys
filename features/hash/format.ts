/* MD5 over UTF-8 bytes, plus SHA-1/256/384/512 through WebCrypto. */

const K = (() => {
  const t = new Int32Array(64);
  for (let i = 0; i < 64; i++)
    t[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) | 0;
  return t;
})();

const SHIFTS = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];

function md5Bytes(bytes: Uint8Array): string {
  const blocks = ((bytes.length + 8) >> 6) + 1;
  const m = new Int32Array(blocks * 16);
  for (let i = 0; i < bytes.length; i++)
    m[i >> 2] |= bytes[i] << ((i % 4) * 8);
  m[bytes.length >> 2] |= 0x80 << ((bytes.length % 4) * 8);
  m[blocks * 16 - 2] = bytes.length * 8;

  let a = 0x67452301 | 0;
  let b = 0xefcdab89 | 0;
  let c = 0x98badcfe | 0;
  let d = 0x10325476 | 0;

  for (let off = 0; off < m.length; off += 16) {
    const oa = a, ob = b, oc = c, od = d;
    for (let j = 0; j < 64; j++) {
      let f: number, g: number;
      if (j < 16) {
        f = (b & c) | (~b & d);
        g = j;
      } else if (j < 32) {
        f = (d & b) | (~d & c);
        g = (5 * j + 1) & 15;
      } else if (j < 48) {
        f = b ^ c ^ d;
        g = (3 * j + 5) & 15;
      } else {
        f = c ^ (b | ~d);
        g = (7 * j) & 15;
      }
      const shift = SHIFTS[((j >> 4) << 2) | (j & 3)];
      const sum = (((a + f) | 0) + m[off + g]) | 0;
      const t = (sum + K[j]) | 0;
      const rotated = ((t << shift) | (t >>> (32 - shift))) | 0;
      const next = (b + rotated) | 0;
      a = d;
      d = c;
      c = b;
      b = next;
    }
    a = (a + oa) | 0;
    b = (b + ob) | 0;
    c = (c + oc) | 0;
    d = (d + od) | 0;
  }

  let out = "";
  for (const w of [a, b, c, d])
    for (let i = 0; i < 4; i++)
      out += ((w >>> (i * 8)) & 0xff).toString(16).padStart(2, "0");
  return out;
}

export function md5(text: string): string {
  return md5Bytes(new TextEncoder().encode(text));
}

const SHA_ALGOS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const;

async function subtleHex(algo: string, bytes: Uint8Array): Promise<string> {
  // Copy: lib.dom types Uint8Array as ArrayBufferLike, WebCrypto wants ArrayBuffer-backed data.
  const buf = await crypto.subtle.digest(algo, new Uint8Array(bytes));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface HashOutput {
  algorithm: string;
  hex: string;
}

export async function hashAll(text: string): Promise<HashOutput[]> {
  const bytes = new TextEncoder().encode(text);
  const out: HashOutput[] = [{ algorithm: "MD5", hex: md5Bytes(bytes) }];
  for (const algo of SHA_ALGOS) {
    out.push({ algorithm: algo, hex: await subtleHex(algo, bytes) });
  }
  return out;
}
