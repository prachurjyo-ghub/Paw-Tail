"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useMemo } from "react";

import Container from "@/components/Container";
import { PopularBrandsSkeleton } from "@/components/skeletons/StorefrontSkeletons";
import { apiRequest } from "@/lib/api";
import { resolveCatalogImageUrl } from "@/lib/categoryApi";

function BrandInitials({ name }) {
  return (
    <span className="text-[17px] font-black text-main">
      {(name || "?")
        .split(" ")
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()}
    </span>
  );
}

const FILTERS = ["All", "Bird", "Fish", "Dog", "Cat", "Rabbit", "Grooming"];
const COLLAPSED_BRAND_LIMIT = 14;

export default function PopularBrands() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let alive = true;

    apiRequest("/brands/get-brands?limit=100")
      .then((data) => {
        if (!alive) return;

        const nextBrands = (data.brands || []).map((brand) => ({
          name: brand.name,
          slug: brand.slug || String(brand.name || "").trim().toLowerCase().replace(/\s+/g, "-"),
          description: Array.isArray(brand.animalNames) && brand.animalNames.length
            ? brand.animalNames.join(", ")
            : "",
          animalNames: Array.isArray(brand.animalNames) ? brand.animalNames : [],
          imageUrl: resolveCatalogImageUrl(brand.image),
        }));

        setBrands(nextBrands);
      })
      .catch(() => {
        if (alive) setBrands([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const filteredBrands = useMemo(() => {
    if (activeFilter === "All") return brands;
    return brands.filter(brand => 
      brand.animalNames.some(animal => 
        animal.toLowerCase().includes(activeFilter.toLowerCase())
      )
    );
  }, [brands, activeFilter]);

  const displayedBrands = showAll
    ? filteredBrands
    : filteredBrands.slice(0, COLLAPSED_BRAND_LIMIT);

  if (loading) {
    return <PopularBrandsSkeleton />;
  }

  if (!brands.length) {
    return null;
  }

  return (
    <section className="bg-[#eef6f1] pb-[80px] pt-[72px]">
      <Container>
        <div className="mx-auto mb-9 max-w-[560px] text-center">
          <h2 className="text-[clamp(28px,3.6vw,40px)] font-extrabold tracking-tight text-[#173f31]">
            Popular brands
          </h2>
          <p className="mt-2.5 text-[15.5px] text-[#5d6b65]">
            Names our regulars refill every month — filter by pet, or open the full list.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-10 flex flex-wrap items-center justify-center gap-2.5">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => {
                 setActiveFilter(filter);
                 setShowAll(false);
              }}
              className={`rounded-full px-5 py-2 text-[15px] font-bold transition-all ${
                activeFilter === filter
                  ? "bg-[#173f31] text-white"
                  : "border border-[#cce1d6] bg-transparent text-[#173f31] hover:border-[#173f31]"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Brands Grid */}
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-2 sm:gap-3">
          {displayedBrands.map(({ name, description, slug, imageUrl }) => (
            <Link
              key={slug}
              href={`/brands/${slug}`}
              className="group flex flex-col items-center gap-1.5 sm:gap-2.5 rounded-xl sm:rounded-2xl bg-white/55 p-2 sm:p-[18px_12px_16px] text-center transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_8px_24px_rgba(23,63,49,0.08)]"
            >
              <span className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center overflow-hidden rounded-lg sm:rounded-[14px] bg-white text-main">
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={name}
                    width={48}
                    height={48}
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <BrandInitials name={name} />
                )}
              </span>
              <span>
                <strong className="block text-[10px] sm:text-[14.5px] leading-tight font-extrabold tracking-tight text-main line-clamp-1">
                  {name}
                </strong>
                {description ? (
                  <small className="mt-0.5 hidden sm:block text-xs font-medium text-[#5d6b65] line-clamp-1">
                    {description}
                  </small>
                ) : null}
              </span>
            </Link>
          ))}
        </div>

        {/* Toggle Button */}
        {filteredBrands.length > COLLAPSED_BRAND_LIMIT && (
          <div className="mt-12 flex justify-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="rounded-full bg-[#173f31] px-8 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-[#0f2a20]"
            >
              {showAll ? "Show fewer brands" : "Show more brands"}
            </button>
          </div>
        )}
      </Container>
    </section>
  );
}
