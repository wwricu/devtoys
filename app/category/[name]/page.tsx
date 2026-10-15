import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { categorySlug, getCategories, getCategory } from "@/lib/tools";
import CategoryContent from "@/components/CategoryContent";

/** Every category page is prerendered from the registry. */
export function generateStaticParams() {
  return getCategories().map((c) => ({ name: categorySlug(c.name) }));
}

interface CategoryPageProps {
  params: Promise<{ name: string }>;
}

export async function generateMetadata(
  props: CategoryPageProps,
): Promise<Metadata> {
  const { name } = await props.params;
  const category = getCategory(name);
  if (!category) return {};
  return {
    title: `${category.name} Tools`,
    description: `${category.tools.length} free ${category.name.toLowerCase()} tools that run entirely in your browser.`,
  };
}

export default async function CategoryPage(props: CategoryPageProps) {
  const { name } = await props.params;
  if (!getCategory(name)) notFound();

  return <CategoryContent slug={name} />;
}
