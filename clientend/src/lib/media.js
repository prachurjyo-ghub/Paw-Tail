import { API_ORIGIN } from "@/lib/apiBaseUrl";

export const getRawMediaUrl = (media) => {
  if (typeof media === "string") return media.trim();
  if (media && typeof media === "object") {
    return typeof media.secureUrl === "string" ? media.secureUrl.trim() : "";
  }
  return "";
};

export const getMediaRetentionToken = (media) => {
  if (typeof media === "string") return media;
  if (media && typeof media.publicId === "string") return media.publicId;
  return "";
};

export const getCloudinaryDeliveryUrl = (
  url,
  { width, crop = "limit" } = {}
) => {
  if (
    typeof url !== "string" ||
    !url.startsWith("https://res.cloudinary.com/") ||
    !url.includes("/upload/")
  ) {
    return url;
  }

  const transformations = ["f_auto", "q_auto"];
  if (width) {
    transformations.push(`c_${crop}`, `w_${Math.max(1, Math.round(width))}`);
  }

  return url.replace(
    "/upload/",
    `/upload/${transformations.join(",")}/`
  );
};

export const resolveMediaUrl = (
  media,
  { legacyFolder = "", width, crop } = {}
) => {
  let url = getRawMediaUrl(media);
  if (!url) return "";

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    if (!url.startsWith("/")) {
      const folder = legacyFolder ? `${legacyFolder}/` : "";
      url = `/uploads/${folder}${url}`;
    }
    url = `${API_ORIGIN}${url}`;
  }

  return getCloudinaryDeliveryUrl(url, { width, crop });
};
