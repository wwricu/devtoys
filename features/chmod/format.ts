export interface ChmodResult {
  /** Four-digit mode including special bits, e.g. "0755" */
  octal: string;
  /** ls -l style, e.g. "rwxr-xr-x" (with s/t substituted where setuid/sticky are set) */
  symbolic: string;
  /** Machine-friendly summary, e.g. "u=rwx,g=rx,o=rx" */
  summary: string;
  flags: string[];
  owner: number;
  group: number;
  other: number;
  setuid: boolean;
  setgid: boolean;
  sticky: boolean;
}

const LETTERS = ["r", "w", "x"] as const;

function bits(value: number): boolean[] {
  return [4, 2, 1].map((v) => (value & v) !== 0);
}

export function build(
  owner: number,
  group: number,
  other: number,
  setuid: boolean,
  setgid: boolean,
  sticky: boolean,
): ChmodResult {
  const special = (setuid ? 4 : 0) + (setgid ? 2 : 0) + (sticky ? 1 : 0);
  const triples = [owner, group, other].map(bits);
  const glyphs = triples.map((t) => t.map((on, j) => (on ? LETTERS[j] : "-")).join(""));
  if (setuid) glyphs[0] = glyphs[0].slice(0, 2) + (owner & 1 ? "s" : "S");
  if (setgid) glyphs[1] = glyphs[1].slice(0, 2) + (group & 1 ? "s" : "S");
  if (sticky) glyphs[2] = glyphs[2].slice(0, 2) + (other & 1 ? "t" : "T");

  const summary = ["u", "g", "o"]
    .map((who, i) => {
      const t = triples[i];
      const perms = (t[0] ? "r" : "") + (t[1] ? "w" : "") + (t[2] ? "x" : "");
      return `${who}=${perms || "-"}`;
    })
    .join(",");

  const flags: string[] = [];
  if (setuid) flags.push("setuid");
  if (setgid) flags.push("setgid");
  if (sticky) flags.push("sticky");

  return {
    octal: `${special}${owner}${group}${other}`,
    symbolic: glyphs.join(""),
    summary,
    flags,
    owner,
    group,
    other,
    setuid,
    setgid,
    sticky,
  };
}

export function fromOctal(text: string): ChmodResult | null {
  const raw = text.trim().replace(/^0o/i, "");
  if (!/^[0-7]{3,4}$/.test(raw)) return null;
  const digits = [...raw].map(Number);
  const [s, o, g, p] = digits.length === 4 ? digits : [0, ...digits];
  return build(o, g, p, (s & 4) !== 0, (s & 2) !== 0, s === 1 || s === 3 || s === 5 || s === 7);
}

/** Handles "rwxr-xr-x", octal text, and chmod expressions like "u=rw,g=r,o-x". */
export function fromSymbolic(text: string): ChmodResult | null {
  const raw = text.trim().toLowerCase();
  if (raw === "") return null;
  if (/^[0-7]{3,4}$/.test(raw)) return fromOctal(raw);

  const ls = /^([rwxsStT-]{9})$/.exec(text.trim());
  if (ls) {
    const chars = ls[1];
    const value = (t: string) =>
      (t[0] === "r" ? 4 : 0) + (t[1] === "w" ? 2 : 0) + (/[xtsS]/.test(t[2]) ? 1 : 0);
    return build(
      value(chars.slice(0, 3)),
      value(chars.slice(3, 6)),
      value(chars.slice(6, 9)),
      chars[2] === "s" || chars[2] === "S",
      chars[5] === "s" || chars[5] === "S",
      chars[8] === "t" || chars[8] === "T",
    );
  }

  let owner = 6;
  let group = 4;
  let other = 4;
  let setuid = false;
  let setgid = false;
  let sticky = false;

  for (const token of raw.split(/[\s,;]+/)) {
    const match = /^([augo]*)([=+-])([rwxXst]*)$/.exec(token);
    if (!match) return null;
    const [, whoRaw, op, permsRaw] = match;
    const who = whoRaw === "" || whoRaw.includes("a") ? "ugo" : whoRaw;
    let mask = 0;
    for (const c of permsRaw)
      mask |= c === "r" ? 4 : c === "w" ? 2 : c === "x" || c === "X" ? 1 : 0;
    const setS = permsRaw.includes("s");
    const setT = permsRaw.includes("t");

    const targets: [number, number][] = [];
    if (who.includes("u")) targets.push([owner, 4]);
    if (who.includes("g")) targets.push([group, 2]);
    if (who.includes("o")) targets.push([other, 1]);

    for (const [current, flag] of targets) {
      let next = current;
      if (op === "=") next = mask;
      else if (op === "+") next = current | mask;
      else next = current & ~mask;
      if (flag === 4) owner = next;
      else if (flag === 2) group = next;
      else other = next;
      if (setS && flag === 4) setuid = op !== "-";
      if (setS && flag === 2) setgid = op !== "-";
      if (setT && flag === 1) sticky = op !== "-";
    }
  }
  return build(owner, group, other, setuid, setgid, sticky);
}

export const PRESETS: { label: string; octal: string }[] = [
  { label: "755 - executable / folder", octal: "755" },
  { label: "644 - text file", octal: "644" },
  { label: "600 - private key", octal: "600" },
  { label: "700 - private folder", octal: "700" },
  { label: "777 - world writable", octal: "777" },
  { label: "4755 - setuid binary", octal: "4755" },
];
