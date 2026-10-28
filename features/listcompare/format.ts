export type CompareMode = "intersection" | "union" | "aOnly" | "bOnly";

function toLines(text: string): string[] {
  return text.split(/\r?\n/).filter((line) => line !== "");
}

/**
 * Compare two newline-separated lists. Results keep the first-seen order and
 * casing and never repeat an item.
 */
export function compareLists(
  listA: string,
  listB: string,
  mode: CompareMode,
  caseSensitive: boolean,
): string[] {
  const a = toLines(listA);
  const b = toLines(listB);
  const key = (line: string) => (caseSensitive ? line : line.toLowerCase());
  const inA = new Set(a.map(key));
  const inB = new Set(b.map(key));

  const source =
    mode === "bOnly" ? b : mode === "intersection" ? a : [...a, ...b];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const line of source) {
    const k = key(line);
    if (seen.has(k)) continue;
    if (mode === "intersection" && !inB.has(k)) continue;
    if (mode === "aOnly" && inB.has(k)) continue;
    if (mode === "bOnly" && inA.has(k)) continue;
    seen.add(k);
    result.push(line);
  }
  return result;
}
