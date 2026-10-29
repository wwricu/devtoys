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
  const glyphs = triples.map((t) =>
    t.map((on, j) => (on ? LETTERS[j] : "-")).join(""),
  );
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
  return build(
    o,
    g,
    p,
    (s & 4) !== 0,
    (s & 2) !== 0,
    s === 1 || s === 3 || s === 5 || s === 7,
  );
}

/** Preset description ids keyed by the UI dictionary. */
export type ChmodPresetId =
  | "executable"
  | "textFile"
  | "privateKey"
  | "privateFolder"
  | "worldWritable"
  | "setuidBinary";

/**
 * Preset modes. `octal` is the emitted value, `id` keys the translated
 * description in the UI dictionary so the engine stays free of display text.
 */
export const PRESETS: { id: ChmodPresetId; octal: string }[] = [
  { id: "executable", octal: "755" },
  { id: "textFile", octal: "644" },
  { id: "privateKey", octal: "600" },
  { id: "privateFolder", octal: "700" },
  { id: "worldWritable", octal: "777" },
  { id: "setuidBinary", octal: "4755" },
];
