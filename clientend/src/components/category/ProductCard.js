"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HiOutlineHeart, HiHeart, HiOutlinePlus } from "react-icons/hi2";

import { useCart } from "@/components/CartProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { useWishlist } from "@/components/WishlistProvider";

function formatPrice(value) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  })
    .format(Number(value || 0))
    .replace("BDT", "৳");
}

export default function ProductCard({ product }) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const [isAdding, setIsAdding] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const productId = product._id || null;
  const productSlug = product.slug || "";
  const isWishlistedNow = productId ? isWishlisted(productId) : false;
  const displayPrice = product.price;
  const oldPrice = product.compareAtPrice ?? product.oldPrice ?? null;
  const discountPercentage = product.discountPercentage ?? 0;
  
  const displayStock = product.stockQuantity ?? 0;
  const isOutOfStock = product.isOutOfStock;

  const handleWishlist = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!productId) return;
    try {
      await toggleWishlist(product);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddToCart = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!productId || isOutOfStock) return;
    if (product.hasVariants) {
      router.push(`/product/${productSlug}`);
      return;
    }

    setIsAdding(true);
    try {
      await addToCart({
        productId,
        variantId: null,
        quantity: 1,
        product,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsAdding(false);
    }
  };

  // Badges logic based on the reference HTML
  const hasDiscount = discountPercentage > 0;
  const isNew = true; // Hardcoded or derive from product.createdAt

  return (
    <article className="group flex flex-col overflow-hidden rounded-[16px] border border-transparent bg-white transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[0_8px_24px_rgba(23,63,49,0.08)]">
      <Link href={productSlug ? `/product/${productSlug}` : "#"} className="flex flex-1 flex-col">
        {/* Media Area */}
        <div className="relative h-[168px] shrink-0 bg-[#f4efe6]">
          {product.imageUrl ? (
            <>
              {!imageLoaded ? (
                <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
              ) : null}
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                onLoad={() => setImageLoaded(true)}
                className={`object-contain p-[10px_16px] transition-[transform,opacity] duration-[0.35s] ease-in-out group-hover:scale-[1.04] ${
                  imageLoaded ? "opacity-100" : "opacity-0"
                }`}
              />
            </>
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-[#173f31]/40">
              No Image
            </div>
          )}

          {/* Badges */}
          <div className="absolute left-[10px] top-[10px] flex flex-col gap-1.5">
            {hasDiscount && (
              <span className="rounded-full bg-[#ee9322] px-2 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.04em] text-white">
                Sale
              </span>
            )}
            {isNew && !hasDiscount && (
              <span className="rounded-full bg-[#173f31] px-2 py-1 text-[10.5px] font-extrabold uppercase tracking-[0.04em] text-white">
                New
              </span>
            )}
          </div>

          {/* Wishlist Button */}
          <button
            type="button"
            onClick={handleWishlist}
            className={`absolute right-[8px] top-[8px] flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-full border-0 shadow-[0_4px_12px_rgba(23,63,49,0.1)] transition-colors ${
              isWishlistedNow ? "bg-[#ee9322] text-white" : "bg-white text-[#173f31]"
            }`}
          >
            {isWishlistedNow ? (
              <HiHeart className="h-5 w-5" />
            ) : (
              <HiOutlineHeart className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Body Area */}
        <div className="flex flex-1 flex-col gap-1.5 p-[12px_14px_14px]">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#5d6b65]">
            {product.category?.name || product.category || "Uncategorized"} ·{" "}
            {typeof product.brand === "string"
              ? product.brand
              : product.brand?.name || "PawTail"}
          </p>
          <h3 className="line-clamp-2 text-[14.5px] font-bold leading-[1.3] tracking-[-0.02em] text-[#173f31]">
            {product.name}
          </h3>

          <div className="text-[12px] font-bold text-[#ee9322]">
            {"★".repeat(Math.max(1, Math.min(5, Math.round(Number(product.averageRating) || 5))))}
            <em className="not-italic font-semibold text-[#5d6b65]">
              {" "}
              ({Number(product.reviewCount) || 1})
            </em>
          </div>

          {displayStock > 0 && displayStock < 10 && (
            <p className="text-[12px] font-semibold text-[#c0561a]">
              Only {displayStock} left
            </p>
          )}

          {/* Buy Area */}
          <div className="mt-auto flex items-center justify-between gap-[10px] pt-1.5">
            <div className="flex flex-wrap items-baseline gap-[7px]">
              <b className="text-[16px] font-extrabold tracking-[-0.03em] text-[#173f31]">
                {formatPrice(displayPrice)}
              </b>
              {oldPrice && oldPrice > displayPrice && (
                <>
                  <s className="text-[12.5px] font-semibold text-[#9aa59f]">
                    {formatPrice(oldPrice)}
                  </s>
                  <span className="text-[11px] font-extrabold text-[#c0392b]">
                    -{Math.round(((oldPrice - displayPrice) / oldPrice) * 100)}%
                  </span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              disabled={isOutOfStock || isAdding}
              className={`flex h-[36px] shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] border-0 px-3 text-[13px] font-bold text-white transition-colors ${
                isAdding
                  ? "bg-[#2f9e5e]"
                  : isOutOfStock
                  ? "cursor-not-allowed bg-[#9aa59f]"
                  : "bg-[#173f31] hover:bg-[#102b22]"
              }`}
            >
              <HiOutlinePlus className="h-4 w-4" />
              <span className="hidden sm:inline">
                {product.hasVariants ? "Options" : isAdding ? "Added" : "Add"}
              </span>
            </button>
          </div>
        </div>
      </Link>
    </article>
  );
}
