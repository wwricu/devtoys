/**
 * Code 128 (ISO/IEC 15417) encodings rendered as SVG bars.
 * The 107 symbol patterns are the standard width sequences: six elements per
 * symbol (bar, space, …) totalling 11 modules, seven for the stop symbol.
 */

const PATTERNS = [
  "212222",
  "222122",
  "222221",
  "121223",
  "121322",
  "131222",
  "122213",
  "122312",
  "132212",
  "221213",
  "221312",
  "231212",
  "112232",
  "122132",
  "122231",
  "113222",
  "123122",
  "123221",
  "223211",
  "221132",
  "221231",
  "213212",
  "223112",
  "312131",
  "311222",
  "321122",
  "321221",
  "312212",
  "322112",
  "322211",
  "212123",
  "212321",
  "232121",
  "111323",
  "131123",
  "131321",
  "112313",
  "132113",
  "132311",
  "211313",
  "231113",
  "231311",
  "112133",
  "112331",
  "132131",
  "113123",
  "113321",
  "133121",
  "313121",
  "211331",
  "231131",
  "213113",
  "213311",
  "213131",
  "311123",
  "311321",
  "331121",
  "312113",
  "312311",
  "332111",
  "314111",
  "221411",
  "431111",
  "111224",
  "111422",
  "121124",
  "121421",
  "141122",
  "141221",
  "112214",
  "112412",
  "122114",
  "122411",
  "142112",
  "142211",
  "241211",
  "221114",
  "413111",
  "241112",
  "134111",
  "111242",
  "121142",
  "121241",
  "114212",
  "124112",
  "124211",
  "411212",
  "421112",
  "421211",
  "212141",
  "214121",
  "412121",
  "111143",
  "111341",
  "131141",
  "114113",
  "114311",
  "411113",
  "411311",
  "113141",
  "114131",
  "311141",
  "411131",
  "211412",
  "211214",
  "211232",
  "2331112",
];

const START_A = 103;
const START_B = 104;
const START_C = 105;
const STOP = 106;
const SWA = 101;
const SWB = 100;
const SWC = 99;
const SHIFT = 98;

export type CodeSet = "A" | "B" | "C";

export interface Code128Symbol {
  /** Index into the pattern table; this is what the check digit sums over */
  value: number;
  codeset: CodeSet;
  role: "start" | "data" | "switch" | "checksum" | "stop";
  /** The characters this symbol stands for */
  source: string;
}

export interface Code128Result {
  symbols: Code128Symbol[];
  /** Element widths in modules, bars first */
  widths: number[];
  quietZone: number;
  checksum: number;
  error: string | null;
}

const isDigit = (char: string) => char >= "0" && char <= "9";

function controlLabel(char: string): string {
  const code = char.charCodeAt(0);
  if (code < 32) return `^${String.fromCharCode(code === 0 ? 64 : code + 64)}`;
  if (code === 127) return "^?";
  return char;
}

function valueInCodeSet(char: string, codeset: CodeSet): number | null {
  const code = char.charCodeAt(0);
  if (codeset === "C") return null;
  if (codeset === "B") return code >= 32 && code <= 127 ? code - 32 : null;
  // Code A holds the printable range up to "_" plus the control characters.
  if (code >= 32 && code <= 95) return code - 32;
  if (code < 32) return code + 64;
  return null;
}

/** Longest digit run starting at `at` */
function digitRun(text: string, at: number): number {
  let length = 0;
  while (at + length < text.length && isDigit(text[at + length])) length++;
  return length;
}

/** Control characters only exist in Code A, everything else fits Code B */
function wantsCodeSet(char: string): CodeSet {
  return char.charCodeAt(0) < 32 ? "A" : "B";
}

