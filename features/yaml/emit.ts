export interface YamlToTextResult {
  output: string;
  error: string | null;
}

/* ------------------------------------------------------------------ *
 * JSON value -> YAML (block style, configurable indent)
 * ------------------------------------------------------------------ */

const PLAIN_SAFE = /^[A-Za-z_][A-Za-z0-9_ .\-/@]*$/;

function needsQuote(text: string): boolean {
  if (text === "") return true;
  if (text !== text.trim()) return true;
  if (/^[-?:,[\]{}#&*!|>'"%@`]/.test(text)) return true;
  if (text.includes(": ") || text.endsWith(":")) return true;
  if (/^(true|false|null|~|yes|no|on|off)$/i.test(text)) return true;
  if (!Number.isNaN(Number(text))) return true;
  return /[\n\t]/.test(text);
}

function quote(text: string): string {
  let out = '"';
  for (const ch of text) {
    if (ch === '"') out += '\\"';
    else if (ch === "\\") out += "\\\\";
    else if (ch === "\n") out += "\\n";
    else if (ch === "\t") out += "\\t";
    else if (ch === "\r") out += "\\r";
    else out += ch;
  }
  return out + '"';
}

function scalar(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : ".nan";
  if (typeof value === "string") return needsQuote(value) ? quote(value) : value;
  return quote(String(value));
}

function keyText(key: string): string {
  return PLAIN_SAFE.test(key) && !needsQuote(key) ? key : quote(key);
}

function isPlain(value: unknown): boolean {
  if (value === null || typeof value !== "object") return true;
  return Object.keys(value as object).length === 0;
}

function plainForm(value: unknown): string {
  if (Array.isArray(value)) return "[]";
  if (value && typeof value === "object") return "{}";
  return scalar(value);
}

/** `key:` followed by indented children, or `key: plain` on one line. */
function emitEntry(
  key: string,
  value: unknown,
  pad: string,
  unit: string,
  out: string[],
): void {
  if (isPlain(value)) {
    out.push(`${pad}${keyText(key)}: ${plainForm(value)}`);
    return;
  }
  out.push(`${pad}${keyText(key)}:`);
  emit(value, pad + unit, unit, out);
}

function emit(value: unknown, pad: string, unit: string, out: string[]): void {
  if (Array.isArray(value)) {
    for (const item of value) {
      if (isPlain(item)) {
        out.push(`${pad}- ${plainForm(item)}`);
        continue;
      }
      if (Array.isArray(item)) {
        out.push(`${pad}-`);
        emit(item, pad + unit, unit, out);
        continue;
      }
      // Map item: the first entry shares the line with the dash.
      const entries = Object.entries(item as Record<string, unknown>);
      const bulletPad = pad + "- ";
      const contPad = pad + " ".repeat(2);
      entries.forEach(([k, v], idx) =>
        emitEntry(k, v, idx === 0 ? bulletPad : contPad, unit, out),
      );
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>))
      emitEntry(k, v, pad, unit, out);
    return;
  }
  out.push(`${pad}${scalar(value)}`);
}

export function jsonToYaml(value: unknown, indent: number): string {
  if (isPlain(value) && typeof value !== "object") return `${scalar(value)}\n`;
  const unit = " ".repeat(indent);
  const out: string[] = [];
  emit(value, "", unit, out);
  return out.join("\n") + "\n";
}
