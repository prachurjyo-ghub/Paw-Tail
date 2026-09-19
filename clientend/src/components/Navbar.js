"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import Container from "@/components/Container";
import CategoryIcon from "@/components/CategoryIcon";
import { resolveCatalogImageUrl } from "@/lib/categoryApi";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Animals", href: "/animals" },
  { label: "Categories", href: "/categories" },
  { label: "Brands", href: "/brands" },
  { label: "Contact", href: "/contact" },
];

function NavDropdown({ label, children }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div 
      className="group relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <div className="relative inline-flex cursor-pointer items-center gap-1 transition-opacity duration-300 hover:opacity-80 py-2">
        {label}
        <span className="text-xs transition-transform duration-300 group-hover:rotate-180">▾</span>
      </div>

      <div 
        className={`absolute left-1/2 top-full z-50 w-56 -translate-x-1/2 pt-2 transition-all duration-300 ${
          isOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2"
        }`}
      >
        <div className="rounded-lg border border-white/10 bg-white p-2 text-left text-main shadow-[0_18px_55px_rgba(23,63,49,0.2)]">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Navbar({ animals = [], categories = [], brands = [] }) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const pathname = usePathname();

  const closeMenus = useCallback(() => {
    setOpenDropdown(null);
  }, []);

  const handleToggle = (label) => {
    setOpenDropdown((prev) => (prev === label ? null : label));
  };

  const handleHomeClick = (event) => {
    if (pathname !== "/") return;
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="hidden lg:block bg-main text-white">
      <Container className="text-center">
        <div className="flex min-h-13 items-center justify-center py-3 lg:py-0">
          <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-base font-semibold">
            {navLinks.map((item) => {
              if (item.label === "Animals") {
                return (
                  <NavDropdown
                    key={item.label}
                    label={item.label}
                  >
                    {animals.map((animal) => (
                      <Link
                        key={animal.slug}
                        href={`/animals/${animal.slug}`}
                        className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-black transition-colors hover:bg-[#eef8f2]"
                      >
                        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-mainSoft text-main">
                          {resolveCatalogImageUrl(animal.image) ? (
                            <Image
                              src={resolveCatalogImageUrl(animal.image)}
                              alt={animal.name}
                              width={28}
                              height={28}
                              unoptimized
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <CategoryIcon slug={animal.slug} name={animal.name} className="h-4 w-4" />
                          )}
                        </span>
                        {animal.name}
                      </Link>
                    ))}
                  </NavDropdown>
                );
              }

              if (item.label === "Categories") {
                return (
                  <NavDropdown
                    key={item.label}
                    label={item.label}
                  >
                    {categories.map((category) => (
                      <Link
                        key={category.slug}
                        href={`/categories/${category.slug}`}
                        className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-black transition-colors hover:bg-[#eef8f2]"
                      >
                        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-mainSoft text-main">
                          {category.imageUrl ? (
                            <Image
                              src={category.imageUrl}
                              alt={category.name}
                              width={28}
                              height={28}
                              unoptimized
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <CategoryIcon slug={category.slug} name={category.name} className="h-4 w-4" />
                          )}
                        </span>
                        {category.name}
                      </Link>
                    ))}
                  </NavDropdown>
                );
              }

              if (item.label === "Brands") {
                return (
                  <NavDropdown
                    key={item.label}
                    label={item.label}
                  >
                    {brands.map((brand) => (
                      <Link
                        key={brand.slug}
                        href={`/brands/${brand.slug}`}
                        className="flex items-center gap-3 rounded-md px-3 py-3 text-sm font-black transition-colors hover:bg-[#eef8f2]"
                      >
                        <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-mainSoft text-main">
                          {brand.imageUrl ? (
                            <Image
                              src={brand.imageUrl}
                              alt={brand.name}
                              width={28}
                              height={28}
                              unoptimized
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <span className="text-[10px] font-black text-main">
                              {(brand.name || "?")
                                .split(" ")
                                .slice(0, 2)
                                .map((part) => part[0])
                                .join("")
                                .toUpperCase()}
                            </span>
                          )}
                        </span>
                        {brand.name}
                      </Link>
                    ))}
                  </NavDropdown>
                );
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={item.label === "Home" ? handleHomeClick : undefined}
                  className="transition-opacity duration-300 hover:opacity-80"
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </Container>
    </div>
  );
}
