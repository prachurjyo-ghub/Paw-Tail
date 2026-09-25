"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "@/context/AuthContext";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import {
  buildGuestCartItem,
  calculateGuestCartSummary,
  clearGuestCartItems,
  formatGuestCart,
  getGuestCartLineKey,
  readGuestCartItems,
  writeGuestCartItems,
} from "@/lib/guestStorage";
import { fetchDeliveryZones } from "@/lib/deliveryApi";

const CartContext = createContext(null);

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "Something went wrong");
    error.status = response.status;
    throw error;
  }

  return data;
}

export function CartProvider({ children }) {
  const { user, loaded } = useAuth();
  const [cart, setCart] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const isSyncingGuestCart = useRef(false);

  const loadGuestCart = useCallback(() => {
    const guestCart = formatGuestCart(readGuestCartItems());
    setCart(guestCart);
    return guestCart;
  }, []);

  const persistGuestCart = useCallback((items) => {
    writeGuestCartItems(items);
    const guestCart = formatGuestCart(items);
    setCart(guestCart);
    return guestCart;
  }, []);

  const fetchCart = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/cart/get-cart`, {
        credentials: "include",
      });
      const data = await readResponse(response);
      setCart(data.cart);
      return data.cart;
    } catch (error) {
      if (error.status === 401) {
        return loadGuestCart();
      }

      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [loadGuestCart]);

  const syncGuestCartToServer = useCallback(async () => {
    const guestItems = readGuestCartItems();
    if (!guestItems.length) {
      return null;
    }

    for (const item of guestItems) {
      await fetch(`${getApiBaseUrl()}/cart/add-to-cart`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: item.product._id,
          variantId: item.variant?._id || null,
          quantity: item.quantity,
        }),
      }).then(readResponse);
    }

    clearGuestCartItems();
    return fetchCart();
  }, [fetchCart]);

  const addToCart = useCallback(
    async ({ productId, variantId, quantity, product }) => {
      if (!user) {
        if (!product) {
          throw new Error("Product details are required");
        }

        const variant = (product.variants || []).find(
          (entry) => entry._id === variantId
        );
        const lineKey = getGuestCartLineKey(productId, variantId);
        const currentItems = readGuestCartItems();
        const existingItem = currentItems.find((item) => item._id === lineKey);

        if (existingItem) {
          const nextQuantity = existingItem.quantity + quantity;
          const updatedItems = currentItems.map((item) =>
            item._id === lineKey
              ? buildGuestCartItem(product, variant, nextQuantity)
              : item
          );
          return persistGuestCart(updatedItems);
        }

        return persistGuestCart([
          buildGuestCartItem(product, variant, quantity),
          ...currentItems,
        ]);
      }

      const response = await fetch(`${getApiBaseUrl()}/cart/add-to-cart`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId,
          variantId: variantId || null,
          quantity,
        }),
      });
      const data = await readResponse(response);
      setCart(data.cart);
      return data.cart;
    },
    [persistGuestCart, user]
  );

  const updateCartItem = useCallback(
    async ({ itemId, quantity }) => {
      if (!user) {
        const updatedItems = readGuestCartItems().map((item) => {
          if (item._id !== itemId) {
            return item;
          }

          return {
            ...item,
            quantity,
            itemSubtotal: item.finalUnitPrice * quantity,
          };
        });
        return persistGuestCart(updatedItems);
      }

      const response = await fetch(
        `${getApiBaseUrl()}/cart/update-cart-item/${itemId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ quantity }),
        }
      );
      const data = await readResponse(response);
      setCart(data.cart);
      return data.cart;
    },
    [persistGuestCart, user]
  );

  const removeCartItem = useCallback(
    async (itemId) => {
      if (!user) {
        const updatedItems = readGuestCartItems().filter(
          (item) => item._id !== itemId
        );
        return persistGuestCart(updatedItems);
      }

      const response = await fetch(
        `${getApiBaseUrl()}/cart/remove-cart-item/${itemId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      const data = await readResponse(response);
      setCart(data.cart);
      return data.cart;
    },
    [persistGuestCart, user]
  );

  const clearCart = useCallback(async () => {
    if (!user) {
      clearGuestCartItems();
      return persistGuestCart([]);
    }

    const response = await fetch(`${getApiBaseUrl()}/cart/clear-cart`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await readResponse(response);
    setCart(data.cart);
    return data.cart;
  }, [persistGuestCart, user]);

  const calculateCart = useCallback(
    async ({ promoCode = "", deliveryZone = "inside-dhaka" }) => {
      if (!user) {
        const guestCart = formatGuestCart(readGuestCartItems());
        setCart(guestCart);
        const deliverySettings = await fetchDeliveryZones().catch(() => null);
        return calculateGuestCartSummary({
          subtotal: guestCart.subtotal,
          deliveryZone,
          promoCode,
          deliverySettings,
        });
      }

      const response = await fetch(`${getApiBaseUrl()}/cart/calculate-cart`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          promoCode,
          deliveryZone,
        }),
      });
      const data = await readResponse(response);
      setCart(data.cart);
      return data.summary;
    },
    [user]
  );

  useEffect(() => {
    if (!loaded) return;

    if (!user) {
      queueMicrotask(loadGuestCart);
      return;
    }

    if (isSyncingGuestCart.current) {
      return;
    }

    isSyncingGuestCart.current = true;
    syncGuestCartToServer()
      .catch(() => fetchCart().catch(() => undefined))
      .finally(() => {
        isSyncingGuestCart.current = false;
      });
  }, [fetchCart, loadGuestCart, loaded, syncGuestCartToServer, user]);

  const value = useMemo(
    () => ({
      cart,
      cartItems: cart?.items || [],
      cartCount: cart?.itemCount || 0,
      cartSubtotal: cart?.subtotal || 0,
      isLoading: loaded ? isLoading : true,
      isGuest: !user,
      fetchCart,
      addToCart,
      updateCartItem,
      removeCartItem,
      clearCart,
      calculateCart,
    }),
    [
      addToCart,
      calculateCart,
      cart,
      clearCart,
      fetchCart,
      isLoading,
      loaded,
      removeCartItem,
      updateCartItem,
      user,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
