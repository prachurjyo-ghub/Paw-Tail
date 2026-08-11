const CHECKOUT_PREFS_KEY = "pawtail-checkout-prefs";
const DEFAULT_CHECKOUT_PREFS = {
  promoCode: "",
  deliveryZone: "inside-dhaka",
};
const DELIVERY_ZONES = new Set(["inside-dhaka", "outside-dhaka"]);

const normalizeCheckoutPrefs = (value) => ({
  promoCode: typeof value?.promoCode === "string" ? value.promoCode.trim() : "",
  deliveryZone: DELIVERY_ZONES.has(value?.deliveryZone)
    ? value.deliveryZone
    : DEFAULT_CHECKOUT_PREFS.deliveryZone,
});

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
    JSON.stringify(normalizeCheckoutPrefs({ promoCode, deliveryZone }))
  );
};

export const readCheckoutPrefs = () => {
  try {
    const storage = getSessionStorage();
    if (!storage) return { ...DEFAULT_CHECKOUT_PREFS };
    const stored = JSON.parse(storage.getItem(CHECKOUT_PREFS_KEY) || "{}");
    return normalizeCheckoutPrefs(stored);
  } catch {
    return { ...DEFAULT_CHECKOUT_PREFS };
  }
};

export const clearCheckoutPrefs = () => {
  getSessionStorage()?.removeItem(CHECKOUT_PREFS_KEY);
};
