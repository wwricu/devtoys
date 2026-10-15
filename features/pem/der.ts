export type TagClass = "universal" | "application" | "context" | "private";

export interface DerNode {
  label: string;
  cls: TagClass;
  constructed: boolean;
  tag: number;
  /** raw content bytes as hex */
  hex: string;
  /** decoded scalar text when it makes sense */
  text: string | null;
  children: DerNode[];
}

const CLASS_NAMES: TagClass[] = ["universal", "application", "context", "private"];

const UNIVERSAL: Record<number, string> = {
  0x01: "BOOLEAN",
  0x02: "INTEGER",
  0x03: "BIT STRING",
  0x04: "OCTET STRING",
  0x05: "NULL",
  0x06: "OBJECT IDENTIFIER",
  0x0a: "ENUMERATED",
  0x0c: "UTF8String",
  0x10: "SEQUENCE",
  0x11: "SET",
  0x12: "NumericString",
  0x13: "PrintableString",
  0x14: "T61String",
  0x16: "IA5String",
  0x17: "UTCTime",
  0x18: "GeneralizedTime",
  0x1e: "BMPString",
};

class DerError extends Error {}

function hex(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += b.toString(16).padStart(2, "0");
  return s;
}

interface Tlv {
  cls: TagClass;
  constructed: boolean;
  tag: number;
  /** first content byte */
  start: number;
  /** one past the last content byte */
  end: number;
}

function readTlv(src: Uint8Array, offset: number, limit: number): Tlv {
  const first = src[offset];
  if (first === undefined) throw new DerError("Truncated DER data");
  const cls = CLASS_NAMES[first >> 6];
  const constructed = (first & 0x20) !== 0;
  let pos = offset + 1;
  let tag = first & 0x1f;

  if (tag === 0x1f) {
    tag = 0;
    for (;;) {
      const b = src[pos];
      if (b === undefined) throw new DerError("Truncated high tag number form");
      tag = tag * 128 + (b & 0x7f);
      pos++;
      if ((b & 0x80) === 0) break;
    }
  }

  const lengthByte = src[pos];
  if (lengthByte === undefined) throw new DerError("Truncated DER length");
  let len: number;
  if (lengthByte < 0x80) {
    len = lengthByte;
    pos++;
  } else if (lengthByte === 0x80) {
    throw new DerError("Indefinite length is not valid DER");
  } else {
    const count = lengthByte & 0x7f;
    if (count > 4) throw new DerError("Element length is impossibly large");
    len = 0;
    pos++;
    for (let i = 0; i < count; i++) {
      const b = src[pos + i];
      if (b === undefined) throw new DerError("Truncated DER long-form length");
      len = len * 256 + b;
    }
    pos += count;
  }

  const end = pos + len;
  if (end > limit) throw new DerError("Element content runs past its parent");
  return { cls, constructed, tag, start: pos, end };
}

/** Decode an OID body into dotted form. */
export function decodeOid(bytes: Uint8Array): string {
  const parts: number[] = [];
  let value = 0;
  for (const b of bytes) {
    value = value * 128 + (b & 0x7f);
    if ((b & 0x80) === 0) {
      parts.push(value);
      value = 0;
    }
  }
  if (parts.length === 0) return "";
  const first = parts.shift()!;
  const head = first < 40 ? `0.${first}` : first < 80 ? `1.${first - 40}` : `2.${first - 80}`;
  return [head, ...parts.map(String)].join(".");
}

function decodeText(bytes: Uint8Array, tag: number): string {
  if (tag === 0x1e) {
    let s = "";
    for (let i = 0; i + 1 < bytes.length; i += 2)
      s += String.fromCharCode(((bytes[i] << 8) | bytes[i + 1]) & 0xffff);
    return s;
  }
  return new TextDecoder().decode(bytes);
}

function decodeInteger(bytes: Uint8Array): string {
  if (bytes.length === 0) return "0";
  const negative = (bytes[0] & 0x80) !== 0;
  let value = 0;
  for (const b of bytes) value = value * 256 + b;
  if (bytes.length <= 6) {
    if (negative) value -= Math.pow(256, bytes.length);
    return String(value);
  }
  let big = 0n;
  for (const b of bytes) big = (big << 8n) | BigInt(b);
  if (negative) big -= 2n ** BigInt(bytes.length * 8);
  return big.toString();
}

