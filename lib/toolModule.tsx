"use client";

import { createElement, useEffect, useSyncExternalStore, type ComponentType } from "react";
import { toolLoaders } from "./toolPreload";
import { rememberTool } from "./recentTools";

const loaded = new Map<string, ComponentType>();
const listeners = new Set<() => void>();

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => {
    listeners.delete(notify);
  };
}

/** Fetch a tool's chunk without mounting it. Called on hover/focus so the
 *  click finds the component in memory. */
export function preloadTool(id: string) {
  const load = toolLoaders[id];
  if (!load || loaded.has(id)) return;
  void load().then((m) => {
    loaded.set(id, m.default);
    for (const notify of listeners) notify();
  });
}

/** Cache-first mount. A warmed chunk renders on the first pass instead of
 *  committing an empty Suspense fallback, which React then throttles for
 *  ~300ms before revealing the real content. */
export function ToolMount({ id }: { id: string }) {
  useEffect(() => {
    preloadTool(id);
    rememberTool(id);
  }, [id]);
  const Tool = useSyncExternalStore(
    subscribe,
    () => loaded.get(id) ?? null,
    () => null,
  );
  return Tool ? createElement(Tool) : null;
}
