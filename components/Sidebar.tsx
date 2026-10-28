"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  categorySlug,
  getCategories,
  tools,
  type ToolDefinition,
} from "@/lib/tools";
import { useFavourites } from "@/lib/favorites";
import { useStoredState } from "@/components/kit";
import { fill, useLang, switchLang, type Lang, repoUrl } from "@/lib/i18n";
import { ThemeToggle } from "./ThemeToggle";
import { useToolIntent, useToolWarmup } from "@/lib/toolIntent";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={`size-3 shrink-0 transition-transform ${open ? "rotate-90" : ""}`}
    >
      <path
        d="M4 2.5 8 6 4 9.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
      <path
        d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="size-4">
      <path
        d="m4 4 8 8M12 4l-8 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BadgeTile({
  tool,
  active,
}: {
  tool: ToolDefinition;
  active: boolean;
}) {
  return (
    <span
      className={`flex size-7 shrink-0 items-center justify-center overflow-hidden rounded border px-0.5 font-mono text-[8px] leading-none ${
        active
          ? "border-neutral-400 bg-neutral-200 text-neutral-900 dark:border-neutral-500 dark:bg-neutral-700 dark:text-white"
          : "border-neutral-200 bg-white text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
      }`}
    >
      {tool.badge}
    </span>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { t, lang: currentLang, toolName, categoryName, toolSearchText } = useLang();
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useStoredState<Record<string, boolean>>(
    "sidebar.collapsed",
    {},
  );
  const [hidden, setHidden] = useStoredState<boolean>("sidebar.hidden", false);
  // The pre-paint script owns the class on load; toggles update it directly so
  // React never removes it before useStoredState has read the stored value.
  const setSidebarHidden = (next: boolean) => {
    setHidden(next);
    document.documentElement.classList.toggle("sidebar-hidden", next);
  };
  const { favs } = useFavourites();
  const intent = useToolIntent();
  useToolWarmup();

  // Narrow screens have no room for the category tree, so it moves into a
  // drawer behind a menu button.
  const [menuOpen, setMenuOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    // Land on the current tool instead of the top of the list.
    drawerRef.current?.focus({ preventScroll: true });
    drawerRef.current
      ?.querySelector<HTMLElement>(`a[href="${pathname}"]`)
      ?.scrollIntoView({ block: "center" });
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen, pathname]);

  const nextLang: Lang = currentLang === "zh" ? "en" : "zh";

  const categories = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = !q
      ? tools
      : tools.filter((tool) =>
          toolSearchText(tool).some((text) => text.toLowerCase().includes(q)),
        );

    // Build Favourites category from reactive favs set
    let favCat: { name: string; tools: ToolDefinition[] } | null = null;
    if (favs.size > 0) {
      const allTools = getCategories().flatMap((c) => c.tools);
      const favTools: ToolDefinition[] = [];
      for (const id of favs) {
        const t = allTools.find((x) => x.id === id);
        if (t) favTools.push(t);
      }
      if (favTools.length > 0) {
        favCat = { name: "Favourites", tools: favTools };
      }
    }

    const realCats = getCategories()
      .map((c) => ({
        ...c,
        tools: filtered.filter((tool) => tool.category === c.name),
      }))
      .filter((c) => c.tools.length > 0);

    // Prepend the Favourites category when it has items.
    return favCat ? [favCat, ...realCats] : realCats;
  }, [query, toolSearchText, favs]);

  // While filtering, every matched group is revealed so results stay readable.
  const searching = query.trim() !== "";
  const toggle = (name: string) =>
    setCollapsed({ ...collapsed, [name]: !collapsed[name] });

  // Shared by the desktop sidebar and the narrow-screen drawer.
  const navBody = (
    <>
      <div className="px-3 pb-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.search}
          aria-label={t.search}
          className="w-full rounded border border-neutral-300 bg-white px-2 py-1 text-xs outline-none placeholder:text-neutral-400 focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-800"
        />
      </div>
      <nav className="flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
        {categories.map((c) => {
          const open = searching || collapsed[c.name] !== true;
          return (
            <div key={c.name} className="mb-1">
              <div className="flex items-center gap-1 rounded pr-2 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800/60">
                <button
                  type="button"
                  onClick={() => toggle(c.name)}
                  aria-expanded={open}
                  aria-label={fill(
                    open ? t.collapseCategory : t.expandCategory,
                    { name: categoryName(c.name) },
                  )}
                  className="flex size-6 shrink-0 items-center justify-center rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                >
                  <Chevron open={open} />
                </button>
                <Link
                  href={`/${categorySlug(c.name)}`}
                  prefetch={false}
                  onPointerEnter={() => intent(`/${categorySlug(c.name)}`)}
                  onFocus={() => intent(`/${categorySlug(c.name)}`)}
                  className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-700 transition-colors hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-white"
                >
                  <span className="flex-1 truncate">
                    {categoryName(c.name)}
                  </span>
                  <span className="text-[10px] font-normal tracking-normal tabular-nums text-neutral-400 dark:text-neutral-500">
                    {c.tools.length}
                  </span>
                </Link>
              </div>
              {open && (
                <ul className="space-y-0.5">
                  {c.tools.map((tool) => {
                    const toolCat = categorySlug(tool.category);
                    const href = `/${toolCat}/${tool.id}`;
                    const active = pathname === `/${toolCat}/${tool.id}`;
                    return (
                      <li key={tool.id}>
                        <Link
                          href={href}
                          prefetch={false}
                          onPointerEnter={() => intent(href, tool.id)}
                          onFocus={() => intent(href, tool.id)}
                          className={`flex items-center gap-2 rounded px-2 py-1 text-xs transition-colors ${
                            active
                              ? "bg-neutral-200 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-white"
                              : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800/60"
                          }`}
                        >
                          <BadgeTile tool={tool} active={active} />
                          {toolName(tool)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
        {categories.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-neutral-400">
            {t.noMatchingTools}
          </p>
        )}
      </nav>
    </>
  );

  return (
    <>
      {/* Mobile top bar: the category tree lives in the drawer below */}
      <div className="flex shrink-0 items-center gap-1.5 border-b border-neutral-200 bg-neutral-50 px-2 py-2 dark:border-neutral-800 dark:bg-neutral-900 md:hidden">
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label={t.openMenu}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          className="rounded p-1 text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
        >
          <MenuIcon />
        </button>
        <Link
          href="/"
          className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-800 dark:text-neutral-200"
        >
          {t.siteName}
        </Link>
      </div>
      {menuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-neutral-950/30"
            onClick={() => setMenuOpen(false)}
          />
          <div
            id="mobile-menu"
            ref={drawerRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={t.siteName}
            onClick={(event) => {
              if ((event.target as HTMLElement).closest("a")) setMenuOpen(false);
            }}
            className="absolute inset-y-0 left-0 flex w-64 max-w-[85vw] flex-col border-r border-neutral-200 bg-neutral-50 shadow-xl outline-none dark:border-neutral-800 dark:bg-neutral-900"
          >
            <div className="flex items-center gap-1.5 px-2 py-2">
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label={t.closeMenu}
                className="rounded p-1 text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
              >
                <CloseIcon />
              </button>
              <Link
                href="/"
                className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-800 dark:text-neutral-200"
              >
                {t.siteName}
              </Link>
            </div>
            {navBody}
          </div>
        </div>
      )}
      <button
        type="button"
        data-sidebar-toggle
        onClick={() => setSidebarHidden(!hidden)}
        title={hidden ? t.showSidebar : t.hideSidebar}
        aria-label={hidden ? t.showSidebar : t.hideSidebar}
        aria-expanded={!hidden}
        className="hidden w-1.5 shrink-0 items-center justify-center border-r border-neutral-200 bg-neutral-100 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-500 dark:hover:bg-neutral-800 dark:hover:text-neutral-300 md:flex"
      >
        <svg viewBox="0 0 16 16" className="size-2.5 shrink-0" aria-hidden="true">
          <path
            d="M10 3.5 6 8l4 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <aside
        data-sidebar
        className={`${hidden ? "hidden" : "hidden md:flex"} w-60 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900`}
      >
        <div className="flex items-center gap-1.5 px-3 py-2">
          <Link
            href="/"
            className="min-w-0 flex-1 truncate text-sm font-semibold text-neutral-800 hover:text-neutral-950 dark:text-neutral-200 dark:hover:text-white"
          >
            {t.siteName}
          </Link>
          <div className="flex shrink-0 items-center gap-0.5">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => switchLang(nextLang)}
              title={nextLang === "zh" ? "切换到中文" : "Switch to English"}
              aria-label={nextLang === "zh" ? "切换到中文" : "Switch to English"}
              className="rounded p-1 text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
            >
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M8 1a7 7 0 1 1 0 14A7 7 0 0 1 8 1Zm0 1a6 6 0 0 0-4.243 10.243l1.415-2.477A9.956 9.956 0 0 1 4.5 8c0-.62.09-1.217.258-1.78l-1.53-2.678A5.98 5.98 0 0 1 8 2Zm0 12a6 6 0 0 0 4.243-10.243l-1.415 2.477c.418.553.714 1.15.872 1.78l1.53 2.678A5.98 5.98 0 0 1 8 14Zm-2.5-5a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0Z"
                />
              </svg>
            </button>
            <a
              href={repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="View on GitHub"
              aria-label="View on GitHub"
              className="rounded p-1 text-neutral-400 transition-colors hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
            >
              <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
                />
              </svg>
            </a>
          </div>
        </div>
        {navBody}
      </aside>
    </>
  );
}
