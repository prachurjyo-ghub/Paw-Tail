const trimTrailingSlash = (value = "") => value.replace(/\/+$/, "");
const DEVELOPMENT_API_URL = "http://localhost:3000/api/v1";

const resolveApiBaseUrl = () => {
  const envBaseUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (!envBaseUrl) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "NEXT_PUBLIC_API_URL is required for production storefront builds"
      );
    }

    return DEVELOPMENT_API_URL;
  }

  let parsed;
  try {
    parsed = new URL(envBaseUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_API_URL must be a valid absolute URL");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("NEXT_PUBLIC_API_URL must use http or https");
  }

  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_API_URL must use https in production");
  }

  if (parsed.search || parsed.hash) {
    throw new Error("NEXT_PUBLIC_API_URL must not contain a query or hash");
  }

  const normalizedUrl = trimTrailingSlash(parsed.toString());
  if (!normalizedUrl.endsWith("/api/v1")) {
    throw new Error("NEXT_PUBLIC_API_URL must end with /api/v1");
  }

  return normalizedUrl;
};

export const API_BASE_URL = resolveApiBaseUrl();
export const API_ORIGIN = new URL(API_BASE_URL).origin;
export const getApiBaseUrl = () => API_BASE_URL;
