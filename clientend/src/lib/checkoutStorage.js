const CHECKOUT_PREFS_KEY = "pawtail-checkout-prefs";

const getSessionStorage = () => {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
};

export const saveCheckoutPrefs = ({ promoCode = "", deliveryZone = "inside-dhaka" } = {}) => {
  const storage = getSessionStorage();
  if (!storage) return;
  storage.setItem(
    CHECKOUT_PREFS_KEY,
    JSON.stringify({ promoCode, deliveryZone })
  );
};

export const readCheckoutPrefs = () => {
  try {
    const storage = getSessionStorage();
    if (!storage) return { promoCode: "", deliveryZone: "inside-dhaka" };
    const stored = JSON.parse(storage.getItem(CHECKOUT_PREFS_KEY) || "{}");
    return {
      promoCode: stored.promoCode || "",
      deliveryZone: stored.deliveryZone || "inside-dhaka",
    };
  } catch {
    return { promoCode: "", deliveryZone: "inside-dhaka" };
  }
};

export const clearCheckoutPrefs = () => {
  getSessionStorage()?.removeItem(CHECKOUT_PREFS_KEY);
};
