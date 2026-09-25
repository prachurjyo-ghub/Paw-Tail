const { getMediaUrl, isCloudinaryMedia } = require("../models/media");
const { mediaService } = require("../services/mediaService");
const logger = require("./logger");
const { deleteImageFile } = require("./imageFiles");

const getMediaTokens = (media) => {
  if (typeof media === "string") {
    return [media];
  }

  if (isCloudinaryMedia(media)) {
    return [media.publicId, media.secureUrl];
  }

  return [];
};

const parseMediaTokens = (value) => {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) =>
        typeof item === "string" ? [item.trim()] : getMediaTokens(item)
      )
      .filter(Boolean);
  }

  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    try {
      return parseMediaTokens(JSON.parse(trimmed));
    } catch {
      return [];
    }
  }

  return trimmed
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const selectOwnedMedia = (currentMedia, requestedTokens) => {
  const requested = new Set(parseMediaTokens(requestedTokens));
  return (currentMedia || []).filter((media) =>
    getMediaTokens(media).some((token) => requested.has(token))
  );
};

const isSameMedia = (left, right) => {
  const rightTokens = new Set(getMediaTokens(right));
  return getMediaTokens(left).some((token) => rightTokens.has(token));
};

const destroyStoredMedia = async (
  media,
  { legacyFolder, requestId, resource, entityId } = {}
) => {
  if (isCloudinaryMedia(media)) {
    return mediaService.destroyMedia(media, {
      requestId,
      resource,
      entityId,
    });
  }

  if (typeof media === "string" && legacyFolder) {
    deleteImageFile(media, legacyFolder);
  }

  return { result: "not applicable" };
};

const cleanupOldMedia = async (mediaItems, context = {}) => {
  const results = await Promise.allSettled(
    (mediaItems || []).map((media) => destroyStoredMedia(media, context))
  );

  const failed = results.filter((result) => result.status === "rejected");
  if (failed.length) {
    logger.error("media.cleanup_incomplete", {
      requestId: context.requestId,
      resource: context.resource,
      entityId: context.entityId ? String(context.entityId) : undefined,
      failedCount: failed.length,
    });
  }

  return results;
};

module.exports = {
  cleanupOldMedia,
  destroyStoredMedia,
  getMediaTokens,
  getMediaUrl,
  isSameMedia,
  parseMediaTokens,
  selectOwnedMedia,
};
