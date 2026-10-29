import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { categorySlug, tools } from "./tools";
import { recentToolIds } from "./recentTools";
import { getSnapshot as favoriteIds } from "./favorites";

/** Hover/focus prefetch for tool links: route data and its chunks now, nothing
 *  eager. The default viewport prefetch would queue every visible link's
 *  segment (39 links, ~130 KB on the home page alone). */
export function useToolIntent() {
  const router = useRouter();
  return (href: string) => {
    router.prefetch(href);
  };
}

let warmupStarted = false;

/**
 * After the page settles, walk every tool in small steps and warm both its
 * route data and its chunk. Revisits are already instant; this gives first
 * visits the same caches without the eager-viewport-prefetch storm.
 * Favourites come first in sidebar order, then recently opened tools, then
 * the registry order shown in the sidebar, so the tools most likely to be
 * opened next are covered within the first couple of requests. Skipped on
 * metered or 2G connections, and only once per full page load.
 */
export function useToolWarmup() {
  const router = useRouter();

  useEffect(() => {
    type Connection = { saveData?: boolean; effectiveType?: string };
    const connection = (navigator as Navigator & { connection?: Connection })
      .connection;
    if (connection?.saveData || connection?.effectiveType?.includes("2g")) {
      return;
    }

    const favorites = [...favoriteIds()];
    const favoriteRank = new Map(favorites.map((id, index) => [id, index]));
    const priority = [
      ...favorites,
      ...recentToolIds().filter((id) => !favoriteRank.has(id)),
    ];
    const rank = new Map(priority.map((id, index) => [id, index]));
    const queue = tools
      .map((tool, index) => ({ tool, index }))
      .sort(
        (a, b) =>
          (rank.get(a.tool.id) ?? priority.length) -
            (rank.get(b.tool.id) ?? priority.length) || a.index - b.index,
      )
      .map(({ tool }) => ({
        id: tool.id,
        href: `/${categorySlug(tool.category)}/${tool.id}`,
      }));

    let timer: number | undefined;
    let stopped = false;
    const stop = () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
    };
    const run = () => {
      if (stopped) return;
      const entry = queue.shift();
      if (!entry) return;
      router.prefetch(entry.href);
      timer = window.setTimeout(run, 80);
    };
    const start = () => {
      if (warmupStarted) return;
      warmupStarted = true;
      run();
    };

    // Warm-up is a background nicety; the moment the user does anything it is
    // competing with the work they are waiting for, so it yields for good.
    const opts = { capture: true, passive: true } as const;
    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    for (const name of events) window.addEventListener(name, stop, opts);

    let idle: number | undefined;
    let idleKind: "idle" | "timer" = "idle";
    const schedule = () => {
      if (window.requestIdleCallback) {
        idleKind = "idle";
        idle = window.requestIdleCallback(start, { timeout: 3000 });
      } else {
        idleKind = "timer";
        idle = window.setTimeout(start, 2000);
      }
    };
    const onLoad = () => {
      idleKind = "timer";
      idle = window.setTimeout(schedule, 1500);
    };
    // The page's own chunks are still arriving right after `load`; walking the
    // queue then would just take bandwidth from the tool the user opened.
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      if (idle) {
        if (idleKind === "idle") window.cancelIdleCallback?.(idle);
        else window.clearTimeout(idle);
      }
      window.removeEventListener("load", onLoad);
      for (const name of events) window.removeEventListener(name, stop, opts);
    };
  }, [router]);
}
