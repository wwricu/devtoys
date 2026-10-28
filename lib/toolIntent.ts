import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { categorySlug, tools } from "./tools";
import { preloadTool } from "./toolModule";
import { recentToolIds } from "./recentTools";
import { getSnapshot as favoriteIds } from "./favorites";

/** Hover/focus prefetch for tool links: route data now, chunk now, nothing
 *  eager. The default viewport prefetch would queue every visible link's
 *  segment (39 links, ~130 KB on the home page alone). */
export function useToolIntent() {
  const router = useRouter();
  return (href: string, id?: string) => {
    router.prefetch(href);
    if (id) preloadTool(id);
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
    const run = () => {
      const entry = queue.shift();
      if (!entry) return;
      router.prefetch(entry.href);
      preloadTool(entry.id);
      timer = window.setTimeout(run, 80);
    };
    const start = () => {
      if (warmupStarted) return;
      warmupStarted = true;
      run();
    };

    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(start, { timeout: 2000 })
      : window.setTimeout(start, 1000);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.cancelIdleCallback?.(idle);
    };
  }, [router]);
}
