"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { HiOutlineShoppingBag } from "react-icons/hi2";

import { useCart } from "@/components/CartProvider";
import Container from "@/components/Container";
import LoginPopover from "@/components/LoginPopover";
import { CartPageSkeleton } from "@/components/skeletons/StorefrontSkeletons";
import { useAuth } from "@/context/AuthContext";
import { apiRequest } from "@/lib/api";
import { clearCheckoutPrefs, readCheckoutPrefs } from "@/lib/checkoutStorage";

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
    originalSubtotal: originalUnitPrice * Number(item.quantity || 1),
    savedTotal,
    percentage,
  };
};

const paymentMethods = [
  { value: "COD", label: "Cash on delivery" },
  { value: "BKASH", label: "bKash" },
  { value: "NAGAD", label: "Nagad" },
  { value: "CARD", label: "Card" },
];

const emptyShipping = {
  name: "",
  phone: "",
  city: "",
  area: "",
  address: "",
  postalCode: "",
};

const mapSavedAddressToShipping = (address) => ({
  name: address.name || "",
  phone: address.phone || "",
  city: address.city || "",
  area: address.area || "",
  address: address.line || address.address || "",
  postalCode: address.postal || address.postalCode || "",
});

export default function CheckoutPage() {
  const router = useRouter();
  const { user, loaded } = useAuth();
  const {
    cartItems,
    cartSubtotal,
    isLoading,
    isGuest,
    calculateCart,
    clearCart,
    fetchCart,
  } = useCart();

  const [prefs] = useState(() => readCheckoutPrefs());
  const [summary, setSummary] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [shipping, setShipping] = useState(emptyShipping);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  const savedAddresses = useMemo(() => user?.address || [], [user?.address]);
  const defaultAddress = savedAddresses.find((entry) => entry.isDefault);

  useEffect(() => {
    if (!loaded) return;

    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      if (!user) {
        setProfileLoaded(true);
        setIsLoginOpen(true);
        return;
      }

      setProfileLoaded(false);
      fetchCart()
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) setProfileLoaded(true);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [fetchCart, loaded, user]);

  useEffect(() => {
    if (!user || !cartItems.length) return;

    calculateCart({
      promoCode: prefs.promoCode,
      deliveryZone: prefs.deliveryZone,
    })
      .then(setSummary)
      .catch(() => undefined);
  }, [calculateCart, cartItems.length, prefs.deliveryZone, prefs.promoCode, user]);

  useEffect(() => {
    if (!user || !profileLoaded || selectedAddressId !== null) return;

    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) return;

      if (savedAddresses.length) {
        const initialAddress = defaultAddress || savedAddresses[0];
        setSelectedAddressId(initialAddress.id);
        setShipping(mapSavedAddressToShipping(initialAddress));
        return;
      }

      setSelectedAddressId("");
      setShipping({
        ...emptyShipping,
        name: user.fullName || "",
        phone: user.phone || "",
      });
    });

    return () => {
      cancelled = true;
    };
  }, [
    defaultAddress,
    profileLoaded,
    savedAddresses,
    selectedAddressId,
    user,
  ]);

  const displaySummary = summary || {
    itemsSubtotal: cartSubtotal,
    voucherDiscount: 0,
    discountedSubtotal: cartSubtotal,
    deliveryCharge: 0,
    grandTotal: cartSubtotal,
  };

  const unavailableItems = useMemo(
    () => cartItems.filter((item) => !item.isAvailable),
    [cartItems]
  );

  const handleAddressSelect = (addressId) => {
    setSelectedAddressId(addressId);

    if (!addressId) {
      setShipping((current) => ({
        ...emptyShipping,
        name: user?.fullName || current.name,
        phone: user?.phone || current.phone,
      }));
      return;
    }

    const address = savedAddresses.find((entry) => entry.id === addressId);
    if (address) {
      setShipping(mapSavedAddressToShipping(address));
    }
  };

  const handlePlaceOrder = async (event) => {
    event.preventDefault();
    setError("");

    if (!user) {
      setIsLoginOpen(true);
      return;
    }

    if (!cartItems.length) {
      setError("Your cart is empty.");
      return;
    }

    if (unavailableItems.length) {
      setError("Remove unavailable items before placing your order.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        items: cartItems.map((item) => ({
          productId: item.product._id,
          ...(item.variant?._id ? { variantId: item.variant._id } : {}),
          quantity: item.quantity,
        })),
        paymentMethod,
        shippingAddress: shipping,
        deliveryZone: prefs.deliveryZone,
        ...(prefs.promoCode ? { promoCode: prefs.promoCode } : {}),
      };

      const response = await apiRequest("/orders/create-order", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      await clearCart();
      clearCheckoutPrefs();

      const orderNumber =
        response.data?.order?.orderNumber || response.order?.orderNumber;

      router.push(
        orderNumber
          ? `/profile?tab=orders&order=${encodeURIComponent(orderNumber)}`
          : "/profile?tab=orders"
      );
    } catch (submitError) {
      setError(submitError.message || "Could not place order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!loaded || isLoading || (user && !profileLoaded)) {
    return <CartPageSkeleton checkout />;
  }

  if (user && !isLoading && !cartItems.length) {
    return (
      <main className="bg-white">
        <Container className="py-8 lg:py-12">
          <div className="rounded-lg border border-neutral-200 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-main/10 text-2xl text-main">
              <HiOutlineShoppingBag />
            </div>
            <h1 className="mt-4 text-2xl font-black text-neutral-950">
              Nothing to checkout
            </h1>
            <p className="mt-2 text-neutral-600">
              Add products to your cart first, then return here to place your order.
            </p>
            <Link
              href="/cart"
              className="mt-5 inline-flex h-12 items-center justify-center rounded-full bg-main px-6 text-sm font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-main/90"
            >
              Back to Cart
            </Link>
          </div>
        </Container>
      </main>
    );
  }

  return (
    <main className="bg-white">
      <Container className="py-8 lg:py-12">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-black uppercase tracking-wide text-accent">
            Secure checkout
          </p>
          <h1 className="text-3xl font-black text-neutral-950">Checkout</h1>
        </div>

        {!user ? (
          <div className="mt-8 rounded-lg border border-neutral-200 p-8 text-center">
            <h2 className="text-xl font-black text-neutral-950">
              Sign in to continue
            </h2>
            <p className="mt-2 text-neutral-600">
              You need to login for checkout.
            </p>
            <button
              type="button"
              onClick={() => setIsLoginOpen(true)}
              className="mt-5 inline-flex h-12 items-center justify-center rounded-full bg-main px-6 text-sm font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-main/90"
            >
              Sign In
            </button>
          </div>
        ) : (
          <form
            onSubmit={handlePlaceOrder}
            className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]"
          >
            <section className="space-y-6">
              {savedAddresses.length ? (
                <div className="rounded-lg border border-neutral-200 p-5">
                  <h2 className="text-lg font-black text-neutral-950">
                    Saved address
                  </h2>
                  <select
                    value={selectedAddressId ?? ""}
                    onChange={(event) => handleAddressSelect(event.target.value)}
                    className="mt-3 h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700 outline-none transition-colors duration-300 focus:border-main"
                  >
                    {savedAddresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {address.label} — {address.line}, {address.area}
                      </option>
                    ))}
                    <option value="">Use a different address</option>
                  </select>
                </div>
              ) : null}

              <div className="rounded-lg border border-neutral-200 p-5">
                <h2 className="text-lg font-black text-neutral-950">
                  Delivery details
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <Field label="Full name">
                    <input
                      required
                      value={shipping.name}
                      onChange={(event) =>
                        setShipping((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm font-semibold text-neutral-700 outline-none focus:border-main"
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      required
                      value={shipping.phone}
                      onChange={(event) =>
                        setShipping((current) => ({
                          ...current,
                          phone: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm font-semibold text-neutral-700 outline-none focus:border-main"
                    />
                  </Field>
                  <Field label="City">
                    <input
                      required
                      value={shipping.city}
                      onChange={(event) =>
                        setShipping((current) => ({
                          ...current,
                          city: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm font-semibold text-neutral-700 outline-none focus:border-main"
                    />
                  </Field>
                  <Field label="Area">
                    <input
                      required
                      value={shipping.area}
                      onChange={(event) =>
                        setShipping((current) => ({
                          ...current,
                          area: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm font-semibold text-neutral-700 outline-none focus:border-main"
                    />
                  </Field>
                  <Field label="Postal code" className="sm:col-span-2">
                    <input
                      value={shipping.postalCode}
                      onChange={(event) =>
                        setShipping((current) => ({
                          ...current,
                          postalCode: event.target.value,
                        }))
                      }
                      className="h-11 w-full rounded-lg border border-neutral-200 px-3 text-sm font-semibold text-neutral-700 outline-none focus:border-main"
                    />
                  </Field>
                  <Field label="Street address" className="sm:col-span-2">
                    <textarea
                      required
                      rows={3}
                      value={shipping.address}
                      onChange={(event) =>
                        setShipping((current) => ({
                          ...current,
                          address: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold text-neutral-700 outline-none focus:border-main"
                    />
                  </Field>
                </div>
              </div>

              <div className="rounded-lg border border-neutral-200 p-5">
                <h2 className="text-lg font-black text-neutral-950">
                  Payment method
                </h2>
                <div className="mt-4 space-y-2">
                  {paymentMethods.map((method) => (
                    <label
                      key={method.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold transition-colors ${
                        paymentMethod === method.value
                          ? "border-main bg-mainSoft/40 text-main"
                          : "border-neutral-200 text-neutral-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.value}
                        checked={paymentMethod === method.value}
                        onChange={() => setPaymentMethod(method.value)}
                      />
                      {method.label}
                    </label>
                  ))}
                </div>
              </div>
            </section>

            <aside className="h-fit rounded-lg border border-neutral-200 p-5">
              <h2 className="text-xl font-black text-neutral-950">Order summary</h2>

              <div className="mt-4 space-y-3 text-sm">
                {cartItems.map((item) => {
                  const discount = getItemDiscount(item);

                  return (
                    <div
                      key={item._id}
                      className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-3"
                    >
                      <div>
                        <p className="font-bold text-neutral-950">{item.product.name}</p>
                        {item.variant ? (
                          <p className="text-xs text-neutral-500">
                            {item.variant.value || item.variant.name}
                          </p>
                        ) : null}
                        <p className="text-xs text-neutral-500">Qty {item.quantity}</p>
                        {discount ? (
                          <p className="mt-1 text-xs font-black text-emerald-700">
                            Save {formatPrice(discount.savedTotal)} ({discount.percentage}%)
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <span className="block font-black text-neutral-950">
                          {formatPrice(item.itemSubtotal)}
                        </span>
                        {discount ? (
                          <span className="mt-1 block text-xs font-bold text-neutral-400 line-through">
                            {formatPrice(discount.originalSubtotal)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 space-y-3 border-t border-neutral-200 pt-5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">Subtotal</span>
                  <span className="font-black text-neutral-950">
                    {formatPrice(displaySummary.itemsSubtotal)}
                  </span>
                </div>
                {displaySummary.voucherDiscount > 0 ? (
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Voucher</span>
                    <span className="font-black text-emerald-700">
                      -{formatPrice(displaySummary.voucherDiscount)}
                    </span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <span className="text-neutral-600">
                    Delivery
                    {prefs.deliveryZone === "outside-dhaka"
                      ? " (Outside Dhaka)"
                      : " (Inside Dhaka)"}
                  </span>
                  <span className="font-black text-neutral-950">
                    {formatPrice(displaySummary.deliveryCharge)}
                  </span>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between text-lg">
                <span className="font-black text-neutral-950">Total</span>
                <span className="font-black text-main">
                  {formatPrice(displaySummary.grandTotal)}
                </span>
              </div>

              {unavailableItems.length ? (
                <p className="mt-4 text-sm font-bold text-red-600">
                  Some items in your cart are unavailable. Update your cart before checkout.
                </p>
              ) : null}

              {error ? (
                <p className="mt-4 text-sm font-bold text-red-600">{error}</p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting || isGuest || unavailableItems.length > 0}
                className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-main px-6 text-sm font-black text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-main/90 disabled:cursor-not-allowed disabled:bg-neutral-300"
              >
                {isSubmitting ? "Placing order..." : "Place order"}
              </button>

              <Link
                href="/cart"
                className="mt-3 flex h-11 w-full items-center justify-center rounded-full border border-neutral-200 px-6 text-sm font-black text-main transition-colors duration-300 hover:border-main hover:bg-main hover:text-white"
              >
                Back to cart
              </Link>
            </aside>
          </form>
        )}
      </Container>

      <LoginPopover
        open={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSuccess={() => {
          setIsLoginOpen(false);
          router.refresh();
        }}
        description="You need to login for checkout. Sign in to continue with your order."
      />
    </main>
  );
}

function Field({ label, children, className = "" }) {
  return (
    <label className={className}>
      <span className="text-sm font-black text-neutral-950">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
