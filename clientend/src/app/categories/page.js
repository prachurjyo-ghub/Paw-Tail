import { getCategoryNavbarView, getCategoryAnimalsView } from "@/lib/categoryApi";
import { getBrandNavbarView } from "@/lib/brandApi";
import ExplorePageContent from "@/components/explore/ExplorePageContent";

export default async function CategoriesPage() {
  const [animals, categories, brands] = await Promise.all([
    getCategoryAnimalsView(),
    getCategoryNavbarView(),
    getBrandNavbarView()
  ]);

  return <ExplorePageContent animals={animals} categories={categories} brands={brands} />;
}
