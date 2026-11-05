import type { MetadataRoute } from "next";
import { categorySlug, getCategories, tools } from "@/lib/tools";
import { SITE_ORIGIN } from "@/lib/site";

/** Every route is a static page built from the registry, so the list is complete. */
export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string) => `${SITE_ORIGIN}${path}`;
  return [
    { url: url("/") },
    ...getCategories().map((c) => ({ url: url(`/${categorySlug(c.name)}`) })),
    ...tools.map((t) => ({ url: url(`/${categorySlug(t.category)}/${t.id}`) })),
  ];
}
