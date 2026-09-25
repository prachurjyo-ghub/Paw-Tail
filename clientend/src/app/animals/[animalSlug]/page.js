import { redirect } from "next/navigation";

import AnimalPageContent from "@/components/category/AnimalPageContent";
import { findAnimalBySlug, getCategoryAnimalsView } from "@/lib/categoryApi";
import { getProductsForAnimalView } from "@/lib/productApi";
import { fetchBanners } from "@/lib/bannerApi";
import { getSubcategoryBySlug } from "@/lib/catalogUtils";

export async function generateStaticParams() {
  const animals = await getCategoryAnimalsView();
  return animals.map((animal) => ({
    animalSlug: animal.slug,
  }));
}

export default async function AnimalPage({ params, searchParams }) {
  const { animalSlug } = await params;
  const { sub } = await searchParams;
  const animals = await getCategoryAnimalsView();
  const animal = findAnimalBySlug(animals, animalSlug);

  if (!animal) {
    redirect("/");
  }

  const activeSubcategory = getSubcategoryBySlug(animal, sub);
  const activeCategory = animal.categoryDetails?.find(
    (item) => !item.isAll && item.name === activeSubcategory
  );
  const targetPage = activeCategory?.slug
    ? `category:${activeCategory.slug}`
    : `animal:${animal.slug}`;
  const [products, promoBanners] = await Promise.all([
    getProductsForAnimalView(animal, sub),
    fetchBanners("promo-banner", { targetPage }),
  ]);

  return <AnimalPageContent animal={animal} subcategorySlug={sub} products={products} promoBanners={promoBanners} />;
}
