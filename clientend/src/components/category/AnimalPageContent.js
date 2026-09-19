import Container from "@/components/Container";
import Image from "next/image";
import AnimalSidebar from "@/components/category/AnimalSidebar";
import ProductCard from "@/components/category/ProductCard";
import { getSubcategoryBySlug } from "@/lib/catalogUtils";
import { resolveCatalogImageUrl } from "@/lib/categoryApi";

export default function AnimalPageContent({
  animal,
  subcategorySlug,
  products = [],
  brands = [],
}) {
  const activeSubcategory = getSubcategoryBySlug(animal, subcategorySlug);
  const isAllCategory = activeSubcategory === animal.categories[0];
  const activeCategory = animal.categoryDetails?.find(
    (item) => !item.isAll && item.name === activeSubcategory
  );

  const heroImage = isAllCategory ? animal.image || null : activeCategory?.image || animal.image || null;
  const heroImageUrl = resolveCatalogImageUrl(heroImage);

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

        {/* Intro Banner */}
        <header className="relative mb-[22px] grid items-center gap-6 overflow-hidden rounded-[24px] bg-[#173f31] p-[22px] text-white lg:grid-cols-[1fr_220px] lg:p-[28px_28px_28px_32px] after:pointer-events-none after:absolute after:-top-10 after:right-[140px] after:h-[220px] after:w-[220px] after:bg-[radial-gradient(circle,rgba(238,147,34,0.22),transparent_70%)] after:content-['']">
          <div>
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#ee9322]">
              Department
            </p>
            <h1 className="mb-2 text-[clamp(32px,4vw,44px)] font-extrabold leading-none tracking-[-0.045em]">
              {isAllCategory ? animal.name : activeSubcategory}
            </h1>
            <p className="max-w-[420px] text-[15px] text-white/80">
              {isAllCategory
                ? animal.description || `Food, treats, toys and walk gear — chosen with our Dhaka nutrition desk, not a warehouse algorithm.`
                : `Browse ${activeSubcategory.toLowerCase()} with focused filters and relevant products for ${animal.name.toLowerCase()}.`}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-[12.5px] font-semibold">
                {products.length} products
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-[12.5px] font-semibold">
                Free shipping over ৳3500
              </span>
              <span className="rounded-full bg-white/10 px-3 py-1.5 text-[12.5px] font-semibold">
                Ships across Bangladesh
              </span>
            </div>
          </div>
          {heroImageUrl ? (
            <Image
              src={heroImageUrl}
              alt={animal.name}
              width={168}
              height={168}
              unoptimized
              className="relative z-10 h-[120px] w-[120px] justify-self-end rounded-full border-4 border-white/15 object-cover shadow-[0_16px_40px_rgba(0,0,0,0.22)] lg:h-[168px] lg:w-[168px]"
            />
          ) : (
            <div className="relative z-10 h-[120px] w-[120px] justify-self-end rounded-full border-4 border-white/15 bg-white/5 shadow-[0_16px_40px_rgba(0,0,0,0.22)] lg:h-[168px] lg:w-[168px]" />
          )}
        </header>

        {/* Mobile Filters Toggle Button */}
        <div className="mb-3 flex gap-2 lg:hidden">
          <button
            type="button"
            className="flex h-11 flex-1 items-center justify-center rounded-xl bg-white font-bold text-[#173f31]"
          >
            Filters
          </button>
        </div>

        {/* Shop Layout */}
        <div className="grid items-start gap-[22px] lg:grid-cols-[250px_1fr]">
          <AnimalSidebar
            animal={animal}
            activeSubcategory={activeSubcategory}
            brands={brands}
          />

          <section>
            <div className="mb-4 flex flex-col justify-between gap-4 rounded-xl bg-white px-5 py-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-lg font-black text-[#173f31]">{animal.name} products</h2>
                <p className="text-sm font-medium text-[#5d6b65]">{products.length} products available</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#173f31]">Sort:</span>
                <select className="rounded-lg border border-[#e4ddd2] bg-white px-3 py-2 text-sm font-bold text-[#173f31] outline-none hover:border-[#173f31]">
                  <option>Featured</option>
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Newest Arrivals</option>
                </select>
              </div>
            </div>

            {products.length === 0 ? (
              <div className="col-span-full rounded-[18px] bg-white p-[48px_24px] text-center">
                <p className="mb-4 mt-2 text-[#5d6b65]">No products found matching your criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 lg:grid-cols-3">
                {products.map((product) => (
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
