import Link from "next/link";

import Container from "@/components/Container";
import ProductCard from "@/components/category/ProductCard";
import { getProductsFromApi } from "@/lib/productApi";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Search · PawTail",
  description: "Search PawTail pet products.",
};

const normalizeQuery = (value) =>
  (Array.isArray(value) ? value[0] : value || "").trim().slice(0, 80);

export default async function SearchPage({ searchParams }) {
  const params = await searchParams;
  const query = normalizeQuery(params?.q);
  const products = query
    ? await getProductsFromApi({ search: query, limit: 100 })
    : [];

  return (
    <main className="min-h-screen bg-[#f6f1e8] pb-[100px] pt-7">
      <Container>
        <nav className="mb-[18px] text-[13px] font-semibold text-[#5d6b65]">
          <Link href="/" className="transition-colors hover:text-[#173f31]">
            Home
          </Link>{" "}
          / <span className="text-[#173f31]">Search</span>
        </nav>

        <header className="mb-6 rounded-[20px] bg-[#173f31] p-5 text-white sm:p-7">
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#ee9322]">
            Product Search
          </p>
          <h1 className="text-[28px] font-extrabold leading-tight tracking-[-0.04em] sm:text-[36px]">
            {query ? `Results for “${query}”` : "Find your pet essentials"}
          </h1>
          <p className="mt-2 text-sm font-medium text-white/75 sm:text-[15px]">
            {query
              ? `${products.length} ${products.length === 1 ? "product" : "products"} found`
              : "Use the search bar above to find food, toys, grooming products, and more."}
          </p>
        </header>

        {query && products.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 xl:gap-5">
            {products.map((product) => (
              <ProductCard key={product._id || product.slug} product={product} />
            ))}
          </div>
        ) : (
          <section className="flex flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-[#173f31]/10 bg-white px-5 py-20 text-center">
            <span className="mb-4 text-4xl" aria-hidden>
              🔍
            </span>
            <h2 className="mb-2 text-xl font-extrabold text-[#173f31]">
              {query ? "No products found" : "What are you looking for?"}
            </h2>
            <p className="max-w-md text-[14px] font-medium leading-6 text-[#5d6b65]">
              {query
                ? "Try a shorter or more general term, such as food, toy, shampoo, or the product name."
                : "Enter a product name or keyword in the search bar to begin."}
            </p>
          </section>
        )}
      </Container>
    </main>
  );
}
