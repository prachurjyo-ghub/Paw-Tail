"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  HiMinus,
  HiOutlineShoppingBag,
  HiPlus,
  HiTrash,
} from "react-icons/hi2";

import { useCart } from "@/components/CartProvider";
import Container from "@/components/Container";
import LoginPopover from "@/components/LoginPopover";
import { CartPageSkeleton } from "@/components/skeletons/StorefrontSkeletons";
import { useAuth } from "@/context/AuthContext";
import { saveCheckoutPrefs } from "@/lib/checkoutStorage";
import { resolveMediaUrl } from "@/lib/media";

const formatPrice = (value) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const getItemDiscount = (item) => {
  if (item.variant) return null;

  const regularPrice = Number(item.product?.price);
  const discountPrice = Number(item.product?.discountPrice);

  if (
    !Number.isFinite(regularPrice) ||
    !Number.isFinite(discountPrice) ||
    discountPrice >= regularPrice
  ) {
    return null;
  }

  const priceAdjustment = Number(item.variant?.priceAdjustment || 0);
  const originalUnitPrice = regularPrice + priceAdjustment;
  const savedPerItem = regularPrice - discountPrice;
  const savedTotal = savedPerItem * Number(item.quantity || 1);
  const percentage = Math.round((savedPerItem / regularPrice) * 100);

  return {
    originalUnitPrice,
    savedTotal,
    percentage,
  };
};

const getImageUrl = (src) =>
  resolveMediaUrl(src, { legacyFolder: "products", width: 320 }) ||
  "/window.svg";

