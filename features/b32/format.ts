const STD_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const HEX_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUV";

export type Base32Variant = "standard" | "hex";

function alphabet(variant: Base32Variant): string {
  return variant === "hex" ? HEX_ALPHABET : STD_ALPHABET;
}

export function base32Encode(
  text: string,
  variant: Base32Variant,
  padding: boolean,
): string {
  const table = alphabet(variant);
  const bytes = new TextEncoder().encode(text);
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += table[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += table[(value << (5 - bits)) & 31];
  if (!padding) return out;
  const mod = out.length % 8;
  return mod === 0 ? out : out + "=".repeat(8 - mod);
}

export function base32Decode(
  text: string,
  variant: Base32Variant,
): { output: string; error: string | null } {
  const table = alphabet(variant);
  const cleaned = text.replace(/\s+/g, "").replace(/=+$/, "").toUpperCase();
  if (cleaned === "") return { output: "", error: null };

  const lookup = new Map<string, number>();
  for (let i = 0; i < table.length; i++) lookup.set(table[i], i);

  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of cleaned) {
    const index = lookup.get(ch);
    if (index === undefined)
      return { output: "", error: `'${ch}' is not in the Base32 ${variant} alphabet` };
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  const trailing = cleaned.length % 8;
  if (trailing === 1 || trailing === 3 || trailing === 6)
    return { output: "", error: `Invalid length: ${trailing} leftover symbols cannot encode a whole byte` };

  try {
    return { output: new TextDecoder("utf-8", { fatal: true }).decode(new Uint8Array(bytes)), error: null };
  } catch {
    return { output: "", error: "Decoded bytes are not valid UTF-8 text" };
  }
}
