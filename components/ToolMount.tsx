"use client";

import { useSyncExternalStore, type ReactNode } from "react";

const subscribe = () => () => {};

/** Renders the tool after hydration. Clocks, random ids and storage are read
 *  only in the browser, so prerendering the body would bake values that the
 *  client cannot reproduce; the chunk itself ships with the route. */
export function ToolMount({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  return mounted ? <>{children}</> : null;
}
