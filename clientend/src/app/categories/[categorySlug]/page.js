import { redirect } from "next/navigation";

import CategoryPageContent from "@/components/category/CategoryPageContent";
import { getCategoryNavbarView } from "@/lib/categoryApi";
import { getProductsFromApi } from "@/lib/productApi";
import { fetchBanners } from "@/lib/bannerApi";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }) {
  const { categorySlug } = await params;
  const categories = await getCategoryNavbarView();
  const category = categories.find((c) => c.slug === categorySlug);

  if (!category) {
    redirect("/");
  }

  const [products, promoBanners] = await Promise.all([
    getProductsFromApi({ category: category.slug }),
    fetchBanners("promo-banner", { targetPage: `category:${category.slug}` }),
  ]);

  return <CategoryPageContent category={category} categories={categories} products={products} promoBanners={promoBanners} />;
}
