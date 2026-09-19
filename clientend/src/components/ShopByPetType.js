"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import Container from "@/components/Container";
import CategoryIcon from "@/components/CategoryIcon";
import { apiRequest } from "@/lib/api";
import { resolveCatalogImageUrl } from "@/lib/categoryApi";

const DEFAULT_CATEGORIES = [
  { name: "Dog", slug: "dog", icon: "dog" },
  { name: "Cat", slug: "cat", icon: "cat" },
  { name: "Bird", slug: "bird", icon: "bird" },
  { name: "Fish", slug: "fish", icon: "fish" },
  { name: "Rabbit", slug: "rabbit", icon: "rabbit" },
  { name: "Small Pets", slug: "small-pets", icon: "small-pets" },
  { name: "Reptile", slug: "reptile", icon: "reptile" },
];

function CategoryCard({ item }) {
  const imageUrl = resolveCatalogImageUrl(item.image);

  return (
    <Link
      href={item.href}
      className="group relative flex h-[85px] w-[75px] sm:h-[120px] sm:w-[135px] md:h-[135px] md:w-[165px] lg:h-[140px] lg:w-[170px] flex-col items-center justify-center rounded-xl sm:rounded-3xl border border-neutral-200/80 bg-white p-2 sm:p-5 text-center shadow-[0_4px_20px_rgba(23,63,49,0.04)] transition-all duration-300 hover:-translate-y-1.5 hover:border-main/30 hover:shadow-[0_16px_35px_rgba(23,63,49,0.12)]"
    >
      <div className="mb-1.5 sm:mb-3 flex h-9 w-9 sm:h-12 sm:w-12 items-center justify-center overflow-hidden rounded-xl bg-[#f4f8f5] text-main transition-transform duration-300 group-hover:scale-110">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={item.name}
            width={48}
            height={48}
            unoptimized
            className="h-full w-full object-contain p-1"
          />
        ) : (
          <CategoryIcon
            icon={item.icon}
            slug={item.slug}
            name={item.name}
            className="h-5 w-5 sm:h-7 sm:w-7 text-main transition-colors duration-200 group-hover:text-accent"
            strokeWidth={1.8}
          />
        )}
      </div>

      <h3 className="text-[10px] sm:text-base font-bold tracking-tight text-main transition-colors duration-200 group-hover:text-accent leading-tight line-clamp-1">
        {item.name}
      </h3>
    </Link>
  );
}

export default function ShopByPetType() {
  const [animals, setAnimals] = useState([]);

  useEffect(() => {
    let alive = true;

    apiRequest("/animals/get-animals")
      .then((data) => {
        if (!alive) return;
        const validAnimals = (data.animals || []).filter(
          (a) => a.isActive && !a.isDeleted
        );
        setAnimals(validAnimals);
      })
      .catch(() => {
        if (alive) setAnimals([]);
      });

    return () => {
      alive = false;
    };
  }, []);

  const cards = useMemo(() => {
    const list = animals.length ? animals : DEFAULT_CATEGORIES;
    const ORDER = ["dog", "cat", "bird", "fish", "rabbit", "small-pets", "reptile"];

    return [...list]
      .sort((a, b) => {
        const indexA = ORDER.indexOf((a.slug || "").toLowerCase());
        const indexB = ORDER.indexOf((b.slug || "").toLowerCase());
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return (a.name || "").localeCompare(b.name || "");
      })
      .map((item) => ({
        name: item.name,
        slug: item.slug,
        icon: item.icon,
        image: item.image,
        href: `/animals/${item.slug}`,
      }));
  }, [animals]);

  if (!cards.length) {
    return null;
  }

  // Symmetrical row splitting: if odd, 1 extra on upper row
  const useTwoRows = cards.length > 4;
  const midpoint = useTwoRows ? Math.ceil(cards.length / 2) : cards.length;
  const topRow = cards.slice(0, midpoint);
  const bottomRow = useTwoRows ? cards.slice(midpoint) : [];

  return (
    <section
      id="shop-by-category"
      className="scroll-mt-24 bg-[#fbf7f1] py-10 sm:py-12 lg:py-14"
    >
      <Container>
        <div className="text-center">
          <h2 className="text-3xl font-black leading-tight text-main sm:text-4xl lg:text-5xl">
            Shop by category
          </h2>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3 sm:mt-10 sm:gap-5">
          {/* Upper Row */}
          <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:gap-5">
            {topRow.map((item) => (
              <CategoryCard key={item.slug || item.name} item={item} />
            ))}
          </div>

          {/* Lower Row (symmetrical & centered) */}
          {bottomRow.length > 0 && (
            <div className="flex w-full flex-wrap items-center justify-center gap-2 sm:gap-5">
              {bottomRow.map((item) => (
                <CategoryCard key={item.slug || item.name} item={item} />
              ))}
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
