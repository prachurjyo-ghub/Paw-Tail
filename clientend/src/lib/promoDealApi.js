import { apiRequest } from "@/lib/api";

export async function fetchPromoDeals() {
  const data = await apiRequest("/promo-deals/get-promo-deals");
  return data.promoDeal;
}

export async function checkCheckoutPromoCode(name) {
  const data = await apiRequest("/promo-codes/check-promo-code", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return data;
}
