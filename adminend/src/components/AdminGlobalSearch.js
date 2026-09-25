"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { adminApi } from "@/lib/adminApi";
import { getOrdersFromApi } from "@/lib/orderApi";

let searchCache = null;

async function loadSearchData() {
  if (searchCache) return searchCache;

  const [orders, productsData, accountsData] = await Promise.all([
    getOrdersFromApi(),
    adminApi("/products/get-products?limit=1000", { cache: "no-store" }),
    adminApi("/users/accounts", { cache: "no-store" }),
  ]);

  searchCache = {
    orders: orders || [],
    products: productsData.products || [],
    accounts: accountsData.accounts || [],
  };
  return searchCache;
}

export default function AdminGlobalSearch() {
  const rootRef = useRef(null);
  const [query, setQuery] = useState("");
  const [data, setData] = useState(searchCache);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (query.trim().length < 2 || data) return undefined;
    let alive = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const loaded = await loadSearchData();
        if (alive) setData(loaded);
      } catch {
        if (alive) setData({ orders: [], products: [], accounts: [] });
      } finally {
        if (alive) setLoading(false);
      }
    }, 180);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [data, query]);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized.length < 2 || !data) return [];

    const includes = (...values) =>
      values.some((value) => String(value || "").toLowerCase().includes(normalized));

    const orders = data.orders
      .filter((order) => includes(order.id, order.customer, order.email, order.phone))
      .slice(0, 4)
      .map((order) => ({
        key: `order-${order.mongoId}`,
        type: "Order",
        title: order.id,
        detail: `${order.customer} · ${order.total}`,
        href: `/dashboard/orders/${order.mongoId}`,
      }));

    const products = data.products
      .filter((product) => includes(product.name, product.slug, product.brand?.name, product.category?.name))
      .slice(0, 4)
      .map((product) => ({
        key: `product-${product._id || product.slug}`,
        type: "Product",
        title: product.name,
        detail: product.brand?.name || product.category?.name || product.slug,
        href: `/dashboard/products/update?slug=${encodeURIComponent(product.slug)}`,
      }));

    const accounts = data.accounts
      .filter((account) => includes(account.name, account.email, account.phone))
      .slice(0, 4)
      .map((account) => ({
        key: `account-${account._id || account.id}`,
        type: "Customer",
        title: account.name || account.email,
        detail: account.email,
        href: `/dashboard/customer-management/${account._id || account.id}`,
      }));

    return [...orders, ...products, ...accounts].slice(0, 8);
  }, [data, query]);

  const showResults = open && query.trim().length >= 2;

  return (
    <div ref={rootRef} className="relative w-full max-w-[500px]">
      <label className="flex h-8 items-center rounded-[7px] border border-[#e4ece7] bg-white px-2.5 text-[#6b7f78] transition focus-within:border-[#2a8567] focus-within:ring-3 focus-within:ring-[#2a8567]/10">
        <svg className="h-[15px] w-[15px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          type="search"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          aria-label="Search orders, products, and customers"
          placeholder="Search orders, products, customers…"
          className="ml-2 min-w-0 flex-1 bg-transparent text-[12.5px] font-medium text-[#132b24] outline-none placeholder:text-[#8a9e96]"
        />
      </label>

      {showResults ? (
        <div className="absolute left-0 right-0 top-10 z-50 overflow-hidden rounded-[10px] border border-[#e4ece7] bg-white shadow-[0_10px_30px_rgba(15,46,38,.14)]">
          {loading ? (
            <p className="px-4 py-5 text-center text-xs font-semibold text-[#6b7f78]">Searching…</p>
          ) : results.length ? (
            <div className="max-h-[360px] overflow-y-auto p-1.5">
              {results.map((result) => (
                <Link
                  key={result.key}
                  href={result.href}
                  onClick={() => {
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex items-center gap-3 rounded-[7px] px-3 py-2.5 transition hover:bg-[#eef7f2]"
                >
                  <span className="w-14 shrink-0 text-[9.5px] font-bold uppercase tracking-[0.08em] text-[#8a9e96]">{result.type}</span>
                  <span className="min-w-0">
                    <strong className="block truncate text-xs font-semibold text-[#132b24]">{result.title}</strong>
                    <span className="mt-0.5 block truncate text-[10.5px] text-[#6b7f78]">{result.detail}</span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="px-4 py-5 text-center text-xs font-semibold text-[#6b7f78]">No matching orders, products, or customers.</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
