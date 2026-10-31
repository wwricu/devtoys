import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { categorySlug, tools } from "./tools";
import { recentToolIds } from "./recentTools";
import { getSnapshot as favoriteIds } from "./favorites";

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

/** A warmed route stays usable for `staleTimes.static` (3600 s) and the router
 *  then drops it, so a pass repeats at half that interval. Re-prefetching a
 *  route that is still fresh issues no request at all, which makes the repeat
 *  free until something has actually lapsed. */
const REPASS_MS = 30 * 60 * 1000;

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
 * metered or 2G connections.
 * The pass repeats: the router expires what was warmed, and without a second
 * pass a long-lived tab is left cold for the rest of its life.
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

    // Rebuilt for every pass, so the priority order follows the tools the
    // browser has actually been using since the last one.
    const buildQueue = () => {
      const favorites = [...favoriteIds()];
      const favoriteRank = new Map(favorites.map((id, index) => [id, index]));
      const priority = [
        ...favorites,
        ...recentToolIds().filter((id) => !favoriteRank.has(id)),
      ];
      const rank = new Map(priority.map((id, index) => [id, index]));
      return tools
        .map((tool, index) => ({ tool, index }))
        .sort(
          (a, b) =>
            (rank.get(a.tool.id) ?? priority.length) -
              (rank.get(b.tool.id) ?? priority.length) || a.index - b.index,
        )
        .map(({ tool }) => `/${categorySlug(tool.category)}/${tool.id}`);
    };

    let queue = buildQueue();
    let timer: number | undefined;
    let waiting: string | null = null;
    let waitTimer: number | undefined;
    let repassQueued = false;
    const origin = window.location.origin;
    const advance = () => {
      if (waitTimer) window.clearTimeout(waitTimer);
      waitTimer = undefined;
      waiting = null;
      timer = window.setTimeout(run, 80);
    };
    // A navigation waits for its own prefetch, so the sweep must never be more
    // than one request ahead of the network: a queue of them turns a click into
    // seconds. Resource timing says exactly when the last one came back.
    let observer: PerformanceObserver | undefined;
    try {
      observer = new PerformanceObserver((list) => {
        if (!waiting) return;
        for (const entry of list.getEntries()) {
          if (entry.name.split("?")[0] === origin + waiting) {
            advance();
            return;
          }
        }
      });
      observer.observe({ type: "resource" });
    } catch {
      /* no Resource Timing: fall back to the fixed beat below */
    }
    const run = () => {
      if (waiting) return;
      const href = queue.shift();
      if (!href) {
        timer = window.setTimeout(repass, REPASS_MS);
        return;
      }
      // A click is the work the user is actually waiting for; step aside.
      const held = holdUntil - Date.now();
      if (held > 0) {
        queue.unshift(href);
        timer = window.setTimeout(run, Math.min(held, 500));
        return;
      }
      router.prefetch(href);
      if (observer) {
        waiting = href;
        waitTimer = window.setTimeout(advance, 4000);
      } else {
        timer = window.setTimeout(run, 80);
      }
    };
    const repass = () => {
      if (timer) window.clearTimeout(timer);
      // A hidden tab has nobody to serve, and its timers are throttled to a
      // crawl anyway: wait until it is looked at again.
      if (document.visibilityState !== "visible") {
        repassQueued = true;
        return;
      }
      repassQueued = false;
      queue = buildQueue();
      run();
    };
    const onVisibility = () => {
      if (repassQueued && document.visibilityState === "visible") repass();
    };

    // Pressing anything is the earliest signal that a request the user is
    // waiting for is about to start; 3 s covers its data and chunk.
    const onPress = () => hold(3000);
    const opts = { capture: true, passive: true } as const;
    const events = ["pointerdown", "touchstart"] as const;
    for (const name of events) window.addEventListener(name, onPress, opts);
    document.addEventListener("visibilitychange", onVisibility);

    let idle: number | undefined;
    let idleKind: "idle" | "timer" = "idle";
    const schedule = () => {
      if (window.requestIdleCallback) {
        idleKind = "idle";
        idle = window.requestIdleCallback(run, { timeout: 3000 });
      } else {
        idleKind = "timer";
        idle = window.setTimeout(run, 2000);
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
      if (waitTimer) window.clearTimeout(waitTimer);
      observer?.disconnect();
      if (idle) {
        if (idleKind === "idle") window.cancelIdleCallback?.(idle);
        else window.clearTimeout(idle);
      }
      window.removeEventListener("load", onLoad);
      document.removeEventListener("visibilitychange", onVisibility);
      for (const name of events) window.removeEventListener(name, onPress, opts);
    };
  }, [router]);
}
