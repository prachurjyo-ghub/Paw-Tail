"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  HiMinus,
  HiHeart,
  HiOutlineHeart,
  HiOutlineShoppingBag,
  HiOutlineStar,
  HiPlus,
  HiStar,
} from "react-icons/hi2";

import { useCart } from "@/components/CartProvider";
import LoginPopover from "@/components/LoginPopover";
import { Skeleton } from "@/components/ui/skeleton";
import { useWishlist } from "@/components/WishlistProvider";
import { useAuth } from "@/context/AuthContext";
import { getProductImageUrl } from "@/lib/productApi";
import { getMediaRetentionToken } from "@/lib/media";
import { getProductReviews, submitProductReview } from "@/lib/reviewApi";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const getImageUrl = (src, options) =>
  getProductImageUrl(src, options) || "/window.svg";

const getFinalPrice = (product, selectedVariant) => {
  if (selectedVariant) {
    return Number(product.price || 0) + Number(selectedVariant.priceAdjustment || 0);
  }

  const basePrice =
    typeof product.discountPrice === "number" ? product.discountPrice : product.price;
  return Number(basePrice || 0);
};

const formatReviewDate = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

function StarRating({ value = 0, onChange, readOnly = false, size = "md" }) {
  const sizeClass = size === "sm" ? "text-base" : "text-xl";
  const stars = [1, 2, 3, 4, 5];

  return (
    <div className={`inline-flex items-center gap-1 ${sizeClass}`}>
      {stars.map((star) => {
        const filled = star <= value;
        const Icon = filled ? HiStar : HiOutlineStar;

        if (readOnly) {
          return (
            <Icon
              key={star}
              className={filled ? "text-accent" : "text-neutral-300"}
              aria-hidden="true"
            />
          );
        }

        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange?.(star)}
            className="transition-transform duration-200 hover:scale-110"
            aria-label={`Rate ${star} out of 5 stars`}
          >
            <Icon className={filled ? "text-accent" : "text-neutral-300"} />
          </button>
        );
      })}
    </div>
  );
}

function QuantityControl({ quantity, setQuantity, disabled, maxQuantity }) {
  return (
    <div className="inline-flex h-12 items-center overflow-hidden rounded-full border border-neutral-200 bg-white">
      <button
        type="button"
        disabled={disabled || quantity <= 1}
        onClick={() => setQuantity((current) => Math.max(1, current - 1))}
        className="flex h-12 w-12 items-center justify-center text-main transition-colors duration-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-neutral-300"
        aria-label="Decrease quantity"
      >
        <HiMinus />
      </button>
      <span className="flex h-12 min-w-12 items-center justify-center border-x border-neutral-200 px-4 text-base font-bold text-neutral-900">
        {quantity}
      </span>
      <button
        type="button"
        disabled={disabled || quantity >= maxQuantity}
        onClick={() =>
          setQuantity((current) => Math.min(maxQuantity, current + 1))
        }
        className="flex h-12 w-12 items-center justify-center text-main transition-colors duration-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-neutral-300"
        aria-label="Increase quantity"
      >
        <HiPlus />
      </button>
    </div>
  );
}

