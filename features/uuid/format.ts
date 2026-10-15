function randBytes(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}
const hex = (b: Uint8Array) =>
  Array.from(b)
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");

export function uuidV4(): string {
  const b = randBytes(16);
  b[6] = (b[6] & 0x0f) | 0x40; // version 4
  b[8] = (b[8] & 0x3f) | 0x80; // variant 10
  const h = hex(b);
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// 100-ns intervals between the Gregorian reform (1582-10-15) and Unix epoch
const EPOCH_OFFSET = 122192928000000000n;

export function uuidV1(): string {
  const now = BigInt(Date.now()) * 10000n + BigInt(Math.floor(Math.random() * 10000));
  const ts = now + EPOCH_OFFSET;
  const timeLow = Number(ts & 0xffffffffn);
  const timeMid = Number((ts >> 32n) & 0xffffn);
  const timeHi = Number((ts >> 48n) & 0x0fffn) | 0x1000; // version 1
  const node = randBytes(6);
  node[0] |= 0x01; // set multicast bit (random node)
  const clock = randBytes(2);
  clock[0] = (clock[0] & 0x3f) | 0x80; // variant
  const hh = hex(node);
  const ch = hex(clock);
  return (
    timeLow.toString(16).padStart(8, "0") +
    "-" +
    timeMid.toString(16).padStart(4, "0") +
    "-" +
    timeHi.toString(16).padStart(4, "0") +
    "-" +
    ch.slice(0, 4) +
    "-" +
    hh
  );
}

export interface UuidOptions {
  version: 1 | 4;
  count: number;
  uppercase: boolean;
  noDashes: boolean;
}

export function generateUuids(opts: UuidOptions): string[] {
  const list: string[] = [];
  for (let i = 0; i < opts.count; i++) {
    let u = opts.version === 1 ? uuidV1() : uuidV4();
    if (opts.noDashes) u = u.replace(/-/g, "");
    if (opts.uppercase) u = u.toUpperCase();
    list.push(u);
  }
  return list;
}
