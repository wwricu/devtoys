"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getCategories, tools } from "@/lib/tools";

export default function Sidebar() {
  const pathname = usePathname();
  const [query, setQuery] = useState("");

  const categories = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = !q
      ? tools
      : tools.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.keywords.some((k) => k.includes(q))
        );
    return getCategories()
      .map((c) => ({
        ...c,
        tools: filtered.filter((t) => t.category === c.name),
      }))
      .filter((c) => c.tools.length > 0);
  }, [query]);

  return (
    <>
      {/* Mobile top horizontal nav */}
      <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900 md:hidden">
        <Link
          href="/"
          className="shrink-0 text-xs font-semibold text-neutral-700 dark:text-neutral-200"
        >
          Dev Toys
        </Link>
        {tools.map((t) => (
          <Link
            key={t.id}
            href={`/tools/${t.id}`}
            className={`shrink-0 rounded border px-2 py-1 text-xs ${
              pathname === `/tools/${t.id}`
                ? "border-neutral-400 bg-neutral-200 font-medium dark:border-neutral-600 dark:bg-neutral-800"
                : "border-neutral-200 text-neutral-600 dark:border-neutral-700 dark:text-neutral-400"
            }`}
          >
            {t.name}
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
        Dev Toys
      </Link>
      <div className="px-3 pb-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tools"
          className="w-full rounded border border-neutral-300 bg-white px-2 py-1 text-xs outline-none placeholder:text-neutral-400 focus:border-neutral-500 dark:border-neutral-700 dark:bg-neutral-800"
        />
      </div>
      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        {categories.map((c) => (
          <div key={c.name} className="mb-2">
            <div className="px-2 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-neutral-400 dark:text-neutral-500">
              {c.name}
            </div>
            <ul className="space-y-0.5">
              {c.tools.map((t) => {
                const active = pathname === `/tools/${t.id}`;
                return (
                  <li key={t.id}>
                    <Link
                      href={`/tools/${t.id}`}
                      className={`flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors ${
                        active
                          ? "bg-neutral-200 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-white"
                          : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800/60"
                      }`}
                    >
                      <span className="w-6 shrink-0 text-center font-mono text-[10px] text-neutral-400 dark:text-neutral-500">
                        {t.badge}
                      </span>
                      {t.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {categories.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-neutral-400">
            No matching tools
          </p>
        )}
      </nav>
      </aside>
    </>
  );
}
