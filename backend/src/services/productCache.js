const env = require("../config/env");
const { getRedisClient } = require("../config/redis");
const logger = require("../utils/logger");

const NOT_FOUND = "__PAWTAIL_NOT_FOUND__";
const inFlight = new Map();
const keyFor = (slug, scope = "public") => `pawtail:product:v1:${scope}:${slug}`;

const safely = async (operation, fallback) => {
  try {
    const redis = getRedisClient();
    if (!redis?.isReady) return fallback;
    return await operation(redis);
  } catch (error) {
    logger.warn("product_cache.unavailable", { message: error.message });
    return fallback;
  }
};

const readProductCache = (slug, scope) =>
  safely(async (redis) => {
    const value = await redis.get(keyFor(slug, scope));
    if (value === NOT_FOUND) return NOT_FOUND;
    return value ? JSON.parse(value) : null;
  }, null);

const writeProductCache = (slug, scope, value) =>
  safely(
    (redis) => redis.set(keyFor(slug, scope), JSON.stringify(value), { EX: env.productCacheTtlSeconds }),
    null
  );

const writeNotFound = (slug) =>
  safely(
    (redis) => redis.set(keyFor(slug, "public"), NOT_FOUND, { EX: env.productNotFoundTtlSeconds }),
    null
  );

const invalidateProduct = (...slugs) =>
  safely((redis) => {
    const keys = slugs.filter(Boolean).flatMap((slug) => [keyFor(slug, "public"), keyFor(slug, "admin")]);
    return keys.length ? redis.del(keys) : 0;
  }, null);

const coalesce = (key, loader) => {
  if (inFlight.has(key)) return inFlight.get(key);
  const promise = Promise.resolve().then(loader).finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
};

module.exports = { NOT_FOUND, coalesce, invalidateProduct, readProductCache, writeNotFound, writeProductCache };
