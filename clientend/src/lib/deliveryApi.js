import { getApiBaseUrl } from "@/lib/apiBaseUrl";

let cachedDeliveryZones = null;

export async function fetchDeliveryZones({ force = false } = {}) {
  if (cachedDeliveryZones && !force) {
    return cachedDeliveryZones;
  }

  const response = await fetch(`${getApiBaseUrl()}/delivery/get-zones`);
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.success === false) {
    throw new Error(data.message || "Could not load delivery zones");
  }

  if (!data.zones || typeof data.zones !== "object" || Array.isArray(data.zones)) {
    throw new Error("Delivery zones response is invalid");
  }

  cachedDeliveryZones = data.zones;
  return cachedDeliveryZones;
}

export function clearDeliveryZonesCache() {
  cachedDeliveryZones = null;
}
