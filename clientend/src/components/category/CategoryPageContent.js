"use client";

import { useState } from "react";
import Container from "@/components/Container";
import CategorySidebar from "@/components/category/CategorySidebar";
import CatalogHeroVisual from "@/components/category/CatalogHeroVisual";
import CatalogPromoBanner from "@/components/category/CatalogPromoBanner";
import ProductCard from "@/components/category/ProductCard";
import { useCatalogFilters } from "@/lib/useCatalogFilters";

export default function CategoryPageContent({
  category,
  categories,
  products = [],
  promoBanners = [],
}) {
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const filters = useCatalogFilters(products);
  const activePromoBanner = promoBanners.find((banner) => banner?.imageUrl);
  const showCatalogHeader = activePromoBanner?.showCatalogHeader !== false;

  return (
    <main className="bg-[#f6f1e8] min-h-screen pb-[72px] pt-7">
      <Container>
        {/* Breadcrumb */}
        <nav className="mb-[18px] text-[13px] font-semibold text-[#5d6b65]">
          Home / <span className="text-[#173f31]">Categories</span> /{" "}
          <span className="text-[#173f31]">{category.name}</span>
        </nav>

        {showCatalogHeader ? (
          <header className="relative mb-[22px] grid min-h-[168px] grid-cols-[minmax(0,1fr)_88px] items-center gap-3 overflow-hidden rounded-[20px] bg-[#173f31] p-4 text-white lg:min-h-0 lg:grid-cols-[1fr_220px] lg:gap-6 lg:rounded-[24px] lg:p-[28px_28px_28px_32px] after:pointer-events-none after:absolute after:-top-10 after:right-[140px] after:h-[220px] after:w-[220px] after:bg-[radial-gradient(circle,rgba(238,147,34,0.22),transparent_70%)] after:content-['']">
          <div>
            <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#ee9322] lg:mb-2 lg:text-[11px]">
              Category
            </p>
            <h1 className="mb-1.5 text-[28px] font-extrabold leading-none tracking-[-0.045em] sm:text-[32px] lg:mb-2 lg:text-[clamp(32px,4vw,44px)]">
              {category.name}
            </h1>
            <p className="line-clamp-2 max-w-[420px] text-[12px] leading-[1.45] text-white/75 lg:block lg:text-[15px] lg:text-white/80">
              Browse all products in the {category.name} category.
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

          <div className="flex items-center justify-center">
            <CatalogHeroVisual
              imageUrl={category.imageUrl}
              icon={category.icon}
              slug={category.slug}
              name={category.name}
              imageFit="contain"
            />
          </div>
          </header>
        ) : (
          <h1 className="mb-[18px] text-[28px] font-black leading-tight tracking-[-0.035em] text-[#173f31] sm:text-[34px] lg:text-[40px]">
            {category.name}
          </h1>
        )}

        <CatalogPromoBanner banners={promoBanners} />

        <button
          type="button"
          onClick={() => setShowMobileFilters((current) => !current)}
          className="mb-3 flex h-11 w-full items-center justify-center rounded-xl bg-white font-bold text-[#173f31] lg:hidden"
          aria-expanded={showMobileFilters}
        >
          {showMobileFilters ? "Hide filters" : "Filters"}
        </button>

        <div className="grid items-start gap-[22px] lg:grid-cols-[250px_1fr]">
          <CategorySidebar
            categories={categories}
            activeCategory={category}
            className={showMobileFilters ? "flex" : "hidden lg:flex"}
            priceCeiling={filters.priceCeiling}
            maxPrice={filters.effectiveMaxPrice}
            inStockOnly={filters.inStockOnly}
            hasActiveFilters={filters.hasActiveFilters}
            onMaxPriceChange={filters.updateMaxPrice}
            onInStockChange={filters.setInStockOnly}
            onClear={filters.clearFilters}
          />

          <section>
            <div className="mb-[18px] flex items-center justify-between rounded-[18px] bg-white p-[10px_14px]">
              <p className="text-[13.5px] font-bold text-[#173f31]">
                {filters.filteredProducts.length}{" "}
                <span className="font-semibold text-[#5d6b65]">results</span>
              </p>
              
              <div className="flex items-center gap-2">
                <span className="text-[12.5px] font-bold text-[#5d6b65]">Sort by:</span>
                <select value={filters.sort} onChange={(event) => filters.setSort(event.target.value)} className="cursor-pointer appearance-none rounded-full border-0 bg-[#f4f8f5] px-3 py-1.5 text-[12.5px] font-extrabold text-[#173f31] outline-none">
                  <option value="recommended">Recommended</option>
                  <option value="newest">Newest first</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>
            </div>

            {filters.filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 xl:gap-5">
                {filters.filteredProducts.map((product) => (
                  <ProductCard key={product._id || product.slug} product={product} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-[#173f31]/10 bg-white py-24 text-center">
                <span className="mb-4 text-4xl">🔍</span>
                <h3 className="mb-2 text-xl font-extrabold text-[#173f31]">
                  No Products Found
                </h3>
                <p className="max-w-md text-[14px] font-medium text-[#5d6b65]">
                  No products match the selected filters in {category.name}.
                </p>
              </div>
            )}
          </section>
        </div>
      </Container>
    </main>
  );
}
