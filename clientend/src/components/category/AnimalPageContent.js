"use client";

import { useState } from "react";
import Container from "@/components/Container";
import AnimalSidebar from "@/components/category/AnimalSidebar";
import CatalogHeroVisual from "@/components/category/CatalogHeroVisual";
import CatalogPromoBanner from "@/components/category/CatalogPromoBanner";
import ProductCard from "@/components/category/ProductCard";
import { getSubcategoryBySlug } from "@/lib/catalogUtils";
import { resolveCatalogImageUrl } from "@/lib/categoryApi";
import { useCatalogFilters } from "@/lib/useCatalogFilters";

export default function AnimalPageContent({
  animal,
  subcategorySlug,
  products = [],
  brands = [],
  promoBanners = [],
}) {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const filters = useCatalogFilters(products);
  const availableBrands = [...new Set(products.map((product) => product.brand).filter(Boolean))];
  const activeSubcategory = getSubcategoryBySlug(animal, subcategorySlug);
  const isAllCategory = activeSubcategory === animal.categories[0];
  const activeCategory = animal.categoryDetails?.find(
    (item) => !item.isAll && item.name === activeSubcategory
  );

  const heroImage = isAllCategory ? animal.image || null : activeCategory?.image || animal.image || null;
  const heroImageUrl = resolveCatalogImageUrl(heroImage);
  const activePromoBanner = promoBanners.find((banner) => banner?.imageUrl);
  const showCatalogHeader = activePromoBanner?.showCatalogHeader !== false;
  const pageTitle = isAllCategory ? animal.name : activeSubcategory;

  return (
    <main className="bg-[#f6f1e8] min-h-screen pb-[72px] pt-7">
      <Container>
        {/* Breadcrumb */}
        <nav className="mb-[18px] text-[13px] font-semibold text-[#5d6b65]">
          Home / <span className="text-[#173f31]">{animal.name}</span>
          {!isAllCategory && (
            <>
              {" "}
              / <span className="text-[#173f31]">{activeSubcategory}</span>
            </>
          )}
        </nav>

        {showCatalogHeader ? (
          <header className="relative mb-[22px] grid min-h-[168px] grid-cols-[minmax(0,1fr)_88px] items-center gap-3 overflow-hidden rounded-[20px] bg-[#173f31] p-4 text-white lg:min-h-0 lg:grid-cols-[1fr_220px] lg:gap-6 lg:rounded-[24px] lg:p-[28px_28px_28px_32px] after:pointer-events-none after:absolute after:-top-10 after:right-[140px] after:h-[220px] after:w-[220px] after:bg-[radial-gradient(circle,rgba(238,147,34,0.22),transparent_70%)] after:content-['']">
          <div>
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#ee9322] lg:mb-2 lg:text-[11px]">
              Department
            </p>
            <h1 className="mb-1.5 text-[28px] font-extrabold leading-none tracking-[-0.045em] sm:text-[32px] lg:mb-2 lg:text-[clamp(32px,4vw,44px)]">
              {pageTitle}
            </h1>
            <p className="line-clamp-2 max-w-[420px] text-[12px] leading-[1.45] text-white/75 lg:block lg:text-[15px] lg:text-white/80">
              {isAllCategory
                ? animal.description || `Food, treats, toys and walk gear — chosen with our Dhaka nutrition desk, not a warehouse algorithm.`
                : `Browse ${activeSubcategory.toLowerCase()} with focused filters and relevant products for ${animal.name.toLowerCase()}.`}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2 lg:mt-4">
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold lg:px-3 lg:py-1.5 lg:text-[12.5px]">
                {products.length} products
              </span>
              <span className="hidden rounded-full bg-white/10 px-3 py-1.5 text-[12.5px] font-semibold lg:inline-flex">
                Free shipping over ৳3500
              </span>
              <span className="hidden rounded-full bg-white/10 px-3 py-1.5 text-[12.5px] font-semibold lg:inline-flex">
                Ships across Bangladesh
              </span>
            </div>
          </div>
          <CatalogHeroVisual
            imageUrl={heroImageUrl}
            icon={activeCategory?.icon || animal.icon}
            slug={activeCategory?.slug || animal.slug}
            name={isAllCategory ? animal.name : activeSubcategory}
          />
          </header>
        ) : (
          <h1 className="mb-[18px] text-[28px] font-black leading-tight tracking-[-0.035em] text-[#173f31] sm:text-[34px] lg:text-[40px]">
            {pageTitle}
          </h1>
        )}

        <CatalogPromoBanner banners={promoBanners} />

        {/* Mobile Filters Toggle Button */}
        <div className="mb-3 flex gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setShowMobileFilters((current) => !current)}
            aria-expanded={showMobileFilters}
            className="flex h-11 flex-1 items-center justify-center rounded-xl bg-white font-bold text-[#173f31]"
          >
            {showMobileFilters ? "Hide filters" : "Filters"}
          </button>
        </div>

        {/* Shop Layout */}
        <div className="grid items-start gap-[22px] lg:grid-cols-[250px_1fr]">
          <AnimalSidebar
            animal={animal}
            activeSubcategory={activeSubcategory}
            brands={brands.length ? brands : availableBrands}
            className={showMobileFilters ? "flex" : "hidden lg:flex"}
            priceCeiling={filters.priceCeiling}
            maxPrice={filters.effectiveMaxPrice}
            inStockOnly={filters.inStockOnly}
            selectedBrand={filters.brand}
            selectedLifeStage={filters.lifeStage}
            hasActiveFilters={filters.hasActiveFilters}
            onMaxPriceChange={filters.updateMaxPrice}
            onInStockChange={filters.setInStockOnly}
            onBrandChange={filters.setBrand}
            onLifeStageChange={filters.setLifeStage}
            onClear={filters.clearFilters}
          />

          <section>
            <div className="mb-4 flex flex-col justify-between gap-4 rounded-xl bg-white px-5 py-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-black text-[#173f31]">{animal.name} products</h2>
                <p className="text-sm font-medium text-[#5d6b65]">{filters.filteredProducts.length} products available</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#173f31]">Sort:</span>
                <select value={filters.sort} onChange={(event) => filters.setSort(event.target.value)} className="rounded-lg border border-[#e4ddd2] bg-white px-3 py-2 text-sm font-bold text-[#173f31] outline-none hover:border-[#173f31]">
                  <option value="recommended">Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="newest">Newest Arrivals</option>
                </select>
              </div>
            </div>

            {filters.filteredProducts.length === 0 ? (
              <div className="col-span-full rounded-[18px] bg-white p-[48px_24px] text-center">
                <p className="mb-4 mt-2 text-[#5d6b65]">No products found matching your criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-3">
                {filters.filteredProducts.map((product) => (
                  <ProductCard key={product._id || product.slug} product={product} />
                ))}
              </div>
            )}
          </section>
        </div>
      </Container>
    </main>
  );
}
