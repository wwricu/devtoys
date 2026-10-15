/**
 * Punycode (RFC 3492) and the internationalised domain names built on it.
 * Labels are normalised with NFC and lower-cased before encoding, the way a
 * resolver would see them.
 */

const BASE = 36;
const TMIN = 1;
const TMAX = 26;
const SKEW = 38;
const DAMP = 700;
const INITIAL_BIAS = 72;
const INITIAL_N = 128;
const DELIMITER = "-";

function basic(value: number): string {
  return value < 26
    ? String.fromCharCode(value + "a".charCodeAt(0))
    : String.fromCharCode(value - 26 + "0".charCodeAt(0));
}

function digit(char: string): number {
  const code = char.toLowerCase().charCodeAt(0);
  if (code >= "a".charCodeAt(0) && code <= "z".charCodeAt(0)) return code - "a".charCodeAt(0);
  if (code >= "0".charCodeAt(0) && code <= "9".charCodeAt(0)) return 26 + code - "0".charCodeAt(0);
  throw new Error(`"${char}" is not a punycode digit`);
}

function adapt(delta: number, points: number, first: boolean): number {
  let value = first ? Math.floor(delta / DAMP) : Math.floor(delta / 2);
  value += Math.floor(value / points);
  let k = 0;
  while (value > Math.floor(((BASE - TMIN) * TMAX) / 2)) {
    value = Math.floor(value / (BASE - TMIN));
    k += BASE;
  }
  return k + Math.floor(((BASE - TMIN + 1) * value) / (value + SKEW));
}

export function punycodeEncode(text: string): string {
  const code = Array.from(text).map((char) => char.codePointAt(0)!);
  const basicPart = code.filter((value) => value < 0x80);
  let out = basicPart.map((value) => String.fromCodePoint(value)).join("");
  if (out.length > 0) out += DELIMITER;

  let n = INITIAL_N;
  let delta = 0;
  let bias = INITIAL_BIAS;
  let handled = basicPart.length;
  const total = code.length;

  while (handled < total) {
    let m = Infinity;
    for (const value of code) if (value >= n && value < m) m = value;
    delta += (m - n) * (handled + 1);
    n = m;
    for (const value of code) {
      if (value < n) delta++;
      else if (value === n) {
        let q = delta;
        for (let k = BASE; ; k += BASE) {
          const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
          if (q < t) break;
          out += basic(t + ((q - t) % (BASE - t)));
          q = Math.floor((q - t) / (BASE - t));
        }
        out += basic(q);
        bias = adapt(delta, handled + 1, handled === basicPart.length);
        delta = 0;
        handled++;
      }
    }
    n++;
    delta++;
  }
  return out;
}

export function punycodeDecode(text: string): string {
  const input = text.toLowerCase();
  const split = input.lastIndexOf(DELIMITER);
  const start = split < 0 ? 0 : split + 1;
  const out: number[] = [];
  for (const char of input.slice(0, split < 0 ? 0 : split)) out.push(char.codePointAt(0)!);

  let n = INITIAL_N;
  let i = 0;
  let bias = INITIAL_BIAS;
  let position = start;
  while (position < input.length) {
    const old = i;
    let weight = 1;
    for (let k = BASE; ; k += BASE) {
      if (position >= input.length) throw new Error("Truncated punycode sequence");
      const value = digit(input[position++]);
      i += value * weight;
      const t = k <= bias ? TMIN : k >= bias + TMAX ? TMAX : k - bias;
      if (value < t) break;
      weight *= BASE - t;
    }
    const size = out.length + 1;
    bias = adapt(i - old, size, old === 0);
    n += Math.floor(i / size);
    i %= size;
    if (n < 0 || n > 0x10ffff) throw new Error("Code point outside Unicode");
    out.splice(i++, 0, n);
  }
  return String.fromCodePoint(...out);
}

const PREFIX = "xn--";

export interface DomainRead {
  output: string;
  /** Per-label breakdown, shown under the result */
  labels: { input: string; output: string; translated: boolean }[];
  error: string | null;
}

function normaliseLabel(label: string): string {
  return label.normalize("NFC").toLowerCase();
}

export function toAsciiDomain(value: string): DomainRead {
  return convert(value, "ascii");
}

export function toUnicodeDomain(value: string): DomainRead {
  return convert(value, "unicode");
}

/**
 * Cut a URL into the parts around its host. `URL.hostname` is avoided because
 * it already punycodes the host, which is the very thing being computed here.
 */
function splitHost(value: string): { head: string; host: string; tail: string } {
  const trimmed = value.trim();
  let head = "";
  let rest = trimmed;
  const scheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.exec(rest);
  if (scheme) {
    head = rest.slice(0, scheme[0].length);
    rest = rest.slice(scheme[0].length);
  }
  const boundary = rest.search(/[/?#]/);
  let authority = boundary < 0 ? rest : rest.slice(0, boundary);
  let tail = boundary < 0 ? "" : rest.slice(boundary);
  const at = authority.lastIndexOf("@");
  if (at >= 0) {
    head += authority.slice(0, at + 1);
    authority = authority.slice(at + 1);
  }
  let host = "";
  if (!authority.startsWith("[") && !authority.includes(":")) {
    host = authority;
  } else if (authority.startsWith("[")) {
    // An IPv6 literal carries no labels to translate.
    const close = authority.indexOf("]");
    host = authority.slice(0, close + 1);
    tail = authority.slice(close + 1) + tail;
  } else {
    const colon = authority.indexOf(":");
    host = authority.slice(0, colon);
    tail = authority.slice(colon) + tail;
  }
  return { head, host, tail };
}

function convert(value: string, direction: "ascii" | "unicode"): DomainRead {
  const source = value.trim();
  if (source === "") return { output: "", labels: [], error: null };
  const { head, host, tail } = splitHost(source);
  if (host === "") return { output: "", labels: [], error: "No host name found in that text" };

  const labels: DomainRead["labels"] = [];
  const translated: string[] = [];
  try {
    for (const raw of host.split(".")) {
      const label = normaliseLabel(raw);
      if (direction === "ascii") {
        if (label.startsWith(PREFIX)) {
          const body = punycodeDecode(label.slice(PREFIX.length));
          translated.push(PREFIX + label.slice(PREFIX.length));
          labels.push({ input: raw, output: body, translated: true });
        } else if (/[^\x00-\x7f]/.test(label)) {
          const body = punycodeEncode(label);
          translated.push(PREFIX + body);
          labels.push({ input: raw, output: PREFIX + body, translated: true });
        } else {
          translated.push(label);
          labels.push({ input: raw, output: label, translated: false });
        }
      } else {
        if (label.startsWith(PREFIX)) {
          const body = punycodeDecode(label.slice(PREFIX.length));
          translated.push(body);
          labels.push({ input: raw, output: body, translated: true });
        } else {
          translated.push(label);
          labels.push({ input: raw, output: label, translated: false });
        }
      }
    }
  } catch (err) {
    return {
      output: "",
      labels,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  const host2 = translated.join(".");
  return {
    output: head + host2 + tail,
    labels,
    error: null,
  };
}
