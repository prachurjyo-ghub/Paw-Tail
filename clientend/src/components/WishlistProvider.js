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
  clearGuestWishlistItems,
  normalizeWishlistProduct,
  readGuestWishlistItems,
  writeGuestWishlistItems,
} from "@/lib/guestStorage";

const WishlistContext = createContext(null);

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || "Something went wrong");
    error.status = response.status;
    throw error;
  }

  return data;
}

export function WishlistProvider({ children }) {
  const { user, loaded } = useAuth();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const isSyncingGuestWishlist = useRef(false);

  const loadGuestWishlist = useCallback(() => {
    const guestItems = readGuestWishlistItems();
    setItems(guestItems);
    return guestItems;
  }, []);

  const persistGuestWishlist = useCallback((nextItems) => {
    writeGuestWishlistItems(nextItems);
    setItems(nextItems);
    return nextItems;
  }, []);

  const fetchWishlist = useCallback(async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`${getApiBaseUrl()}/wishlist/get-wishlist`, {
        credentials: "include",
      });
      const data = await readResponse(response);
      const nextItems = data.wishlist?.items || [];
      setItems(nextItems);
      return nextItems;
    } catch (error) {
      if (error.status === 401) {
        return loadGuestWishlist();
      }

      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [loadGuestWishlist]);

  const syncGuestWishlistToServer = useCallback(async () => {
    const guestItems = readGuestWishlistItems();
    if (!guestItems.length) {
      return fetchWishlist();
    }

    for (const item of guestItems) {
      await fetch(`${getApiBaseUrl()}/wishlist/add-to-wishlist`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId: item._id }),
      }).then(readResponse);
    }

    clearGuestWishlistItems();
    return fetchWishlist();
  }, [fetchWishlist]);

  const addToWishlist = useCallback(
    async (product) => {
      const normalizedProduct = normalizeWishlistProduct(product);

      if (!user) {
        const currentItems = readGuestWishlistItems();
        if (currentItems.some((item) => item._id === normalizedProduct._id)) {
          return currentItems;
        }

        return persistGuestWishlist([normalizedProduct, ...currentItems]);
      }

      const response = await fetch(`${getApiBaseUrl()}/wishlist/add-to-wishlist`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId: product._id }),
      });
      const data = await readResponse(response);
      const nextItems = data.wishlist?.items || [];
      setItems(nextItems);
      return nextItems;
    },
    [persistGuestWishlist, user]
  );

  const removeFromWishlist = useCallback(
    async (productId) => {
      if (!user) {
        const nextItems = readGuestWishlistItems().filter(
          (item) => item._id !== productId
        );
        return persistGuestWishlist(nextItems);
      }

      const response = await fetch(
        `${getApiBaseUrl()}/wishlist/remove-wishlist-item/${productId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      const data = await readResponse(response);
      const nextItems = data.wishlist?.items || [];
      setItems(nextItems);
      return nextItems;
    },
    [persistGuestWishlist, user]
  );

  const clearWishlist = useCallback(async () => {
    if (!user) {
      clearGuestWishlistItems();
      return persistGuestWishlist([]);
    }

    const response = await fetch(`${getApiBaseUrl()}/wishlist/clear-wishlist`, {
      method: "DELETE",
      credentials: "include",
    });
    const data = await readResponse(response);
    const nextItems = data.wishlist?.items || [];
    setItems(nextItems);
    return nextItems;
  }, [persistGuestWishlist, user]);

  const isWishlisted = useCallback(
    (productId) => items.some((item) => item._id === productId),
    [items]
  );

  const toggleWishlist = useCallback(
    async (product) => {
      if (isWishlisted(product._id)) {
        await removeFromWishlist(product._id);
        return false;
      }

      await addToWishlist(product);
      return true;
    },
    [addToWishlist, isWishlisted, removeFromWishlist]
  );

  useEffect(() => {
    if (!loaded) return;

    if (!user) {
      queueMicrotask(loadGuestWishlist);
      return;
    }

    if (isSyncingGuestWishlist.current) {
      return;
    }

    isSyncingGuestWishlist.current = true;
    syncGuestWishlistToServer()
      .catch(() => fetchWishlist().catch(() => undefined))
      .finally(() => {
        isSyncingGuestWishlist.current = false;
      });
  }, [fetchWishlist, loadGuestWishlist, loaded, syncGuestWishlistToServer, user]);

  const value = useMemo(
    () => ({
      wishlistItems: items,
      wishlistCount: items.length,
      isLoading: loaded ? isLoading : true,
      isReady: loaded && !isLoading,
      isGuest: !user,
      isWishlisted,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      clearWishlist,
      fetchWishlist,
    }),
    [
      addToWishlist,
      clearWishlist,
      fetchWishlist,
      isLoading,
      isWishlisted,
      items,
      loaded,
      removeFromWishlist,
      toggleWishlist,
      user,
    ]
  );

  return (
    <WishlistContext.Provider value={value}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);

  if (!context) {
    throw new Error("useWishlist must be used inside WishlistProvider");
  }

  return context;
}
