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

export const OPERATION_LABELS: { value: LineOperation; label: string }[] = [
  { value: "sort-asc", label: "Sort A→Z" },
  { value: "sort-desc", label: "Sort Z→A" },
  { value: "sort-length", label: "Sort by length" },
  { value: "sort-random", label: "Shuffle" },
  { value: "unique", label: "Remove duplicates" },
  { value: "remove-empty", label: "Remove empty lines" },
  { value: "trim-lines", label: "Trim each line" },
  { value: "collapse-blank", label: "Collapse blank lines" },
  { value: "reverse", label: "Reverse order" },
  { value: "number", label: "Add line numbers" },
  { value: "unnumber", label: "Strip line numbers" },
  { value: "dedent", label: "Remove common indent" },
  { value: "join-lines", label: "Join into one line" },
];

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
  if (x.trim() !== "" && y.trim() !== "" && Number.isFinite(numX) && Number.isFinite(numY))
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
): { output: string; note: string } {
  const all = splitLines(text);
  const lines = options.keepEmpty ? all : all.filter((l) => l.trim() !== "");
  let out = lines.slice();
  let note = "";

  switch (operation) {
    case "sort-asc":
      out.sort((a, b) => compare(a, b, options.ignoreCase));
      note = options.ignoreCase ? "case-insensitive, numbers by value" : "numbers by value";
      break;
    case "sort-desc":
      out.sort((a, b) => -compare(a, b, options.ignoreCase));
      note = "reversed";
      break;
    case "sort-length":
      out.sort((a, b) => a.length - b.length || compare(a, b, options.ignoreCase));
      note = "shortest first";
      break;
    case "sort-random": {
      const roll = new Uint32Array(out.length);
      crypto.getRandomValues(roll);
      out = out
        .map((line, i) => ({ line, roll: roll[i] }))
        .sort((a, b) => a.roll - b.roll)
        .map((x) => x.line);
      note = "shuffled with the Web Crypto RNG";
      break;
    }
    case "unique": {
      const before = out.length;
      out = unique(out, options.ignoreCase);
      note = `${before - out.length} duplicate line(s) removed`;
      break;
    }
    case "remove-empty":
      out = all.filter((l) => l.trim() !== "");
      note = `${all.length - out.length} empty line(s) removed`;
      break;
    case "trim-lines":
      out = out.map((l) => l.trim());
      note = "leading and trailing space removed";
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
      note = "runs of blank lines reduced to one";
      break;
    }
    case "reverse":
      out = out.reverse();
      break;
    case "number": {
      const width = String(out.length).length;
      out = out.map((line, i) => `${String(i + 1).padStart(width, "0")}. ${line}`);
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
      note = `${changed} line(s) stripped`;
      break;
    }
    case "dedent": {
      const indents = out
        .filter((l) => l.trim() !== "")
        .map((l) => /^[\t ]*/.exec(l)![0].replace(/\t/g, "  ").length);
      const common = indents.length ? Math.min(...indents) : 0;
      out = out.map((l) => l.slice(Math.min(common, /^[\t ]*/.exec(l)![0].length)));
      note = `removed ${common} column(s) of common indent`;
      break;
    }
    case "join-lines":
      return {
        output: lines.join(options.separator),
        note: `${lines.length} line(s) joined`,
      };
  }

  return { output: out.join("\n"), note };
}
