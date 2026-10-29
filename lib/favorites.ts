"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { getCategories, type ToolDefinition } from "./tools";

const STORAGE_KEY = "tool:favorites";

/** Read the persisted set of favourited tool IDs. */
function read(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function write(ids: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    /* silently ignore */
  }
}

let _cached: Set<string> | null = null;
const _listeners = new Set<(s: Set<string>) => void>();

function subscribe(cb: (s: Set<string>) => void) {
  _listeners.add(cb);
  return () => {
    _listeners.delete(cb);
  };
}

function notify() {
  const s = read();
  _cached = s;
  for (const cb of _listeners) cb(s);
}

/** Snapshot of the current favourites — safe to call during SSR (returns empty). */
export function getSnapshot(): Set<string> {
  if (typeof window === "undefined") return new Set();
  if (_cached === null) _cached = read();
  return _cached;
}

const noFavourites: Set<string> = new Set();

/** SSR and hydration must render the same tree, so both start empty; the
 *  client set arrives right after hydration. */
function getServerSnapshot(): Set<string> {
  return noFavourites;
}

/** Toggle a tool ID in / out of the favourites list. */
export function toggleFavourite(id: string) {
  const s = getSnapshot();
  if (s.has(id)) s.delete(id);
  else s.add(id);
  write(s);
  notify();
}

/** React hook that returns the current set and a toggle callback. */
export function useFavourites() {
  const favs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback((id: string) => {
    toggleFavourite(id);
  }, []);

  const has = useCallback((id: string) => favs.has(id), [favs]);
  return useMemo(() => ({ favs, toggle, has }), [favs, toggle, has]);
}

/** Build a synthetic "Favourites" category from the registry. Returns null
 *  when nothing is starred so callers can show an empty state. */
export function getFavouritesCategory(ids: Set<string>) {
  if (ids.size === 0) return null;

  const allTools = getCategories().flatMap((c) => c.tools);
  const tools: ToolDefinition[] = [];
  for (const id of ids) {
    const t = allTools.find((x) => x.id === id);
    if (t) tools.push(t);
  }
  if (tools.length === 0) return null;

  // Reuse the first tool's category name slot but label it "Favourites".
  return { name: "Favourites", tools };
}
