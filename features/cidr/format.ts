/** Category ids keyed by the UI dictionary; `classRange` is the emitted value. */
export type CidrClass =
  | "private"
  | "loopback"
  | "linkLocal"
  | "carrierNat"
  | "documentation"
  | "multicast"
  | "reserved"
  | "public";

export interface CidrInfo {
  input: string;
  ip: string;
  prefix: number;
  cidr: string;
  netmask: string;
  wildcard: string;
  network: string;
  broadcast: string;
  first: string;
  last: string;
  total: number;
  hosts: number;
  binaryMask: string;
  reverseZone: string;
  classId: CidrClass;
  classRange: string;
}

function octets(value: number): [number, number, number, number] {
  return [
    (value >>> 24) & 255,
    (value >>> 16) & 255,
    (value >>> 8) & 255,
    value & 255,
  ];
}

function dotted(value: number): string {
  return octets(value >>> 0).join(".");
}

function binary(value: number): string {
  return octets(value >>> 0)
    .map((o) => o.toString(2).padStart(8, "0"))
    .join(".");
}

export function parseIpv4(text: string): number | null {
  const parts = text.trim().split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    value = value * 256 + n;
  }
  return value >>> 0;
}

/** Netmask -> prefix length, or null when the mask is not contiguous. */
function maskToPrefix(value: number): number | null {
  let bits = 0;
  for (let i = 31; i >= 0; i--) {
    if ((value >>> i) & 1) bits++;
    else break;
  }
  const rebuilt = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return rebuilt === value >>> 0 ? bits : null;
}

const special: { id: CidrClass; base: number; bits: number }[] = [
  { id: "private", base: 0x0a000000, bits: 8 },
  { id: "private", base: 0xac100000, bits: 12 },
  { id: "private", base: 0xc0a80000, bits: 16 },
  { id: "loopback", base: 0x7f000000, bits: 8 },
  { id: "linkLocal", base: 0xa9fe0000, bits: 16 },
  { id: "carrierNat", base: 0x64400000, bits: 10 },
  { id: "documentation", base: 0xc0000200, bits: 24 },
  { id: "documentation", base: 0xc6336400, bits: 24 },
  { id: "documentation", base: 0xcb007100, bits: 24 },
  { id: "multicast", base: 0xe0000000, bits: 4 },
  { id: "reserved", base: 0xf0000000, bits: 4 },
];

/** Range label of a network block, e.g. 0x0a000000/8 -> "10.0.0.0/8". */
function rangeOf(base: number, bits: number): string {
  return `${dotted(base)}/${bits}`;
}

function classify(network: number): { id: CidrClass; range: string } {
  for (const r of special) {
    const mask = r.bits === 0 ? 0 : (~0 << (32 - r.bits)) >>> 0;
    if ((network & mask) >>> 0 === r.base)
      return { id: r.id, range: rangeOf(r.base, r.bits) };
  }
  return { id: "public", range: "" };
}

/** Reverse DNS zone for a network, e.g. 192.0.2.0/26 -> 0.2.0.192.in-addr.arpa */
function reverseZone(network: number, prefix: number): string {
  const o = octets(network >>> 0);
  const whole = Math.floor(prefix / 8);
  const parts = o.slice(0, whole === 0 ? 1 : whole).reverse();
  return `${parts.join(".")}.in-addr.arpa`;
}

export interface CidrResult {
  info: CidrInfo | null;
  error: string | null;
}

export function parseCidr(text: string): CidrResult {
  const raw = text.trim();
  if (raw === "") return { info: null, error: null };

  let ipPart = raw;
  let prefixPart: string | null = null;

  if (raw.includes("/")) {
    const [a, b, extra] = raw.split(/\s*\/\s*/);
    if (extra)
      return { info: null, error: "Too many parts, expected address/prefix" };
    ipPart = a;
    prefixPart = b;
  } else if (/[\s,]/.test(raw)) {
    const [a, b, extra] = raw.split(/[\s,]+/);
    if (extra)
      return { info: null, error: "Expected an address plus a mask or prefix" };
    ipPart = a;
    prefixPart = b;
  }

  const ip = parseIpv4(ipPart);
  if (ip === null)
    return { info: null, error: `"${ipPart}" is not a dotted IPv4 address` };

  let prefix: number;
  if (prefixPart === null) {
    prefix = 24;
  } else if (/^\d{1,2}$/.test(prefixPart) && Number(prefixPart) <= 32) {
    prefix = Number(prefixPart);
  } else {
    const mask = parseIpv4(prefixPart);
    if (mask === null)
      return {
        info: null,
        error: `"${prefixPart}" is not a prefix or netmask`,
      };
    const bits = maskToPrefix(mask);
    if (bits === null)
      return { info: null, error: "That netmask is not contiguous" };
    prefix = bits;
  }

  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const wildcard = ~mask >>> 0;
  const network = (ip & mask) >>> 0;
  const broadcast = (network | wildcard) >>> 0;
  const total = 2 ** (32 - prefix);

  const tiny = prefix >= 31;
  const first = prefix === 32 ? network : tiny ? network : (network + 1) >>> 0;
  const last =
    prefix === 32 ? network : tiny ? broadcast : (broadcast - 1) >>> 0;
  const hosts = prefix === 32 ? 1 : prefix === 31 ? 2 : Math.max(0, total - 2);
  const cls = classify(network);

  return {
    info: {
      input: raw,
      ip: dotted(ip),
      prefix,
      cidr: `${dotted(ip)}/${prefix}`,
      netmask: dotted(mask),
      wildcard: dotted(wildcard),
      network: dotted(network),
      broadcast: dotted(broadcast),
      first: dotted(first),
      last: dotted(last),
      total,
      hosts,
      binaryMask: binary(mask),
      reverseZone: reverseZone(network, prefix),
      classId: cls.id,
      classRange: cls.range,
    },
    error: null,
  };
}

/** Split a network into its two halves (one prefix longer). */
export function subnets(
  info: CidrInfo,
): { cidr: string; network: string; hosts: number }[] {
  if (info.prefix >= 31) return [];
  const network = parseIpv4(info.network)!;
  const size = 2 ** (32 - info.prefix) / 2;
  return [0, 1].map((k) => {
    const base = (network + k * size) >>> 0;
    return {
      cidr: `${dotted(base)}/${info.prefix + 1}`,
      network: dotted(base),
      hosts: Math.max(0, size - 2),
    };
  });
}

export function rangeSummary(info: CidrInfo): string {
  return `${info.network} – ${info.broadcast}`;
}
