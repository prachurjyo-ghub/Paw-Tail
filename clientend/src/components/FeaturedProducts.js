"use client";

import { useEffect, useState } from "react";
import Container from "@/components/Container";
import ProductCard from "@/components/category/ProductCard";
import { FeaturedProductsSkeleton } from "@/components/skeletons/StorefrontSkeletons";
import { apiRequest } from "@/lib/api";
import { mapProductForListingCard } from "@/lib/productApi";

export default function FeaturedProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    apiRequest("/products/get-products?isFeatured=true&limit=50")
      .then((data) => {
        if (!alive) return;
        
        // Map backend product data to exactly what ProductCard expects
        const mappedProducts = (data.products || []).map((p) => {
          const mapped = mapProductForListingCard(p);
          // Ensure brand is a string to prevent React object child errors
          mapped.brand = p.brand?.name || "Premium Brand";
          return mapped;
        });

        // Randomly shuffle the products if there are many, then take up to 10 to fit 5-column grid perfectly
        const shuffled = mappedProducts.sort(() => 0.5 - Math.random());
        const selectedProducts = shuffled.slice(0, 10);

        setProducts(selectedProducts);
      })
      .catch((err) => {
        console.error("Failed to load featured products:", err);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  if (loading) {
    return <FeaturedProductsSkeleton />;
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="bg-white pt-[72px] pb-[56px]">
      <Container>
        <div className="mx-auto max-w-[560px] text-center mb-9">
          <h2 className="text-[clamp(28px,3.6vw,40px)] font-extrabold tracking-tight text-main">
            Featured Products
          </h2>
          <p className="mt-2.5 text-[15.5px] text-[#5d6b65]">
            Discover our premium selection of top-rated items, handpicked for quality and care.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {products.map((product) => (
            <ProductCard key={product._id || product.slug} product={product} />
          ))}
        </div>
      </Container>
    </section>
  );
}