export default function CartPage() {
  const router = useRouter();
  const { user, loaded } = useAuth();
  const {
    cartItems,
    cartSubtotal,
    isLoading,
    updateCartItem,
    removeCartItem,
    clearCart,
    calculateCart,
  } = useCart();
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromoCode, setAppliedPromoCode] = useState("");
  const [deliveryZone, setDeliveryZone] = useState("inside-dhaka");
  const [summary, setSummary] = useState(null);
  const [summaryMessage, setSummaryMessage] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const hasShownCheckoutPrompt = useRef(false);

  useEffect(() => {
    if (!loaded || user || !cartItems.length || hasShownCheckoutPrompt.current) {
      return;
    }

    hasShownCheckoutPrompt.current = true;
    setIsLoginOpen(true);
  }, [cartItems.length, loaded, user]);

  useEffect(() => {
    let cancelled = false;

    if (!cartItems.length) {
      queueMicrotask(() => {
        if (!cancelled) setSummary(null);
      });
      return () => {
        cancelled = true;
      };
    }

    queueMicrotask(() => {
      if (cancelled) return;

      setIsCalculating(true);
      calculateCart({
        promoCode: appliedPromoCode,
        deliveryZone,
      })
        .then((nextSummary) => {
          if (cancelled) return;
          setSummary(nextSummary);
          setSummaryMessage(nextSummary?.voucherMessage || "");
        })
        .catch((error) => {
          if (!cancelled) {
            setSummaryMessage(error.message || "Could not calculate cart");
          }
        })
        .finally(() => {
          if (!cancelled) setIsCalculating(false);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [appliedPromoCode, calculateCart, cartItems.length, cartSubtotal, deliveryZone]);

  const handleApplyVoucher = () => {
    setAppliedPromoCode(promoCode.trim());
  };

  const handleRemoveVoucher = () => {
    setPromoCode("");
    setAppliedPromoCode("");
    setSummaryMessage("");
  };

  const displaySummary = summary || {
    itemsSubtotal: cartSubtotal,
    voucherDiscount: 0,
    discountedSubtotal: cartSubtotal,
    deliveryZone,
    deliveryCharge: 0,
    freeDeliveryThreshold: 500,
    grandTotal: cartSubtotal,
  };

  const handleCheckout = () => {
    if (!user) {
      setIsLoginOpen(true);
      return;
    }

    saveCheckoutPrefs({
      promoCode: appliedPromoCode,
      deliveryZone,
    });
    router.push("/checkout");
  };

  if (!loaded || isLoading) {
    return <CartPageSkeleton />;
  }

  return (
    <main className="bg-white">
      <Container className="py-8 lg:py-12">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-black uppercase tracking-wide text-accent">
            Shopping cart
          </p>
          <h1 className="text-3xl font-black text-neutral-950">Your Cart</h1>
        </div>

        {loaded && !isLoading && cartItems.length === 0 ? (
          <div className="mt-8 rounded-lg border border-neutral-200 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-main/10 text-2xl text-main">
              <HiOutlineShoppingBag />
            </div>
            <h2 className="mt-4 text-xl font-black text-neutral-950">
              Your cart is empty
            </h2>
            <p className="mt-2 text-neutral-600">
              Add products to your cart and they will show up here.
            </p>
            <Link
              href="/"
              className="mt-5 inline-flex h-12 items-center justify-center rounded-full bg-main px-6 text-sm font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-main/90"
            >
              Continue Shopping
            </Link>
          </div>
        ) : null}

        {loaded && !isLoading && cartItems.length > 0 ? (
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="space-y-4">
              {cartItems.map((item) => {
                const discount = getItemDiscount(item);

                return (
                  <article
                    key={item._id}
                    className="grid gap-4 rounded-lg border border-neutral-200 p-4 sm:grid-cols-[120px_1fr] lg:grid-cols-[120px_1fr_auto]"
                  >
                  <Link
                    href={`/product/${item.product.slug}`}
                    className="relative aspect-square overflow-hidden rounded-md bg-neutral-50"
                  >
                    <Image
                      src={getImageUrl(item.product.image)}
                      alt={item.product.name}
                      fill
                      sizes="120px"
                      className="object-contain p-3"
                    />
                  </Link>

                  <div>
                    <Link
                      href={`/product/${item.product.slug}`}
                      className="text-lg font-black text-neutral-950 transition-colors duration-300 hover:text-main"
                    >
                      {item.product.name}
                    </Link>
                    {item.variant ? (
                      <p className="mt-1 text-sm text-neutral-500">
                        {item.variant.value || item.variant.name || item.variant.sku}
                      </p>
                    ) : null}
                    <p
                      className={`mt-3 text-sm font-bold ${
                        item.isAvailable ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {item.isAvailable ? `${item.stockQuantity} in stock` : "Unavailable"}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <p className="text-base font-black text-main">
                        {formatPrice(item.finalUnitPrice)}
                      </p>
                      {discount ? (
                        <>
                          <p className="text-sm font-bold text-neutral-400 line-through">
                            {formatPrice(discount.originalUnitPrice)}
                          </p>
                          <p className="text-sm font-black text-emerald-700">
                            Save {formatPrice(discount.savedTotal)} ({discount.percentage}%)
                          </p>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 lg:flex-col lg:items-end lg:justify-between">
                    <div className="inline-flex h-11 items-center overflow-hidden rounded-full border border-neutral-200 bg-white">
                      <button
                        type="button"
                        disabled={item.quantity <= 1}
                        onClick={() =>
                          updateCartItem({
                            itemId: item._id,
                            quantity: item.quantity - 1,
                          }).catch(() => undefined)
                        }
                        className="flex h-11 w-11 items-center justify-center text-main transition-colors duration-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-neutral-300"
                        aria-label="Decrease quantity"
                      >
                        <HiMinus />
                      </button>
                      <span className="flex h-11 min-w-11 items-center justify-center border-x border-neutral-200 px-4 text-sm font-black text-neutral-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={item.quantity >= item.stockQuantity}
                        onClick={() =>
                          updateCartItem({
                            itemId: item._id,
                            quantity: item.quantity + 1,
                          }).catch(() => undefined)
                        }
                        className="flex h-11 w-11 items-center justify-center text-main transition-colors duration-300 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:text-neutral-300"
                        aria-label="Increase quantity"
                      >
                        <HiPlus />
                      </button>
                    </div>

                    <div className="text-left lg:text-right">
                      <p className="font-black text-neutral-950">
                        {formatPrice(item.itemSubtotal)}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeCartItem(item._id).catch(() => undefined)}
                        className="mt-2 inline-flex items-center gap-1 text-sm font-bold text-red-600 transition-colors duration-300 hover:text-red-700"
                      >
                        <HiTrash />
                        Remove
                      </button>
                    </div>
                  </div>
                  </article>
                );
              })}
            </section>

            <aside className="h-fit rounded-lg border border-neutral-200 p-5">
              <h2 className="text-xl font-black text-neutral-950">Summary</h2>

              <div className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="deliveryZone"
                    className="text-sm font-black text-neutral-950"
                  >
                    Delivery area
                  </label>
                  <select
                    id="deliveryZone"
                    value={deliveryZone}
                    onChange={(event) => setDeliveryZone(event.target.value)}
                    className="mt-2 h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700 outline-none transition-colors duration-300 focus:border-main"
                  >
                    <option value="inside-dhaka">Inside Dhaka</option>
                    <option value="outside-dhaka">Outside Dhaka</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="promoCode"
                    className="text-sm font-black text-neutral-950"
                  >
                    Voucher
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="promoCode"
                      type="text"
                      value={promoCode}
                      onChange={(event) => setPromoCode(event.target.value)}
                      placeholder="Enter voucher code"
                      className="h-11 min-w-0 flex-1 rounded-lg border border-neutral-200 px-3 text-sm font-semibold uppercase text-neutral-700 outline-none transition-colors duration-300 placeholder:normal-case placeholder:text-neutral-400 focus:border-main"
                    />
                    <button
                      type="button"
                      onClick={handleApplyVoucher}
                      disabled={!promoCode.trim() || isCalculating}
                      className="h-11 rounded-lg bg-main px-4 text-sm font-black text-white transition-colors duration-300 hover:bg-main/90 disabled:cursor-not-allowed disabled:bg-neutral-300"
                    >
                      Apply
                    </button>
                  </div>
                  {appliedPromoCode ? (
                    <button
                      type="button"
                      onClick={handleRemoveVoucher}
                      className="mt-2 text-sm font-bold text-red-600 transition-colors duration-300 hover:text-red-700"
                    >
                      Remove voucher
                    </button>
                  ) : null}
                  {summaryMessage ? (
                    <p
                      className={`mt-2 text-sm font-bold ${
                        displaySummary.voucherDiscount > 0
                          ? "text-emerald-700"
                          : "text-red-600"
                      }`}
                    >
                      {summaryMessage}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="mt-5 space-y-3 border-b border-neutral-200 pb-5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Subtotal</span>
                  <span className="font-black text-neutral-950">
                    {formatPrice(displaySummary.itemsSubtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Voucher discount</span>
                  <span className="font-black text-emerald-700">
                    -{formatPrice(displaySummary.voucherDiscount)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">After discount</span>
                  <span className="font-black text-neutral-950">
                    {formatPrice(displaySummary.discountedSubtotal)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Delivery</span>
                  <span className="font-black text-neutral-950">
                    {formatPrice(displaySummary.deliveryCharge)}
                  </span>
                </div>
                <p className="text-xs font-semibold text-neutral-500">
                  Free delivery over {formatPrice(displaySummary.freeDeliveryThreshold)}
                </p>
              </div>
              <div className="mt-5 flex items-center justify-between text-lg">
                <span className="font-black text-neutral-950">Total</span>
                <span className="font-black text-main">
                  {formatPrice(displaySummary.grandTotal)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleCheckout}
                className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-main px-6 text-sm font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-main/90"
              >
                Proceed to Checkout
              </button>
              <button
                type="button"
                onClick={() => clearCart().catch(() => undefined)}
                className="mt-3 flex h-11 w-full items-center justify-center rounded-full border border-neutral-200 px-6 text-sm font-black text-main transition-colors duration-300 hover:border-main hover:bg-main hover:text-white"
              >
                Clear Cart
              </button>
            </aside>
          </div>
        ) : null}
      </Container>

      <LoginPopover
        open={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={() => {
          setIsLoginOpen(false);
          saveCheckoutPrefs({
            promoCode: appliedPromoCode,
            deliveryZone,
          });
          router.push("/checkout");
        }}
        description="You need to login for checkout. Sign in to continue with your order."
      />
    </main>
  );
}
