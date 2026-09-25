"use client";

import { useCallback, useMemo, useState } from "react";

const roundPriceCeiling = (value) =>
  Math.max(100, Math.ceil(Number(value || 0) / 100) * 100);

const getProductPrice = (product) => Number(product.price || 0);

export function useCatalogFilters(products = []) {
  const priceCeiling = useMemo(
    () => roundPriceCeiling(Math.max(0, ...products.map(getProductPrice))),
    [products]
  );
  const [maxPrice, setMaxPrice] = useState(null);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [brand, setBrand] = useState("");
  const [lifeStage, setLifeStage] = useState("");
  const [sort, setSort] = useState("recommended");

  const effectiveMaxPrice =
    maxPrice === null ? priceCeiling : Math.min(maxPrice, priceCeiling);
  const hasActiveFilters =
    maxPrice !== null || inStockOnly || Boolean(brand) || Boolean(lifeStage);

  const filteredProducts = useMemo(() => {
    const normalizedStage = lifeStage.toLowerCase();
    const result = products.filter((product) => {
      if (getProductPrice(product) > effectiveMaxPrice) return false;
      if (inStockOnly && product.isOutOfStock) return false;
      if (brand && String(product.brand || "").toLowerCase() !== brand.toLowerCase()) {
        return false;
      }
      if (normalizedStage) {
        const searchable = [product.name, ...(product.tags || [])]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(normalizedStage)) return false;
      }
      return true;
    });

    return [...result].sort((first, second) => {
      if (sort === "price-asc") return getProductPrice(first) - getProductPrice(second);
      if (sort === "price-desc") return getProductPrice(second) - getProductPrice(first);
      if (sort === "newest") {
        return new Date(second.createdAt || 0) - new Date(first.createdAt || 0);
      }
      if (first.isFeatured !== second.isFeatured) return first.isFeatured ? -1 : 1;
      return 0;
    });
  }, [brand, effectiveMaxPrice, inStockOnly, lifeStage, products, sort]);

  const clearFilters = useCallback(() => {
    setMaxPrice(null);
    setInStockOnly(false);
    setBrand("");
    setLifeStage("");
  }, []);

  const updateMaxPrice = useCallback(
    (value) => {
      const nextValue = Math.min(priceCeiling, Math.max(0, Number(value)));
      setMaxPrice(nextValue >= priceCeiling ? null : nextValue);
    },
    [priceCeiling]
  );

  return {
    brand,
    clearFilters,
    effectiveMaxPrice,
    filteredProducts,
    hasActiveFilters,
    inStockOnly,
    lifeStage,
    maxPrice,
    priceCeiling,
    setBrand,
    setInStockOnly,
    setLifeStage,
    setSort,
    sort,
    updateMaxPrice,
  };
}
