const DIGITS = "0123456789abcdefghijklmnopqrstuvwxyz";

export function parseBase(input: string, base: number): bigint | null {
  let s = input.trim().toLowerCase();
  if (s === "") return null;
  let neg = false;
  if (s[0] === "-") {
    neg = true;
    s = s.slice(1);
  } else if (s[0] === "+") {
    s = s.slice(1);
  }
  // strip common prefixes
  if (base === 16 && s.startsWith("0x")) s = s.slice(2);
  if (base === 8 && s.startsWith("0o")) s = s.slice(2);
  if (base === 2 && s.startsWith("0b")) s = s.slice(2);
  if (s === "") return null;
  let acc = 0n;
  const B = BigInt(base);
  for (const ch of s) {
    const idx = DIGITS.indexOf(ch);
    if (idx < 0 || idx >= base) return null;
    acc = acc * B + BigInt(idx);
  }
  return neg ? -acc : acc;
}

export function toBase(value: bigint, base: number): string {
  if (value === 0n) return "0";
  const neg = value < 0n;
  let v = neg ? -value : value;
  const B = BigInt(base);
  let out = "";
  while (v > 0n) {
    out = DIGITS[Number(v % B)] + out;
    v /= B;
  }
  return neg ? "-" + out : out;
}