function isPrintable(bytes: Uint8Array): boolean {
  if (bytes.length === 0) return false;
  for (const b of bytes) if (b < 0x20 || b > 0x7e) return false;
  return true;
}

function decodeScalar(bytes: Uint8Array, tlv: Tlv): string | null {
  // A context-tagged primitive (like a SAN dNSName) carries no universal type
  // information, so only show it when the bytes are plainly text.
  if (tlv.cls !== "universal") return isPrintable(bytes) ? decodeText(bytes, 0x16) : null;
  switch (tlv.tag) {
    case 0x01:
      return bytes.length > 0 && bytes[bytes.length - 1] !== 0 ? "true" : "false";
    case 0x02:
    case 0x0a:
      return decodeInteger(bytes);
    case 0x06:
      return decodeOid(bytes);
    case 0x0c:
    case 0x12:
    case 0x13:
    case 0x14:
    case 0x16:
    case 0x1e:
      return decodeText(bytes, tlv.tag);
    case 0x17:
    case 0x18:
      return asn1Time(decodeText(bytes, tlv.tag), tlv.tag)?.label ?? null;
    case 0x05:
      return "NULL";
    case 0x03:
      return `${(bytes.length - 1) * 8} bits`;
    default:
      return null;
  }
}

function nodeLabel(tlv: Tlv): string {
  if (tlv.cls !== "universal") return `${tlv.cls} [${tlv.tag}]`;
  return UNIVERSAL[tlv.tag] ?? `tag ${tlv.tag}`;
}

function walk(src: Uint8Array, offset: number, limit: number): DerNode {
  const tlv = readTlv(src, offset, limit);
  const bytes = src.slice(tlv.start, tlv.end);
  const node: DerNode = {
    label: nodeLabel(tlv),
    cls: tlv.cls,
    constructed: tlv.constructed,
    tag: tlv.tag,
    hex: hex(bytes),
    text: null,
    children: [],
  };

  if (tlv.constructed) {
    let cursor = tlv.start;
    while (cursor < tlv.end) {
      const child = readTlv(src, cursor, tlv.end);
      node.children.push(walk(src, cursor, tlv.end));
      cursor = child.end;
    }
  } else {
    node.text = decodeScalar(bytes, tlv);
  }
  return node;
}

export interface DerParseResult {
  root: DerNode | null;
  error: string | null;
}

export function parseDer(bytes: Uint8Array): DerParseResult {
  if (bytes.length === 0) return { root: null, error: null };
  try {
    return { root: walk(bytes, 0, bytes.length), error: null };
  } catch (err) {
    return { root: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export interface Asn1Time {
  label: string;
  epoch: number;
}

/** UTCTime / GeneralizedTime -> UTC display string and epoch milliseconds. */
export function asn1Time(text: string, tag: number): Asn1Time | null {
  const body = text.trim().replace(/Z$/i, "").replace(/\+00:?(00)?$/i, "");
  let year: number;
  let rest: string;
  if (tag === 0x17) {
    if (body.length < 10) return null;
    const yy = Number(body.slice(0, 2));
    year = yy >= 50 ? 1900 + yy : 2000 + yy;
    rest = body.slice(2);
  } else {
    if (body.length < 12) return null;
    year = Number(body.slice(0, 4));
    rest = body.slice(4);
  }
  const parts = [
    Number(rest.slice(0, 2)),
    Number(rest.slice(2, 4)),
    Number(rest.slice(4, 6)),
    rest.length >= 8 ? Number(rest.slice(6, 8)) : 0,
    rest.length >= 10 ? Number(rest.slice(8, 10)) : 0,
  ];
  if (parts.some((n) => Number.isNaN(n))) return null;
  const [mm, dd, hh, mi, ss] = parts;
  const epoch = Date.UTC(year, mm - 1, dd, hh, mi, ss);
  if (Number.isNaN(epoch)) return null;
  return {
    label: new Date(epoch).toISOString().replace("T", " ").replace(".000Z", " UTC"),
    epoch,
  };
}

/** The raw UTCTime/GeneralizedTime bytes of a decoded node. */
export function nodeTime(node: DerNode): Asn1Time | null {
  const bytes = derToBytes(node);
  let text = "";
  for (const b of bytes) text += String.fromCharCode(b);
  return asn1Time(text, node.tag);
}

export function derToBytes(node: DerNode): Uint8Array {
  return new Uint8Array(Array.from(node.hex.match(/.{2}/g) ?? [], (b) => parseInt(b, 16)));
}
