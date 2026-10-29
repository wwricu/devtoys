/**
 * Lorem ipsum filler text. Word choice uses `crypto.getRandomValues`, so the
 * output is not predictable from the page.
 */

const WORDS =
  `lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor
incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation
ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate
velit esse cillum eu fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt
culpa qui officia deserunt mollit anim id est laborum perspiciatis unde omnis iste natus error
sit voluptatem accusantium doloremque laudantium totam rem aperiam eaque ipsa quae inventore
veritatis et quasi architecto beatae vitae dicta explicabo facere possimus assumenda quia
consequatur vitae provident quas voluptates quas nostrum blanditiis saepe voluptatem minima`.split(
    /\s+/,
  );

const TRADITIONAL =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua";

export type LoremUnit = "words" | "sentences" | "paragraphs";

export interface LoremOptions {
  unit: LoremUnit;
  count: number;
  /** Wrap paragraphs in <p> tags */
  html: boolean;
  /** Always begin with the traditional opening sentence */
  traditional: boolean;
}

function pick(min: number, max: number): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return min + (buffer[0] % (max - min + 1));
}

function word(): string {
  return WORDS[pick(0, WORDS.length - 1)];
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function sentence(): string {
  const length = pick(6, 16);
  const parts: string[] = [];
  for (let index = 0; index < length; index++) parts.push(word());
  const comma = pick(2, Math.max(3, length - 3));
  parts[comma] = `${parts[comma]},`;
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function paragraph(traditional: boolean): string {
  const count = pick(3, 7);
  const out: string[] = [];
  if (traditional) out.push(TRADITIONAL);
  for (let index = out.length; index < count; index++) out.push(sentence());
  return `${capitalise(out.join(". "))}.`;
}

export function generateLorem(options: LoremOptions): string {
  const count = Math.min(500, Math.max(1, Math.round(options.count) || 1));
  if (options.unit === "words") {
    const out: string[] = [];
    for (let index = 0; index < count; index++) out.push(word());
    const text = `${capitalise(out.join(" "))}.`;
    return options.html ? `<p>${text}</p>` : text;
  }
  if (options.unit === "sentences") {
    const out: string[] = [];
    for (let index = 0; index < count; index++) {
      out.push(
        capitalise(
          index === 0 && options.traditional ? TRADITIONAL : sentence(),
        ),
      );
    }
    const text = out.map((part) => `${part.replace(/\.$/, "")}.`).join(" ");
    return options.html ? `<p>${text}</p>` : text;
  }
  const out: string[] = [];
  for (let index = 0; index < count; index++) {
    out.push(paragraph(options.traditional && index === 0));
  }
  return options.html
    ? out.map((part) => `<p>${part}</p>`).join("\n\n")
    : out.join("\n\n");
}

/** Word and character counts for the status line */
export function loremStats(text: string): {
  words: number;
  characters: number;
} {
  return {
    words: (text.match(/\S+/g) ?? []).length,
    characters: text.length,
  };
}
