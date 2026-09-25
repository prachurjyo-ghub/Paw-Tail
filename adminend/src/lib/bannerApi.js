import { API_BASE_URL, adminApi } from "@/lib/adminApi";
import { getApiBaseUrl } from "@/lib/apiBaseUrl";
import { resolveMediaUrl } from "@/lib/media";

const REQUEST_TIMEOUT_MS = 12000;

export const bannerTypeOptions = [
  ["hero-banner", "Hero banner"],
  ["promo-banner", "Promo banner"],
  ["slider-banner", "Slider banner"],
];

export const bannerTypeLabels = {
  "hero-banner": "Hero banners",
  "promo-banner": "Promo banners",
  "slider-banner": "Slider banners",
};

export const getAssetOrigin = () =>
  getApiBaseUrl().replace(/\/api\/v1\/?$/, "");

export const getBannerImageUrl = (imageUrl) =>
  resolveMediaUrl(imageUrl, { legacyFolder: "banners", width: 1920 });

const fetchWithTimeout = async (url, options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
};

export async function adminApiForm(path, formData, options = {}) {
  const response = await fetchWithTimeout(`${API_BASE_URL}${path}`, {
    credentials: "include",
    method: options.method || "POST",
    body: formData,
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export async function getBannersFromApi({ includeInactive = true } = {}) {
  const query = includeInactive ? "?includeInactive=true" : "";
  const data = await adminApi(`/banners/get-banners${query}`);
  return data.banners || [];
}

export async function createBannerOnApi(formData) {
  const data = await adminApiForm("/banners/post-banners", formData, {
    method: "POST",
  });
  return data.banner;
}

export async function updateBannerOnApi(bannerId, formData) {
  const data = await adminApiForm(`/banners/update-banners/${bannerId}`, formData, {
    method: "PATCH",
  });
  return data.banner;
}

export async function deleteBannerOnApi(bannerId) {
  return adminApi(`/banners/delete-banners/${bannerId}`, {
    method: "DELETE",
  });
}

export async function toggleBannerActiveOnApi(bannerId, isActive) {
  const data = await adminApi(`/banners/active-on-off-banners/${bannerId}`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });
  return data.banner;
}

export function buildBannerFormData({
  name,
  bannerType,
  slideNumber,
  isActive = true,
  linkUrl = "",
  altText = "",
  targetPages = [],
  showCatalogHeader = true,
  imageFile = null,
}) {
  const formData = new FormData();
  formData.append("name", name.trim());
  formData.append("bannerType", bannerType);
  formData.append("slideNumber", String(slideNumber || 1));
  formData.append("isActive", String(Boolean(isActive)));
  formData.append("linkUrl", linkUrl.trim());
  formData.append("altText", altText.trim());
  formData.append("targetPages", JSON.stringify(targetPages));
  formData.append("showCatalogHeader", String(Boolean(showCatalogHeader)));

  if (imageFile) {
    formData.append("image", imageFile);
  }

  return formData;
}
