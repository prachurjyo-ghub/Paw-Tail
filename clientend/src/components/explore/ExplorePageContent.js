import Container from "@/components/Container";
import Link from "next/link";
import Image from "next/image";
import CategoryIcon from "@/components/CategoryIcon";
import { resolveCatalogImageUrl } from "@/lib/categoryApi";

function BrandInitials({ name }) {
  return (
    <span className="text-[12px] font-black text-main">
      {(name || "?")
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()}
    </span>
  );
}

export default function ExplorePageContent({ animals = [], categories = [], brands = [] }) {
  return (
    <main className="bg-[#f6f1e8] min-h-screen pb-[100px] pt-7">
      <Container>
        <div className="mb-8">
          <h1 className="text-3xl font-black tracking-[-0.04em] text-[#173f31] mb-2">Explore</h1>
          <p className="text-[15px] font-medium text-[#5d6b65]">Discover products by animal, category, or brand.</p>
        </div>

        {/* Animals Section */}
        {animals.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 flex items-center gap-2 text-[18px] font-extrabold text-[#173f31]">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ee9322]/10 text-[#ee9322]">🐾</span>
              Shop by Animal
            </h2>
            <div className="grid grid-cols-4 gap-2 sm:gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {animals.map((animal) => (
                <Link
                  key={animal.slug}
                  href={`/animals/${animal.slug}`}
                  className="group flex flex-col items-center gap-1.5 sm:gap-3 rounded-2xl bg-white p-2 sm:p-5 text-center transition-[0.2s] hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(23,63,49,0.08)]"
                >
                  <div className="flex h-10 w-10 sm:h-16 sm:w-16 items-center justify-center overflow-hidden rounded-full bg-[#f4f8f5] transition-colors group-hover:bg-[#eef8f2]">
                    {resolveCatalogImageUrl(animal.image) ? (
                      <Image
                        src={resolveCatalogImageUrl(animal.image)}
                        alt={animal.name}
                        width={64}
                        height={64}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <CategoryIcon slug={animal.slug} name={animal.name} className="h-5 w-5 sm:h-8 sm:w-8 text-[#173f31]" />
                    )}
                  </div>
                  <span className="text-[10px] sm:text-[14px] font-extrabold text-[#173f31] leading-tight line-clamp-1">{animal.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Categories Section */}
        {categories.length > 0 && (
          <section className="mb-10">
            <h2 className="mb-4 flex items-center gap-2 text-[18px] font-extrabold text-[#173f31]">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ee9322]/10 text-[#ee9322]">🏷️</span>
              Shop by Category
            </h2>
            <div className="grid grid-cols-4 gap-2 sm:gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {categories.map((category) => (
                <Link
                  key={category.slug}
                  href={`/categories/${category.slug}`}
                  className="group flex flex-col items-center gap-1.5 sm:gap-3 rounded-2xl bg-white p-2 sm:p-5 text-center transition-[0.2s] hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(23,63,49,0.08)]"
                >
                  <div className="flex h-10 w-10 sm:h-16 sm:w-16 items-center justify-center overflow-hidden rounded-full bg-[#f4f8f5] transition-colors group-hover:bg-[#eef8f2]">
                    {category.imageUrl ? (
                      <Image
                        src={category.imageUrl}
                        alt={category.name}
                        width={64}
                        height={64}
                        unoptimized
                        className="h-full w-full object-contain p-1 sm:p-2"
                      />
                    ) : (
                      <CategoryIcon slug={category.slug} name={category.name} className="h-5 w-5 sm:h-8 sm:w-8 text-[#173f31]" />
                    )}
                  </div>
                  <span className="text-[10px] sm:text-[14px] font-extrabold text-[#173f31] leading-tight line-clamp-1">{category.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Brands Section */}
        {brands.length > 0 && (
          <section>
            <h2 className="mb-4 flex items-center gap-2 text-[18px] font-extrabold text-[#173f31]">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#ee9322]/10 text-[#ee9322]">⭐</span>
              Shop by Brand
            </h2>
            <div className="grid grid-cols-4 gap-2 sm:gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
              {brands.map((brand) => (
                <Link
                  key={brand.slug}
                  href={`/brands/${brand.slug}`}
                  className="group flex flex-col items-center justify-center gap-1.5 sm:gap-2 rounded-2xl bg-white p-2 sm:p-4 text-center transition-[0.2s] hover:-translate-y-1 hover:shadow-[0_15px_35px_rgba(23,63,49,0.08)]"
                >
                  <div className="flex h-10 w-10 sm:h-14 sm:w-14 items-center justify-center overflow-hidden rounded-full bg-[#f4f8f5] transition-colors group-hover:bg-[#eef8f2]">
                    {brand.imageUrl ? (
                      <Image
                        src={brand.imageUrl}
                        alt={brand.name}
                        width={48}
                        height={48}
                        unoptimized
                        className="h-full w-full object-contain p-1 sm:p-2 mix-blend-multiply"
                      />
                    ) : (
                      <BrandInitials name={brand.name} />
                    )}
                  </div>
                  <span className="text-[10px] sm:text-[13px] font-extrabold text-[#173f31] leading-tight line-clamp-1">{brand.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </Container>
    </main>
  );
}
