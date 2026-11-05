import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { categorySlug, getCategories, getCategory } from "@/lib/tools";
import CategoryContent from "@/components/CategoryContent";

// One dynamic segment answers every unknown slug, and notFound() there is the
// correct outcome — instant validation just cannot read a render that threw.
export const instant = false;

/** Every category page is prerendered from the registry. */
export function generateStaticParams() {
  return getCategories().map((c) => ({ category: categorySlug(c.name) }));
}

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export async function generateMetadata(
  props: CategoryPageProps,
): Promise<Metadata> {
  const { category } = await props.params;
  const cat = getCategory(category);
  if (!cat) return {};
  return {
    title: `${cat.name} Tools`,
    description: `${cat.tools.length} free ${cat.name.toLowerCase()} tools that run entirely in your browser.`,
    alternates: { canonical: `/${categorySlug(cat.name)}` },
    openGraph: {
      title: `${cat.name} Tools`,
      description: `${cat.tools.length} free ${cat.name.toLowerCase()} tools that run entirely in your browser.`,
      url: `/${categorySlug(cat.name)}`,
    },
  };
}

export default async function CategoryPage(props: CategoryPageProps) {
  const { category } = await props.params;
  if (!getCategory(category)) notFound();

  return <CategoryContent slug={category} />;
}
