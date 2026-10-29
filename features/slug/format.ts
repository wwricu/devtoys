/**
 * URL slugs. Accented letters are folded to their base form with Unicode
 * normalisation, so `Cafétería` becomes `cafeteria`.
 */

const COMBINING_MARKS = /[\u0300-\u036f]/g;

export interface SlugOptions {
  separator: "-" | "_" | " ";
  lower: boolean;
  maxLength: number;
  /** Keep characters from scripts other than Latin */
  preserveUnicode: boolean;
}

function stripAccents(text: string): string {
  return text.normalize("NFD").replace(COMBINING_MARKS, "");
}

export function slugify(input: string, options: SlugOptions): string {
  let text = stripAccents(input.trim());
  if (options.lower) text = text.toLowerCase();
  const allowed = options.preserveUnicode ? /[\p{L}\p{N}]+/gu : /[A-Za-z0-9]+/g;
  const words = text.match(allowed) ?? [];
  let slug = words.join(options.separator);
  if (options.maxLength > 0 && slug.length > options.maxLength) {
    const cut = slug.slice(0, options.maxLength);
    // Keep the cut when it lands on a boundary, otherwise drop the last word.
    if (slug[options.maxLength] !== options.separator) {
      const last = cut.lastIndexOf(options.separator);
      slug = last > 0 ? cut.slice(0, last) : cut;
    } else {
      slug = cut;
    }
  }
  return slug;
}

/** Word counts before and after, for the status line */
export function slugStats(
  input: string,
  slug: string,
  separator: string,
): { words: number; parts: number } {
  const words = (input.trim().match(/\S+/g) ?? []).length;
  const parts = slug === "" ? 0 : slug.split(separator).length;
  return { words, parts };
}
