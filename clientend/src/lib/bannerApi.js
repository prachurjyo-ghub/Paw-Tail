import { API_BASE_URL, API_ORIGIN } from "@/lib/apiBaseUrl";
import { resolveMediaUrl } from "@/lib/media";

const FETCH_TIMEOUT_MS = 8000;

export const getAssetOrigin = () => API_ORIGIN;

export const getBannerImageUrl = (imageUrl) =>
  resolveMediaUrl(imageUrl, { legacyFolder: "banners", width: 1920 });

export const mapBannerToSlide = (banner) => {
  if (!banner?.imageUrl) {
    return null;
  }

  return {
    id: banner._id || banner.id,
    src: getBannerImageUrl(banner.imageUrl),
    alt: banner.altText || banner.name || "Banner",
    href: banner.linkUrl || null,
    slideNumber: Number(banner.slideNumber) || 0,
  };
};

const sortBanners = (banners = []) =>
  [...banners].sort(
    (left, right) =>
      Number(left.slideNumber) - Number(right.slideNumber) ||
      new Date(left.createdAt || 0) - new Date(right.createdAt || 0)
  );

export async function fetchHeroBanners() {
  return sortBanners(await fetchBanners("hero-banner"));
}

export async function fetchSliderBanners() {
  return sortBanners(await fetchBanners("slider-banner"));
}

async function fetchWithTimeout(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    return await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchBanners(type, { targetPage, homepageOnly = false } = {}) {
  try {
    const params = new URLSearchParams();
    if (type) {
      params.set("type", type);
    }
    if (targetPage) {
      params.set("targetPage", targetPage);
    }
    if (homepageOnly) {
      params.set("homepageOnly", "true");
    }

    const query = params.toString();
    const response = await fetchWithTimeout(
      `${API_BASE_URL}/banners/get-banners${query ? `?${query}` : ""}`
    );
    const data = await response.json();

    if (!response.ok || !data.success) {
      return [];
    }

    return data.banners || [];
  } catch {
    return [];
  }
}

export async function getBannersFromApi(type) {
  return fetchBanners(type);
}
