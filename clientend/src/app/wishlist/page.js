"use client";

import Image from "next/image";
import Link from "next/link";
import { HiOutlineHeart, HiTrash } from "react-icons/hi2";

import Container from "@/components/Container";
import { WishlistPageSkeleton } from "@/components/skeletons/StorefrontSkeletons";
import { useWishlist } from "@/components/WishlistProvider";
import { getProductImageUrl } from "@/lib/productApi";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const getImageUrl = (src) => getProductImageUrl(src) || "/window.svg";

export default function WishlistPage() {
  const {
    wishlistItems,
    removeFromWishlist,
    clearWishlist,
    isLoading,
    isReady,
  } = useWishlist();

  if (!isReady || isLoading) {
    return <WishlistPageSkeleton />;
  }

  return (
    <main className="bg-white">
      <Container className="py-8 lg:py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-accent">
              Saved products
            </p>
            <h1 className="mt-2 text-3xl font-black text-neutral-950">
              Your Wishlist
            </h1>
          </div>

          {wishlistItems.length ? (
            <button
              type="button"
              onClick={() => clearWishlist().catch(() => undefined)}
              className="inline-flex h-11 items-center justify-center rounded-full border border-neutral-200 px-5 text-sm font-black text-main transition-colors duration-300 hover:border-main hover:bg-main hover:text-white"
            >
              Clear Wishlist
            </button>
          ) : null}
        </div>

        {isReady && !isLoading && wishlistItems.length === 0 ? (
          <div className="mt-8 rounded-lg border border-neutral-200 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-main/10 text-2xl text-main">
              <HiOutlineHeart />
            </div>
            <h2 className="mt-4 text-xl font-black text-neutral-950">
              Your wishlist is empty
            </h2>
            <p className="mt-2 text-neutral-600">
              Save products you like and they will show up here.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex h-12 items-center justify-center rounded-full bg-main px-6 text-sm font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-main/90"
            >
              Continue Shopping
            </Link>
          </div>
        ) : null}

        {isReady && wishlistItems.length ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {wishlistItems.map((item) => {
              const hasDiscount = typeof item.discountPrice === "number";

              return (
                <article
                  key={item._id}
                  className="group rounded-lg border border-neutral-200 bg-white p-3 transition-all duration-300 hover:-translate-y-1 hover:border-main/30 hover:shadow-[0_16px_40px_rgba(23,63,49,0.10)]"
                >
                  <Link
                    href={`/product/${item.slug}`}
                    className="relative block aspect-square overflow-hidden rounded-md bg-neutral-50"
                  >
                    <Image
                      src={getImageUrl(item.image)}
                      alt={item.name}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
                    />
                  </Link>

                  <div className="mt-4">
                    {item.brand ? (
                      <p className="text-xs font-bold uppercase tracking-wide text-accent">
                        {item.brand}
                      </p>
                    ) : null}
                    <Link
                      href={`/product/${item.slug}`}
                      className="mt-1 line-clamp-2 block min-h-12 text-sm font-black leading-6 text-neutral-950 transition-colors duration-300 hover:text-main"
                    >
                      {item.name}
                    </Link>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="font-black text-main">
                        {formatPrice(hasDiscount ? item.discountPrice : item.price)}
                      </span>
                      {hasDiscount ? (
                        <span className="text-sm text-neutral-400 line-through">
                          {formatPrice(item.price)}
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        removeFromWishlist(item._id).catch(() => undefined)
                      }
                      className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-full border border-neutral-200 px-4 text-sm font-black text-red-600 transition-colors duration-300 hover:border-red-200 hover:bg-red-50"
                    >
                      <HiTrash />
                      Remove
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}
      </Container>
    </main>
  );
}
