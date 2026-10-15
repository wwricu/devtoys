"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  categorySlug,
  getCategories,
  tools,
  type ToolDefinition,
} from "@/lib/tools";
import { useStoredState } from "@/components/kit";
import { fill, useLang } from "@/lib/i18n";

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
  const { t, toolName, categoryName, toolSearchText } = useLang();
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useStoredState<Record<string, boolean>>(
    "sidebar.collapsed",
    {},
  );

  const categories = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = !q
      ? tools
      : tools.filter((tool) =>
          toolSearchText(tool).some((text) => text.toLowerCase().includes(q)),
        );
    return getCategories()
      .map((c) => ({
        ...c,
        tools: filtered.filter((tool) => tool.category === c.name),
      }))
      .filter((c) => c.tools.length > 0);
  }, [query, toolSearchText]);

  // While filtering, every matched group is revealed so results stay readable.
  const searching = query.trim() !== "";
  const toggle = (name: string) =>
    setCollapsed({ ...collapsed, [name]: !collapsed[name] });

  return (
    <>
      {/* Mobile top horizontal nav */}
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900 md:hidden">
        <Link
          href="/"
          className="shrink-0 text-xs font-semibold text-neutral-700 dark:text-neutral-200"
        >
          {t.siteName}
        </Link>
        {tools.map((tool) => (
          <Link
            key={tool.id}
            href={`/tools/${tool.id}`}
            className={`shrink-0 rounded border px-2 py-1 text-xs ${
              pathname === `/tools/${tool.id}`
                ? "border-neutral-400 bg-neutral-200 font-medium dark:border-neutral-600 dark:bg-neutral-800"
                : "border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
            }`}
          >
            {toolName(tool)}
          </Link>
        ))}
      </div>
      <aside className="hidden w-60 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 md:flex">
        <Link
          href="/"
          className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-neutral-800 hover:text-neutral-950 dark:text-neutral-200 dark:hover:text-white"
        >
          <span className="inline-block size-5 rounded bg-neutral-800 text-center text-[11px] leading-5 text-white dark:bg-neutral-200 dark:text-neutral-900">
            D
          </span>
          {t.siteName}
        </Link>
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
        <nav className="flex-1 overflow-y-auto px-2 pb-3">
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
                    href={`/category/${categorySlug(c.name)}`}
                    className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 text-[11px] font-medium uppercase tracking-wide text-neutral-500 transition-colors hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
                  >
                    <span className="flex-1 truncate">
                      {categoryName(c.name)}
                    </span>
                    <span className="text-[10px] font-normal tracking-normal tabular-nums text-neutral-400 dark:text-neutral-500">
                      {c.tools.length}
                    </span>
                  </Link>
                </div>
                {open ? (
                  <ul className="space-y-0.5">
                    {c.tools.map((tool) => {
                      const active = pathname === `/tools/${tool.id}`;
                      return (
                        <li key={tool.id}>
                          <Link
                            href={`/tools/${tool.id}`}
                            className={`flex items-center gap-2 rounded px-2 py-1 text-xs transition-colors ${
                              active
                                ? "bg-neutral-200 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-white"
                                : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/60"
                            }`}
                          >
                            <BadgeTile tool={tool} active={active} />
                            {toolName(tool)}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="flex flex-wrap gap-1 px-2 pb-1.5">
                    {c.tools.map((tool) => {
                      const active = pathname === `/tools/${tool.id}`;
                      return (
                        <Link
                          key={tool.id}
                          href={`/tools/${tool.id}`}
                          title={toolName(tool)}
                          aria-label={toolName(tool)}
                          className={`rounded transition-transform hover:-translate-y-px ${
                            active
                              ? "ring-1 ring-neutral-400 dark:ring-neutral-500"
                              : ""
                          }`}
                        >
                          <BadgeTile tool={tool} active={active} />
                        </Link>
                      );
                    })}
                  </div>
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
      </aside>
    </>
  );
}
