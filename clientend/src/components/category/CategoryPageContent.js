import Container from "@/components/Container";
import Image from "next/image";
import CategorySidebar from "@/components/category/CategorySidebar";
import ProductCard from "@/components/category/ProductCard";
import CategoryIcon from "@/components/CategoryIcon";

export default function CategoryPageContent({
  category,
  categories,
  products = [],
}) {
  return (
    <main className="bg-[#f6f1e8] min-h-screen pb-[72px] pt-7">
      <Container>
        {/* Breadcrumb */}
        <nav className="mb-[18px] text-[13px] font-semibold text-[#5d6b65]">
          Home / <span className="text-[#173f31]">Categories</span> /{" "}
          <span className="text-[#173f31]">{category.name}</span>
        </nav>

        {/* Intro Banner */}
        <header className="relative mb-[22px] grid items-center gap-6 overflow-hidden rounded-[24px] bg-[#173f31] p-[22px] text-white lg:grid-cols-[1fr_220px] lg:p-[28px_28px_28px_32px] after:pointer-events-none after:absolute after:-top-10 after:right-[140px] after:h-[220px] after:w-[220px] after:bg-[radial-gradient(circle,rgba(238,147,34,0.22),transparent_70%)] after:content-['']">
          <div>
            <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#ee9322]">
              Category
            </p>
            <h1 className="mb-2 text-[clamp(32px,4vw,44px)] font-extrabold leading-none tracking-[-0.045em]">
              {category.name}
            </h1>
            <p className="max-w-[420px] text-[15px] text-white/80">
              Browse all products in the {category.name} category.
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

          <div className="hidden items-center justify-center lg:flex">
            {category.imageUrl ? (
              <div className="relative h-[220px] w-[220px]">
                <Image
                  src={category.imageUrl}
                  alt={category.name}
                  fill
                  sizes="220px"
                  unoptimized
                  className="object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.3)] mix-blend-multiply"
                />
              </div>
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-[32px] bg-white/10">
                <CategoryIcon slug={category.slug} name={category.name} className="h-16 w-16 text-white" />
              </div>
            )}
          </div>
        </header>

        {/* Shop Layout */}
        <div className="grid items-start gap-[22px] lg:grid-cols-[250px_1fr]">
          <CategorySidebar
            categories={categories}
            activeCategory={category}
          />

          <section>
            <div className="mb-[18px] flex items-center justify-between rounded-[18px] bg-white p-[10px_14px]">
              <p className="text-[13.5px] font-bold text-[#173f31]">
                {products.length}{" "}
                <span className="font-semibold text-[#5d6b65]">results</span>
              </p>
              
              <div className="flex items-center gap-2">
                <span className="text-[12.5px] font-bold text-[#5d6b65]">Sort by:</span>
                <select className="cursor-pointer appearance-none rounded-full border-0 bg-[#f4f8f5] px-3 py-1.5 text-[12.5px] font-extrabold text-[#173f31] outline-none">
                  <option value="recommended">Recommended</option>
                  <option value="newest">Newest first</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>
            </div>

            {products.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 xl:gap-5">
                {products.map((product) => (
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
                  There are no products available in the {category.name} category.
                </p>
              </div>
            )}
          </section>
        </div>
      </Container>
    </main>
  );
}
