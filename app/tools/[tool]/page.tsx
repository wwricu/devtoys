import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { tools, getTool } from "@/lib/tools";
import ToolLoader from "@/components/ToolLoader";
import ToolHeader from "@/components/ToolHeader";

export function generateStaticParams() {
  return tools.map((t) => ({ tool: t.id }));
}

/** Every tool page is prerendered from the registry, so the shell never waits. */
export const instant = false;

interface ToolPageProps {
  params: Promise<{ tool: string }>;
}

export async function generateMetadata(
  props: ToolPageProps,
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
      <ToolHeader id={t.id} />
      <div className="min-h-0 flex-1">
        <ToolLoader id={t.id} />
      </div>
    </div>
  );
}
