import type { Metadata } from "next";
import { getTool, toolPath } from "@/lib/tools";

/** Title, description, canonical and share tags for a tool route. */
export function toolMetadata(id: string): Metadata {
  const tool = getTool(id);
  if (!tool) return {};
  const path = toolPath(tool);
  return {
    title: tool.name,
    description: tool.description,
    alternates: { canonical: path },
    openGraph: { title: tool.name, description: tool.description, url: path },
  };
}
