export type LineOperation =
  | "sort-asc"
  | "sort-desc"
  | "sort-length"
  | "sort-random"
  | "unique"
  | "remove-empty"
  | "trim-lines"
  | "collapse-blank"
  | "reverse"
  | "number"
  | "unnumber"
  | "dedent"
  | "join-lines";

/** Which remark the UI shows next to the result; labels live in locale.ts. */
export type LineNoteKey =
  | "sortCaseInsensitive"
  | "sortNumeric"
  | "sortReversed"
  | "sortShortest"
  | "shuffled"
  | "removedDuplicates"
  | "removedEmpty"
  | "trimmed"
  | "collapsed"
  | "strippedNumbers"
  | "dedented"
  | "joined";

export interface LineNote {
  key: LineNoteKey;
  /** count of affected lines, when the remark reports one */
  count?: number;
}

export interface LineOptions {
  ignoreCase: boolean;
  keepEmpty: boolean;
  separator: string;
}

function splitLines(text: string): string[] {
  if (text === "") return [];
  return text.replace(/\r\n?/g, "\n").split("\n");
}

function compare(a: string, b: string, ignoreCase: boolean): number {
  const x = ignoreCase ? a.toLowerCase() : a;
  const y = ignoreCase ? b.toLowerCase() : b;
  const numX = Number(x);
  const numY = Number(y);
  // numeric lines sort by value, which is what a list of measurements needs
  if (
    x.trim() !== "" &&
    y.trim() !== "" &&
    Number.isFinite(numX) &&
    Number.isFinite(numY)
  )
    return numX - numY || x.localeCompare(y);
  return x.localeCompare(y, undefined, { numeric: true, sensitivity: "base" });
}

function unique(lines: string[], ignoreCase: boolean): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of lines) {
    const key = ignoreCase ? line.toLowerCase() : line;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

const NUMBERED = /^(\s*)(\d+)([.)]\s|:\s|\s{1,3})(.*)$/;

export function applyLines(
  text: string,
  operation: LineOperation,
  options: LineOptions,
): { output: string; note: LineNote | null } {
  const all = splitLines(text);
  const lines = options.keepEmpty ? all : all.filter((l) => l.trim() !== "");
  let out = lines.slice();
  let note: LineNote | null = null;

  switch (operation) {
    case "sort-asc":
      out.sort((a, b) => compare(a, b, options.ignoreCase));
      note = options.ignoreCase
        ? { key: "sortCaseInsensitive" }
        : { key: "sortNumeric" };
      break;
    case "sort-desc":
      out.sort((a, b) => -compare(a, b, options.ignoreCase));
      note = { key: "sortReversed" };
      break;
    case "sort-length":
      out.sort(
        (a, b) => a.length - b.length || compare(a, b, options.ignoreCase),
      );
      note = { key: "sortShortest" };
      break;
    case "sort-random": {
      const roll = new Uint32Array(out.length);
      crypto.getRandomValues(roll);
      out = out
        .map((line, i) => ({ line, roll: roll[i] }))
        .sort((a, b) => a.roll - b.roll)
        .map((x) => x.line);
      note = { key: "shuffled" };
      break;
    }
    case "unique": {
      const before = out.length;
      out = unique(out, options.ignoreCase);
      note = { key: "removedDuplicates", count: before - out.length };
      break;
    }
    case "remove-empty":
      out = all.filter((l) => l.trim() !== "");
      note = { key: "removedEmpty", count: all.length - out.length };
      break;
    case "trim-lines":
      out = out.map((l) => l.trim());
      note = { key: "trimmed" };
      break;
    case "collapse-blank": {
      const kept: string[] = [];
      let blank = 0;
      for (const line of all) {
        if (line.trim() === "") {
          blank++;
          if (blank > 1) continue;
        } else blank = 0;
        kept.push(line);
      }
      out = kept;
      note = { key: "collapsed" };
      break;
    }
    case "reverse":
      out = out.reverse();
      break;
    case "number": {
      const width = String(out.length).length;
      out = out.map(
        (line, i) => `${String(i + 1).padStart(width, "0")}. ${line}`,
      );
      break;
    }
    case "unnumber": {
      let changed = 0;
      out = out.map((line) => {
        const match = NUMBERED.exec(line);
        if (!match) return line;
        changed++;
        return match[1] + match[4];
      });
      note = { key: "strippedNumbers", count: changed };
      break;
    }
    case "dedent": {
      const indents = out
        .filter((l) => l.trim() !== "")
        .map((l) => /^[\t ]*/.exec(l)![0].replace(/\t/g, "  ").length);
      const common = indents.length ? Math.min(...indents) : 0;
      out = out.map((l) =>
        l.slice(Math.min(common, /^[\t ]*/.exec(l)![0].length)),
      );
      note = { key: "dedented", count: common };
      break;
    }
    case "join-lines":
      return {
        output: lines.join(options.separator),
        note: { key: "joined", count: lines.length },
      };
  }

  return { output: out.join("\n"), note };
}
