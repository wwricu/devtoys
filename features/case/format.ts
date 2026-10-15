export function splitWords(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean);
}

const cap = (w: string) => w[0].toUpperCase() + w.slice(1).toLowerCase();
const low = (w: string) => w.toLowerCase();

export interface CaseResult {
  label: string;
  value: string;
}

export function toCases(text: string): CaseResult[] {
  const w = splitWords(text);
  if (w.length === 0) return [];
  return [
    { label: "camelCase", value: w.map(low).map((x, i) => (i ? cap(x) : x)).join("") },
    { label: "PascalCase", value: w.map(cap).join("") },
    { label: "snake_case", value: w.map(low).join("_") },
    { label: "SCREAMING_SNAKE", value: w.map((x) => x.toUpperCase()).join("_") },
    { label: "kebab-case", value: w.map(low).join("-") },
    { label: "Train-Case", value: w.map(cap).join("-") },
    { label: "Sentence case", value: cap(w.map(low).join(" ")) },
    { label: "Title Case", value: w.map(cap).join(" ") },
    { label: "lower case", value: w.map(low).join(" ") },
    { label: "UPPER CASE", value: w.map((x) => x.toUpperCase()).join(" ") },
  ];
}
