import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { categorySlug, tools } from "./tools";
import { recentToolIds } from "./recentTools";
import { getSnapshot as favoriteIds } from "./favorites";

let warmupStarted = false;
let holdUntil = 0;

/** Hover/focus prefetch for tool links: route data and its chunks now, nothing
 *  eager. The default viewport prefetch would queue every visible link's
 *  segment (39 links, ~130 KB on the home page alone). */
export function useToolIntent() {
  const router = useRouter();
  return (href: string) => {
    // The link under the pointer is the one worth fetching first.
    hold(1200);
    router.prefetch(href);
  };
}

/** Pause the background walk: a click or a hover means the user has decided
 *  where they are going, and that request should not queue behind the sweep. */
function hold(ms: number) {
  holdUntil = Math.max(holdUntil, Date.now() + ms);
}

/**
 * After the page settles, walk every tool in small steps and warm its route
 * data and chunk. Revisits are already instant; this gives first visits the
 * same cache without the eager-viewport-prefetch storm. Because each stop now
 * drags a chunk along, the sweep can occupy the connection for tens of seconds
 * on a slow link, so it steps aside whenever the user presses or hovers
 * something.
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
      // A click is the work the user is actually waiting for, and every warmed
      // route now drags its own chunk along, so the walk can occupy the pipe for
      // tens of seconds. Step out of its way, then carry on.
      const held = holdUntil - Date.now();
      if (held > 0) {
        queue.unshift(entry);
        timer = window.setTimeout(run, Math.min(held, 500));
        return;
      }
      router.prefetch(entry.href);
      timer = window.setTimeout(run, 80);
    };
    const start = () => {
      if (warmupStarted) return;
      warmupStarted = true;
      run();
    };

    // Pressing anything is the earliest signal that a request the user is
    // waiting for is about to start; 3 s covers its data and chunk.
    const onPress = () => hold(3000);
    const opts = { capture: true, passive: true } as const;
    const events = ["pointerdown", "touchstart"] as const;
    for (const name of events) window.addEventListener(name, onPress, opts);

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
      if (timer) window.clearTimeout(timer);
      if (idle) {
        if (idleKind === "idle") window.cancelIdleCallback?.(idle);
        else window.clearTimeout(idle);
      }
      window.removeEventListener("load", onLoad);
      for (const name of events) window.removeEventListener(name, onPress, opts);
    };
  }, [router]);
}
