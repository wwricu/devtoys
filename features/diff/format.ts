export type DiffOp = "equal" | "insert" | "delete";

export interface DiffLine {
  op: DiffOp;
  text: string;
  left: number | null;
  right: number | null;
}

export interface DiffOptions {
  ignoreCase: boolean;
  ignoreWhitespace: boolean;
}

export interface DiffSummary {
  lines: DiffLine[];
  added: number;
  removed: number;
  unchanged: number;
  truncated: boolean;
}

function normalize(line: string, opts: DiffOptions): string {
  let s = line;
  if (opts.ignoreWhitespace) s = s.replace(/\s+/g, " ").trim();
  if (opts.ignoreCase) s = s.toLowerCase();
  return s;
}

function splitLines(text: string): string[] {
  if (text === "") return [];
  const lines = text.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines.map((l) => (l.endsWith("\r") ? l.slice(0, -1) : l));
}

export function diffLines(
  leftText: string,
  rightText: string,
  opts: DiffOptions,
): DiffSummary {
  const a = splitLines(leftText);
  const b = splitLines(rightText);

  let start = 0;
  while (start < a.length && start < b.length && normalize(a[start], opts) === normalize(b[start], opts))
    start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && normalize(a[endA - 1], opts) === normalize(b[endB - 1], opts)) {
    endA--;
    endB--;
  }

  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const n = midA.length;
  const m = midB.length;

  const lines: DiffLine[] = [];
  for (let i = 0; i < start; i++)
    lines.push({ op: "equal", text: a[i], left: i + 1, right: i + 1 });

  const tooBig = n * m > 4_000_000;
  if (tooBig) {
    for (let i = 0; i < n; i++)
      lines.push({ op: "delete", text: midA[i], left: start + i + 1, right: null });
    for (let j = 0; j < m; j++)
      lines.push({ op: "insert", text: midB[j], left: null, right: start + j + 1 });
  } else {
    // LCS over the changed region, walking the DP table from the end.
    const keyA = midA.map((l) => normalize(l, opts));
    const keyB = midB.map((l) => normalize(l, opts));
    const width = m + 1;
    const dir = new Uint8Array((n + 1) * width);
    const len = new Uint32Array((n + 1) * width);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        if (keyA[i] === keyB[j]) {
          len[i * width + j] = len[(i + 1) * width + j + 1] + 1;
          dir[i * width + j] = 1;
        } else if (len[(i + 1) * width + j] >= len[i * width + j + 1]) {
          len[i * width + j] = len[(i + 1) * width + j];
          dir[i * width + j] = 2;
        } else {
          len[i * width + j] = len[i * width + j + 1];
          dir[i * width + j] = 3;
        }
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      const d = dir[i * width + j];
      if (d === 1) {
        lines.push({
          op: "equal",
          text: midA[i],
          left: start + i + 1,
          right: start + j + 1,
        });
        i++;
        j++;
      } else if (d === 2) {
        lines.push({ op: "delete", text: midA[i], left: start + i + 1, right: null });
        i++;
      } else {
        lines.push({ op: "insert", text: midB[j], left: null, right: start + j + 1 });
        j++;
      }
    }
    while (i < n) {
      lines.push({ op: "delete", text: midA[i], left: start + i + 1, right: null });
      i++;
    }
    while (j < m) {
      lines.push({ op: "insert", text: midB[j], left: null, right: start + j + 1 });
      j++;
    }
  }

  const tail = a.length - endA;
  for (let k = 0; k < tail; k++) {
    const idx = endA + k;
    lines.push({
      op: "equal",
      text: a[idx],
      left: idx + 1,
      right: endB + k + 1,
    });
  }

  let added = 0;
  let removed = 0;
  let unchanged = 0;
  for (const l of lines) {
    if (l.op === "insert") added++;
    else if (l.op === "delete") removed++;
    else unchanged++;
  }
  return { lines, added, removed, unchanged, truncated: tooBig };
}

/** Unified diff text with the given number of context lines around each hunk. */
export function unifiedDiff(
  summary: DiffSummary,
  context: number,
  leftName = "left",
  rightName = "right",
): string {
  const { lines } = summary;
  const keep = new Array<boolean>(lines.length).fill(false);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].op === "equal") continue;
    for (let k = Math.max(0, i - context); k <= Math.min(lines.length - 1, i + context); k++)
      keep[k] = true;
  }

  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    if (!keep[i]) {
      i++;
      continue;
    }
    let j = i;
    while (j < lines.length && keep[j]) j++;
    let leftCount = 0;
    let rightCount = 0;
    for (let k = i; k < j; k++) {
      if (lines[k].op !== "insert") leftCount++;
      if (lines[k].op !== "delete") rightCount++;
    }
    const firstLeft = lines[i].left ?? (lines[i].right ?? 1);
    const firstRight = lines[i].right ?? (lines[i].left ?? 1);
    out.push(
      `@@ -${firstLeft},${leftCount} +${firstRight},${rightCount} @@`,
    );
    for (let k = i; k < j; k++) {
      const l = lines[k];
      const mark = l.op === "equal" ? " " : l.op === "insert" ? "+" : "-";
      out.push(`${mark}${l.text}`);
    }
    i = j;
  }
  if (out.length === 0) return "";
  return `--- ${leftName}\n+++ ${rightName}\n${out.join("\n")}`;
}
