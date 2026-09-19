import { redirect } from "next/navigation";

import CategoryPageContent from "@/components/category/CategoryPageContent";
import { getCategoryNavbarView } from "@/lib/categoryApi";
import { getProductsFromApi } from "@/lib/productApi";

export async function generateStaticParams() {
  const categories = await getCategoryNavbarView();
  return categories.map((category) => ({
    categorySlug: category.slug,
  }));
}

export default async function CategoryPage({ params }) {
  const { categorySlug } = await params;
  const categories = await getCategoryNavbarView();
  const category = categories.find((c) => c.slug === categorySlug);

  if (!category) {
    redirect("/");
  }

  const products = await getProductsFromApi({ category: category.slug });

  return <CategoryPageContent category={category} categories={categories} products={products} />;
}