export function encodeCode128(text: string): Code128Result {
  const empty: Code128Result = {
    symbols: [],
    widths: [],
    quietZone: 0,
    checksum: 0,
    error: null,
  };
  if (text === "") return { ...empty, error: "Enter the text to encode" };

  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code > 127)
      return {
        ...empty,
        error: `“${char}” (code point ${code}) is outside ASCII; Code 128 encodes 0-127 only`,
      };
  }

  const symbols: Code128Symbol[] = [];
  const firstRun = digitRun(text, 0);
  const numericOnly = firstRun === text.length;

  let codeset: CodeSet;
  if (numericOnly && text.length % 2 === 0) {
    codeset = "C";
    symbols.push({ value: START_C, codeset: "C", role: "start", source: "" });
  } else {
    codeset = wantsCodeSet(text[0]);
    symbols.push({
      value: codeset === "A" ? START_A : START_B,
      codeset,
      role: "start",
      source: "",
    });
  }

  let at = 0;
  while (at < text.length) {
    if (codeset === "C") {
      const run = digitRun(text, at);
      if (run === 0) {
        codeset = wantsCodeSet(text[at]);
        symbols.push({
          value: codeset === "A" ? SWA : SWB,
          codeset,
          role: "switch",
          source: controlLabel(text[at]),
        });
        continue;
      }
      const pairs = Math.floor(Math.min(run, text.length - at) / 2);
      if (pairs === 0) {
        codeset = wantsCodeSet(text[at]);
        symbols.push({
          value: codeset === "A" ? SWA : SWB,
          codeset,
          role: "switch",
          source: controlLabel(text[at]),
        });
        continue;
      }
      for (let pair = 0; pair < pairs; pair++) {
        const source = text.slice(at + pair * 2, at + pair * 2 + 2);
        symbols.push({
          value: Number(source),
          codeset: "C",
          role: "data",
          source,
        });
      }
      at += pairs * 2;
      continue;
    }

    const run = digitRun(text, at);
    const atStart = at === 0;
    const endsText = at + run === text.length;
    const worthC =
      run >= 4 &&
      (atStart || endsText || run >= 6) &&
      (!endsText || run % 2 === 0 || run > 4);
    if (worthC) {
      const pairs = Math.floor(run / 2);
      symbols.push({ value: SWC, codeset: "C", role: "switch", source: "" });
      codeset = "C";
      for (let pair = 0; pair < pairs; pair++) {
        const source = text.slice(at + pair * 2, at + pair * 2 + 2);
        symbols.push({
          value: Number(source),
          codeset: "C",
          role: "data",
          source,
        });
      }
      at += pairs * 2;
      continue;
    }

    const char = text[at];
    const value = valueInCodeSet(char, codeset);
    if (value === null) {
      const other: CodeSet = codeset === "A" ? "B" : "A";
      const switched = valueInCodeSet(char, other);
      if (switched === null)
        return { ...empty, symbols: [], error: "Character cannot be encoded" };
      if (wantsCodeSet(text[at + 1] ?? " ") === codeset) {
        // SHIFT covers one symbol, so no switch back is needed.
        symbols.push({ value: SHIFT, codeset, role: "switch", source: "" });
        symbols.push({
          value: switched,
          codeset: other,
          role: "data",
          source: controlLabel(char),
        });
        at++;
        continue;
      }
      symbols.push({
        value: other === "A" ? SWA : SWB,
        codeset: other,
        role: "switch",
        source: controlLabel(char),
      });
      codeset = other;
      symbols.push({
        value: switched,
        codeset: other,
        role: "data",
        source: controlLabel(char),
      });
      at++;
      continue;
    }
    symbols.push({ value, codeset, role: "data", source: controlLabel(char) });
    at++;
  }

  let sum = symbols[0].value;
  symbols.slice(1).forEach((symbol, index) => {
    sum += symbol.value * (index + 1);
  });
  const checksum = sum % 104;
  symbols.push({ value: checksum, codeset, role: "checksum", source: "" });
  symbols.push({ value: STOP, codeset, role: "stop", source: "" });

  return {
    symbols,
    widths: widthsOf(symbols),
    quietZone: 10,
    checksum,
    error: null,
  };
}

function widthsOf(symbols: Code128Symbol[]): number[] {
  const widths: number[] = [];
  for (const symbol of symbols) {
    for (const digit of PATTERNS[symbol.value]) widths.push(Number(digit));
  }
  return widths;
}

/** Total length in modules, quiet zones included */
export function moduleCount(
  result: Code128Result,
  quietZone = result.quietZone,
): number {
  return (
    result.widths.reduce((total, width) => total + width, 0) + quietZone * 2
  );
}

export interface SvgOptions {
  /** Module width in pixels */
  width: number;
  height: number;
  quietZone: number;
  /** Print the encoded text under the bars */
  showText: boolean;
  fontScale: number;
}

export const defaultSvgOptions: SvgOptions = {
  width: 2,
  height: 60,
  quietZone: 10,
  showText: true,
  fontScale: 0.22,
};

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderSvg(
  result: Code128Result,
  source: string,
  options: SvgOptions,
): string {
  const unit = Math.max(1, Math.round(options.width));
  const height = Math.max(10, Math.round(options.height));
  const quiet = Math.max(0, Math.round(options.quietZone)) * unit;
  const bars = result.widths.reduce((total, width) => total + width, 0) * unit;
  const total = bars + quiet * 2;
  const showText = options.showText && source !== "";
  const fontSize = showText
    ? Math.max(8, Math.round(height * options.fontScale))
    : 0;
  const textHeight = showText ? fontSize + 4 : 0;
  const totalHeight = height + textHeight;

  const rects: string[] = [];
  let x = quiet;
  for (let index = 0; index < result.widths.length; index++) {
    if (index % 2 === 0) {
      rects.push(
        `<rect x="${x}" width="${result.widths[index] * unit}" height="${height}"/>`,
      );
    }
    x += result.widths[index] * unit;
  }
  const label = showText
    ? `<text x="${total / 2}" y="${height + fontSize + 2}" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="${fontSize}" text-anchor="middle">${escapeXml(source)}</text>`
    : "";

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${totalHeight}" width="${total}" height="${totalHeight}" shape-rendering="crispEdges">`,
    `<rect width="${total}" height="${totalHeight}" fill="#fff"/>`,
    `<g fill="#000">${rects.join("")}</g>`,
    label,
    `</svg>`,
  ].join("");
}

/** Human readable summary of which code sets the encoder settled on */
export function codesetSummary(result: Code128Result): string {
  const used = new Set<CodeSet>();
  let switches = 0;
  for (const symbol of result.symbols) {
    if (symbol.role === "switch") switches++;
    else if (symbol.role === "data") used.add(symbol.codeset);
  }
  const sets = (["A", "B", "C"] as CodeSet[]).filter((set) => used.has(set));
  return `${sets.join("/")} · ${result.symbols.length} symbols · check digit ${result.checksum}${
    switches ? ` · ${switches} code set switch${switches > 1 ? "es" : ""}` : ""
  }`;
}

export function describe(result: Code128Result): string {
  return result.symbols
    .map(
      (symbol) =>
        `${symbol.role} ${symbol.value} ${symbol.codeset} "${symbol.source}"`,
    )
    .join("\n");
}