function RelatedProductCard({ product }) {
  const imageUrl = getImageUrl(product.images?.[0], { width: 500 });
  const hasDiscount = typeof product.discountPrice === "number";

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block rounded-lg border border-neutral-200 bg-white p-3 transition-all duration-300 hover:-translate-y-1 hover:border-main/30 hover:shadow-[0_16px_40px_rgba(23,63,49,0.10)]"
    >
      <div className="relative aspect-square overflow-hidden rounded-md bg-neutral-50">
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-contain p-4 transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <h3 className="mt-4 line-clamp-2 min-h-12 text-sm font-bold leading-6 text-neutral-900">
        {product.name}
      </h3>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="font-black text-main">
          {formatPrice(hasDiscount ? product.discountPrice : product.price)}
        </span>
        {hasDiscount ? (
          <span className="text-sm text-neutral-400 line-through">
            {formatPrice(product.price)}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

export default function ProductDetails({ product, relatedProducts }) {
  const { addToCart } = useCart();
  const { isWishlisted, toggleWishlist } = useWishlist();
  const { user } = useAuth();
  const images = product.images?.length ? product.images : [null];
  const [selectedImage, setSelectedImage] = useState(images[0]);
  const [loadedImageSrc, setLoadedImageSrc] = useState("");
  const activeVariants = useMemo(
    () => (product.variants || []).filter((variant) => variant.isActive !== false),
    [product.variants]
  );
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [cartMessage, setCartMessage] = useState("");
  const [wishlistMessage, setWishlistMessage] = useState("");
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [productRating, setProductRating] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const selectedVariant = activeVariants.find(
    (variant) => variant._id === selectedVariantId
  );
  const finalPrice = getFinalPrice(product, selectedVariant);
  const originalSelectedPrice =
    Number(product.price || 0) + Number(selectedVariant?.priceAdjustment || 0);
  const stockQuantity =
    selectedVariant?.stockQuantity ?? product.stockQuantity ?? 0;
  const isOutOfStock = selectedVariant
    ? Number(selectedVariant.stockQuantity || 0) <= 0
    : Number(product.stockQuantity || 0) <= 0;
  const hasDiscount = typeof product.discountPrice === "number";
  const showDiscount = hasDiscount && !selectedVariant;
  const productIsWishlisted = isWishlisted(product._id);
  const displayAverage =
    productRating?.averageRating ??
    product.averageRating ??
    (reviews.length
      ? reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) /
        reviews.length
      : 5);
  const displayCount =
    productRating?.reviewCount ??
    product.reviewCount ??
    (reviews.length || 1);
  const roundedAverageRating = Number(displayAverage).toFixed(1);
  const starValue = Math.round(Number(displayAverage) || 5);
  const selectedImageUrl = getImageUrl(selectedImage, { width: 1600 });
  const selectedImageLoaded = loadedImageSrc === selectedImageUrl;

  useEffect(() => {
    let alive = true;

    queueMicrotask(() => {
      if (!alive) return;
      setReviewsLoading(true);
      getProductReviews(product._id)
        .then((result) => {
          if (!alive) return;
          setReviews(result.reviews || []);
          setProductRating(result.rating || null);
        })
        .catch(() => {
          if (!alive) return;
          setReviews([]);
          setProductRating(null);
        })
        .finally(() => {
          if (alive) setReviewsLoading(false);
        });
    });

    return () => {
      alive = false;
    };
  }, [product._id]);

  const tabs = [
    { id: "description", label: "Description" },
    { id: "information", label: "Additional information" },
    { id: "reviews", label: "Reviews" },
  ];

  const handleAddToCart = async () => {
    setCartMessage("");
    setIsAddingToCart(true);

    try {
      await addToCart({
        productId: product._id,
        variantId: selectedVariant?._id || null,
        quantity,
        product,
      });
      setCartMessage("Added to cart");
    } catch (error) {
      setCartMessage(error.message || "Could not add to cart");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleToggleWishlist = async () => {
    setWishlistMessage("");

    try {
      const added = await toggleWishlist(product);
      setWishlistMessage(added ? "Added to wishlist" : "Removed from wishlist");
    } catch (error) {
      setWishlistMessage(error.message || "Could not update wishlist");
    }
  };

  const handleOpenReviewForm = () => {
    setReviewMessage("");
    setActiveTab("reviews");

    if (!user) {
      setIsLoginOpen(true);
      return;
    }

    setShowReviewForm((current) => !current);
  };

  const handleSubmitReview = async (event) => {
    event.preventDefault();
    setReviewMessage("");

    if (!user) {
      setIsLoginOpen(true);
      return;
    }

    if (!reviewRating) {
      setReviewMessage("Please select a star rating.");
      return;
    }

    setIsSubmittingReview(true);

    try {
      const review = await submitProductReview({
        productId: product._id,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });

      if (review) {
        setReviews((current) => [review, ...current]);
        setProductRating((current) => {
          const previousCount = current?.isBaseline
            ? 0
            : Number(current?.reviewCount || reviews.length || 0);
          const nextCount = previousCount + 1;
          const previousAvg = current?.isBaseline
            ? 0
            : Number(current?.averageRating || 0) * previousCount;
          const nextAvg =
            Math.round(((previousAvg + Number(review.rating)) / nextCount) * 10) /
            10;
          return {
            averageRating: nextAvg,
            reviewCount: nextCount,
            isBaseline: false,
          };
        });
      }
      setReviewRating(0);
      setReviewComment("");
      setShowReviewForm(false);
      setReviewMessage("Thank you! Your review is live.");
      setActiveTab("reviews");
    } catch (error) {
      setReviewMessage(error.message || "Could not submit review");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <>
      <nav className="flex flex-wrap items-center gap-2 text-sm text-neutral-500">
        <Link href="/" className="transition-colors duration-300 hover:text-main">
          Home
        </Link>
        <span>/</span>
        {product.category?.slug ? (
          <Link
            href={`/categories/${product.animal?.slug || product.category.slug}`}
            className="transition-colors duration-300 hover:text-main"
          >
            {product.category.name}
          </Link>
        ) : (
          <span>{product.category?.name || "Products"}</span>
        )}
        <span>/</span>
        <span className="font-semibold text-neutral-800">{product.name}</span>
      </nav>

      <section className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <div>
          <div className="relative aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50">
            {!selectedImageLoaded ? (
              <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
            ) : null}
            {showDiscount && product.discountPercentage > 0 ? (
              <span className="absolute left-4 top-4 z-10 rounded-full bg-accent px-3 py-1 text-sm font-black text-white">
                -{Math.round(product.discountPercentage)}%
              </span>
            ) : null}
            <Image
              src={selectedImageUrl}
              alt={product.name}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
              onLoad={() => setLoadedImageSrc(selectedImageUrl)}
              className={`object-contain p-8 transition-opacity duration-300 ${
                selectedImageLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          </div>

          {images.length > 1 ? (
            <div className="mt-4 grid grid-cols-5 gap-3 sm:grid-cols-6">
              {images.map((image) => (
                <button
                  key={getMediaRetentionToken(image)}
                  type="button"
                  onClick={() => setSelectedImage(image)}
                  className={`relative aspect-square overflow-hidden rounded-md border bg-neutral-50 transition-all duration-300 ${
                    selectedImage === image
                      ? "border-main ring-2 ring-main/15"
                      : "border-neutral-200 hover:border-main/40"
                  }`}
                  aria-label={`View ${product.name} image`}
                >
                  <Image
                    src={getImageUrl(image, { width: 240 })}
                    alt={product.name}
                    fill
                    sizes="96px"
                    className="object-contain p-2"
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {product.brand?.name ? (
              <span className="rounded-full bg-main/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-main">
                {product.brand.name}
              </span>
            ) : null}
            {product.isFeatured ? (
              <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent">
                Featured
              </span>
            ) : null}
          </div>

          <h1 className="mt-4 text-3xl font-black leading-tight text-neutral-950 sm:text-4xl">
            {product.name}
          </h1>

          <div className="mt-4 flex items-center gap-1">
            <StarRating value={starValue} readOnly />
            <span className="ml-2 text-sm font-semibold text-neutral-500">
              {roundedAverageRating} out of 5 from {displayCount} review
              {displayCount === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <span className="text-3xl font-black text-main">
              {formatPrice(finalPrice)}
            </span>
            {activeVariants.length ? (
              <span className="pb-1 text-sm font-semibold text-neutral-500">
                Selected option price
              </span>
            ) : null}
            {showDiscount ? (
              <span className="pb-1 text-xl font-semibold text-neutral-400 line-through">
                {formatPrice(originalSelectedPrice)}
              </span>
            ) : null}
          </div>

          <p className="mt-5 line-clamp-4 text-base leading-8 text-neutral-600">
            {product.description}
          </p>

          <div className="mt-6 space-y-4 border-y border-neutral-200 py-6">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-bold text-neutral-900">Availability:</span>
              <span
                className={`rounded-full px-3 py-1 font-bold ${
                  isOutOfStock
                    ? "bg-red-50 text-red-600"
                    : "bg-emerald-50 text-emerald-700"
                }`}
              >
                {isOutOfStock ? "Out of stock" : `${stockQuantity} in stock`}
              </span>
            </div>

            {activeVariants.length ? (
              <div>
                <p className="text-sm font-bold text-neutral-900">Choose pack size / weight</p>
                <p className="mt-1 text-xs font-medium text-neutral-500">
                  Select the exact pack you want before adding it to your cart.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVariantId("");
                      setQuantity(1);
                      setCartMessage("");
                    }}
                    disabled={Number(product.stockQuantity || 0) <= 0}
                    aria-pressed={!selectedVariantId}
                    className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
                      !selectedVariantId
                        ? "border-main bg-main text-white shadow-sm"
                        : "border-neutral-200 text-neutral-700 hover:border-main hover:text-main"
                    }`}
                  >
                    <span className="block">Base pack</span>
                    <span className="mt-1 block text-xs">{formatPrice(getFinalPrice(product, null))}</span>
                    <span className="mt-1 block text-[11px] opacity-80">
                      {Number(product.stockQuantity || 0) <= 0
                        ? "Out of stock"
                        : `${Number(product.stockQuantity)} in stock`}
                    </span>
                  </button>
                  {activeVariants.map((variant) => {
                    const variantPrice = getFinalPrice(product, variant);
                    const variantStock = Number(variant.stockQuantity || 0);
                    const variantOutOfStock = variantStock <= 0;

                    return (
                      <button
                        key={variant._id}
                        type="button"
                      onClick={() => {
                        setSelectedVariantId(variant._id);
                        setQuantity(1);
                        setCartMessage("");
                      }}
                        disabled={variantOutOfStock}
                        aria-pressed={selectedVariantId === variant._id}
                        className={`rounded-xl border px-4 py-3 text-left text-sm font-bold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
                          selectedVariantId === variant._id
                            ? "border-main bg-main text-white shadow-sm"
                            : "border-neutral-200 text-neutral-700 hover:border-main hover:text-main"
                        }`}
                      >
                        <span className="block">{variant.value || variant.name || variant.sku}</span>
                        <span className="mt-1 block text-xs">{formatPrice(variantPrice)}</span>
                        <span className="mt-1 block text-[11px] opacity-80">
                          {variantOutOfStock ? "Out of stock" : `${variantStock} in stock`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-4">
              <QuantityControl
                quantity={quantity}
                setQuantity={setQuantity}
                disabled={isOutOfStock}
                maxQuantity={Math.max(stockQuantity, 1)}
              />
              <button
                type="button"
                disabled={isOutOfStock || isAddingToCart}
                onClick={handleAddToCart}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-main px-6 text-sm font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-main/90 disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                <HiOutlineShoppingBag className="text-lg" />
                {isAddingToCart ? "Adding..." : "Add to Cart"}
              </button>
              <button
                type="button"
                onClick={handleToggleWishlist}
                className={`inline-flex h-12 items-center justify-center gap-2 rounded-full border px-5 text-sm font-black transition-all duration-300 ${
                  productIsWishlisted
                    ? "border-main bg-main text-white"
                    : "border-neutral-200 text-main hover:border-main hover:bg-main hover:text-white"
                }`}
              >
                {productIsWishlisted ? (
                  <HiHeart className="text-lg" />
                ) : (
                  <HiOutlineHeart className="text-lg" />
                )}
                Wishlist
              </button>
            </div>
            {cartMessage ? (
              <p
                className={`text-sm font-bold ${
                  cartMessage === "Added to cart" ? "text-emerald-700" : "text-red-600"
                }`}
              >
                {cartMessage}
              </p>
            ) : null}
            {wishlistMessage ? (
              <p
                className={`text-sm font-bold ${
                  wishlistMessage.includes("Added") ||
                  wishlistMessage.includes("Removed")
                    ? "text-emerald-700"
                    : "text-red-600"
                }`}
              >
                {wishlistMessage}
              </p>
            ) : null}
          </div>

          <dl className="mt-6 grid gap-3 text-sm text-neutral-600 sm:grid-cols-2">
            <div>
              <dt className="font-bold text-neutral-900">Category</dt>
              <dd>{product.category?.name || "Uncategorized"}</dd>
            </div>
            <div>
              <dt className="font-bold text-neutral-900">Brand</dt>
              <dd>{product.brand?.name || "No brand"}</dd>
            </div>
            {selectedVariant?.sku ? (
              <div>
                <dt className="font-bold text-neutral-900">SKU</dt>
                <dd>{selectedVariant.sku}</dd>
              </div>
            ) : null}
            {product.tags?.length ? (
              <div>
                <dt className="font-bold text-neutral-900">Tags</dt>
                <dd>{product.tags.join(", ")}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      </section>

      <section className="mt-14 border-t border-neutral-200 pt-8">
        <div className="flex flex-wrap gap-2 border-b border-neutral-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`border-b-2 px-4 py-3 text-sm font-black transition-colors duration-300 ${
                activeTab === tab.id
                  ? "border-main text-main"
                  : "border-transparent text-neutral-500 hover:text-main"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="py-7">
          {activeTab === "description" ? (
            <p className="max-w-4xl whitespace-pre-line text-base leading-8 text-neutral-700">
              {product.description}
            </p>
          ) : null}

          {activeTab === "information" ? (
            <div className="grid max-w-3xl gap-4 text-sm sm:grid-cols-2">
              <div className="rounded-lg border border-neutral-200 p-4">
                <p className="font-bold text-neutral-900">Stock</p>
                <p className="mt-1 text-neutral-600">{stockQuantity}</p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-4">
                <p className="font-bold text-neutral-900">Offer</p>
                <p className="mt-1 text-neutral-600">
                  {hasDiscount ? `${product.discountPercentage}% discount` : "No active offer"}
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-4">
                <p className="font-bold text-neutral-900">Category</p>
                <p className="mt-1 text-neutral-600">
                  {product.category?.name || "Uncategorized"}
                </p>
              </div>
              <div className="rounded-lg border border-neutral-200 p-4">
                <p className="font-bold text-neutral-900">Brand</p>
                <p className="mt-1 text-neutral-600">
                  {product.brand?.name || "No brand"}
                </p>
              </div>
            </div>
          ) : null}

          {activeTab === "reviews" ? (
            <div className="max-w-2xl rounded-lg border border-neutral-200 p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-neutral-950">Reviews</h2>
                  <div className="mt-2 flex items-center gap-2">
                    <StarRating value={starValue} readOnly size="sm" />
                    <span className="text-sm font-semibold text-neutral-500">
                      {roundedAverageRating} average from {displayCount} review
                      {displayCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenReviewForm}
                  className="rounded-full border border-main px-5 py-2.5 text-sm font-black text-main transition-all duration-300 hover:bg-main hover:text-white"
                >
                  {showReviewForm ? "Cancel" : "Add a review"}
                </button>
              </div>

              {reviewMessage ? (
                <p
                  className={`mt-4 text-sm font-semibold ${
                    reviewMessage.startsWith("Thank you")
                      ? "text-emerald-700"
                      : "text-red-600"
                  }`}
                >
                  {reviewMessage}
                </p>
              ) : null}

              {showReviewForm && user ? (
                <form
                  onSubmit={handleSubmitReview}
                  className="mt-5 rounded-lg border border-neutral-200 bg-neutral-50 p-4"
                >
                  <p className="text-sm font-bold text-neutral-900">Your rating</p>
                  <div className="mt-2">
                    <StarRating value={reviewRating} onChange={setReviewRating} />
                  </div>

                  <label className="mt-4 block text-sm font-bold text-neutral-900">
                    Your review{" "}
                    <span className="font-medium text-neutral-500">(optional)</span>
                    <textarea
                      value={reviewComment}
                      onChange={(event) => setReviewComment(event.target.value)}
                      rows={4}
                      maxLength={500}
                      placeholder="Share your experience with this product..."
                      className="mt-2 w-full resize-none rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm leading-6 text-neutral-700 outline-none transition-colors duration-300 focus:border-main"
                    />
                  </label>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs font-medium text-neutral-500">
                      {reviewComment.length}/500 characters
                    </span>
                    <button
                      type="submit"
                      disabled={isSubmittingReview}
                      className="rounded-full bg-main px-6 py-2.5 text-sm font-black text-white transition-all duration-300 hover:bg-main/90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {isSubmittingReview ? "Submitting..." : "Submit review"}
                    </button>
                  </div>
                </form>
              ) : null}

              {!user ? (
                <p className="mt-4 text-sm text-neutral-600">
                  Please log in to share your review.
                </p>
              ) : null}

              {reviewsLoading ? (
                <div className="mt-5 space-y-4">
                  {Array.from({ length: 3 }, (_, index) => (
                    <Skeleton key={index} className="h-28 w-full rounded-lg" />
                  ))}
                </div>
              ) : reviews.length ? (
                <div className="mt-5 space-y-4">
                  {reviews.map((review) => (
                    <article key={review._id} className="rounded-lg border border-neutral-200 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-black text-neutral-950">
                            {review.customerName}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <StarRating
                              value={Number(review.rating || 0)}
                              readOnly
                              size="sm"
                            />
                            {review.createdAt ? (
                              <span className="text-xs font-medium text-neutral-500">
                                {formatReviewDate(review.createdAt)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-neutral-600">
                        {review.comment?.trim()
                          ? review.comment
                          : "Rated this product."}
                      </p>
                      {review.reply ? (
                        <div className="mt-3 rounded-md bg-mainSoft/40 p-3 text-sm text-main">
                          <p className="font-black">Store reply</p>
                          <p className="mt-1 leading-6">{review.reply}</p>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-5 text-neutral-600">There are no reviews yet.</p>
              )}
            </div>
          ) : null}
        </div>
      </section>

      {relatedProducts.length ? (
        <section className="mt-10 border-t border-neutral-200 pt-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-accent">
                More to explore
              </p>
              <h2 className="mt-2 text-2xl font-black text-neutral-950">
                Related products
              </h2>
            </div>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((item) => (
              <RelatedProductCard key={item._id} product={item} />
            ))}
          </div>
        </section>
      ) : null}

      <LoginPopover
        open={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={() => {
          setIsLoginOpen(false);
          setActiveTab("reviews");
          setShowReviewForm(true);
        }}
        description="Log in to share your experience with this product."
      />
    </>
  );
}
