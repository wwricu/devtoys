import type { Metadata } from "next";
import { getTool } from "@/lib/tools";

/** Title and description for a tool route, taken from the registry. */
export function toolMetadata(id: string): Metadata {
  const tool = getTool(id);
  if (!tool) return {};
  return {
    title: tool.name,
    description: tool.description,
  };
}
