import Link from "next/link";
import { getCategories, tools } from "@/lib/tools";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-3xl">
      <h1 className="text-lg font-semibold">Dev Toys</h1>
      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
        A collection of everyday developer tools, all running locally in your
        browser. Nothing is uploaded.
      </p>
      {getCategories().map((c) => (
        <section key={c.name} className="mt-5">
          <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            {c.name}
          </h2>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {c.tools.map((t) => (
              <Link
                key={t.id}
                href={`/tools/${t.id}`}
                className="flex items-start gap-3 rounded border border-neutral-200 bg-neutral-50 p-3 hover:border-neutral-400 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-600"
              >
                <span className="mt-0.5 w-6 shrink-0 text-center font-mono text-xs text-neutral-400">
                  {t.badge}
                </span>
                <span>
                  <span className="block text-sm font-medium">{t.name}</span>
                  <span className="mt-0.5 block text-xs text-neutral-500 dark:text-neutral-400">
                    {t.description}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
      {tools.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500">No tools yet.</p>
      )}
    </div>
  );
}
