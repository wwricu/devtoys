export interface TextStats {
  characters: number;
  charactersNoSpaces: number;
  words: number;
  uniqueWords: number;
  sentences: number;
  paragraphs: number;
  lines: number;
  bytes: number;
  avgWordLength: number;
  longestWord: string;
  readingSeconds: number;
  speakingSeconds: number;
  frequencies: { word: string; count: number }[];
}

const WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}'’\-]*/gu;

export function computeStats(text: string): TextStats {
  const words = text.match(WORD_RE) ?? [];
  const lower = words.map((w) => w.toLowerCase());
  const counts = new Map<string, number>();
  for (const w of lower) counts.set(w, (counts.get(w) ?? 0) + 1);

  const frequencies = [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 20)
    .map(([word, count]) => ({ word, count }));

  const trimmed = text.trim();
  const sentences =
    trimmed === "" ? 0 : (trimmed.match(/[.!?]+(\s|$)/g) ?? []).length;
  const paragraphs =
    trimmed === ""
      ? 0
      : trimmed.split(/\n\s*\n/).filter((p) => p.trim() !== "").length;
  const lines = text === "" ? 0 : text.split(/\r?\n/).length;
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), "");
  const chars = [...text].length;
  const totalWordLength = lower.reduce((sum, w) => sum + w.length, 0);

  return {
    characters: chars,
    charactersNoSpaces: text.replace(/\s/g, "").length,
    words: words.length,
    uniqueWords: counts.size,
    sentences,
    paragraphs,
    lines,
    bytes: new TextEncoder().encode(text).length,
    avgWordLength:
      words.length === 0
        ? 0
        : Math.round((totalWordLength / words.length) * 10) / 10,
    longestWord: longest,
    readingSeconds: Math.round((words.length / 200) * 60),
    speakingSeconds: Math.round((words.length / 130) * 60),
    frequencies,
  };
}

/** Split a duration for the status cards; the sentence is composed in the UI. */
export function duration(seconds: number): {
  minutes: number;
  seconds: number;
} {
  if (seconds < 60) return { minutes: 0, seconds };
  return { minutes: Math.floor(seconds / 60), seconds: seconds % 60 };
}
