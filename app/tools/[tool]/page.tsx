import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { tools, getTool } from "@/lib/tools";
import ToolLoader from "@/components/ToolLoader";

export function generateStaticParams() {
  return tools.map((t) => ({ tool: t.id }));
}

/** Every tool page is prerendered from the registry, so the shell never waits. */
export const instant = false;

interface ToolPageProps {
  params: Promise<{ tool: string }>;
}

export async function generateMetadata(
  props: ToolPageProps
): Promise<Metadata> {
  const { tool } = await props.params;
  const t = getTool(tool);
  if (!t) return {};
  return { title: t.name, description: t.description };
}

export default async function ToolPage(props: ToolPageProps) {
  const { tool } = await props.params;
  const t = getTool(tool);
  if (!t) notFound();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 pb-2">
        <h1 className="text-sm font-semibold">{t.name}</h1>
        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
          {t.description}
        </p>
      </header>
      <div className="min-h-0 flex-1">
        <ToolLoader id={t.id} />
      </div>
    </div>
  );
}
