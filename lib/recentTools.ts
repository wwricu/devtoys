/** Tool visit history, used to order the background warm-up: the tools this
 *  browser opened most recently are prefetched first, so switching back into
 *  them stays instant even before the full walk finishes. */
const KEY = "devtoys-recent-tools";
const LIMIT = 8;

export function rememberTool(id: string) {
  try {
    const list = recentToolIds().filter((entry) => entry !== id);
    list.unshift(id);
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, LIMIT)));
  } catch {
    /* Storage can be unavailable; only the warm-up order is affected. */
  }
}

export function recentToolIds(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}
