export interface MatchGroup {
  label: string;
  value: string;
}

export interface MatchInfo {
  index: number;
  length: number;
  value: string;
  groups: MatchGroup[];
}

export interface RegexRun {
  matches: MatchInfo[];
  error: string | null;
}

/** Build a RegExp from user input, reporting a syntax error instead of throwing. */
export function buildRegex(
  pattern: string,
  flags: string,
): { re: RegExp | null; error: string | null } {
  if (pattern === "") return { re: null, error: null };
  try {
    return { re: new RegExp(pattern, flags), error: null };
  } catch (err) {
    return { re: null, error: err instanceof Error ? err.message : String(err) };
  }
}

export function runRegex(pattern: string, text: string, flags: string): RegexRun {
  const { re, error } = buildRegex(pattern, flags);
  if (error) return { matches: [], error };
  if (!re || text === "") return { matches: [], error: null };

  const global = flags.includes("g") || flags.includes("y");
  const scan = global ? re : new RegExp(pattern, flags + "g");
  const matches: MatchInfo[] = [];

  for (;;) {
    const m = scan.exec(text);
    if (!m) break;
    matches.push(describe(m));
    if (m[0].length === 0) scan.lastIndex++;
    if (!global) break;
    if (matches.length >= 10000) break;
  }
  return { matches, error: null };
}

function describe(m: RegExpExecArray): MatchInfo {
  const groups: MatchGroup[] = [];
  for (let i = 1; i < m.length; i++)
    groups.push({ label: `$${i}`, value: m[i] ?? "" });
  if (m.groups)
    for (const [name, value] of Object.entries(m.groups))
      groups.push({ label: name, value: value ?? "" });
  return { index: m.index, length: m[0].length, value: m[0], groups };
}

export interface Segment {
  text: string;
  matched: boolean;
  ordinal: number;
}

/** Split the test text into matched / unmatched runs for highlighting. */
export function segments(text: string, matches: MatchInfo[]): Segment[] {
  const out: Segment[] = [];
  let pos = 0;
  matches.forEach((m, i) => {
    if (m.length === 0) return;
    if (m.index > pos)
      out.push({ text: text.slice(pos, m.index), matched: false, ordinal: 0 });
    out.push({
      text: text.slice(m.index, m.index + m.length),
      matched: true,
      ordinal: i + 1,
    });
    pos = m.index + m.length;
  });
  if (pos < text.length)
    out.push({ text: text.slice(pos), matched: false, ordinal: 0 });
  return out;
}

export function replaceWith(
  pattern: string,
  text: string,
  flags: string,
  replacement: string,
): string {
  const { re, error } = buildRegex(pattern, flags);
  if (!re || error) return "";
  return text.replace(re, replacement);
}
