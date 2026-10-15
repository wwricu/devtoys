"use client";

import { useCallback, useEffect, useState } from "react";
import { getCategories, getCategory, type ToolDefinition } from "./tools";

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

/** Toggle a tool ID in / out of the favourites list. */
export function toggleFavourite(id: string) {
  const s = getSnapshot();
  if (s.has(id)) s.delete(id);
  else s.add(id);
  write(s);
  notify();
}

export function isFavourite(id: string): boolean {
  return getSnapshot().has(id);
}

/** React hook that returns the current set and a toggle callback. */
export function useFavourites() {
  const [favs, setFavs] = useState<Set<string>>(getSnapshot);

  useEffect(() => {
    return subscribe(setFavs);
  }, []);

  const toggle = useCallback((id: string) => {
    toggleFavourite(id);
  }, []);

  return { favs, toggle, has: (id: string) => favs.has(id) };
}

/** Build a synthetic "Favourites" category from the registry. Returns undefined
 *  when nothing is starred so the sidebar can hide it entirely. */
export function getFavouritesCategory() {
  const ids = getSnapshot();
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
