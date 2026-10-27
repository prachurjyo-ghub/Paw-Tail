const { createHash } = require("crypto");

const { getRedisClient } = require("../config/redis");
const env = require("../config/env");
const logger = require("../utils/logger");

const localCounters = new Map();

const digest = (value) =>
  createHash("sha256").update(String(value || "unknown")).digest("hex");

const normalizedAccount = (req) => {
  const value = req.body?.email || req.body?.phone || req.body?.code || "anonymous";
  return String(value).trim().toLowerCase().slice(0, 320);
};

const identities = {
  ip: (req) => `ip:${digest(req.ip)}`,
  account: (req) => `ip:${digest(req.ip)}:account:${digest(normalizedAccount(req))}`,
  user: (req) =>
    req.user?._id ? `user:${req.user._id}` : `ip:${digest(req.ip)}`,
};

const consumeLocally = (key, windowSeconds) => {
  const now = Date.now();
  const existing = localCounters.get(key);
  if (!existing || existing.resetAt <= now) {
    const value = { count: 1, resetAt: now + windowSeconds * 1000 };
    localCounters.set(key, value);
    return value;
  }
  existing.count += 1;
  return existing;
};

const consumeRedis = async (redis, key, windowSeconds) => {
  const result = await redis.eval(
    "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; local ttl=redis.call('TTL',KEYS[1]); return {n,ttl}",
    { keys: [key], arguments: [String(windowSeconds)] }
  );
  return { count: Number(result[0]), retryAfter: Math.max(1, Number(result[1])) };
};

const createRateLimit = ({
  name,
  max,
  windowSeconds,
  identity = "ip",
  failClosed = false,
}) => {
  if (!name || !Number.isInteger(max) || !Number.isInteger(windowSeconds)) {
    throw new Error("Invalid rate-limit policy");
  }

  return async (req, res, next) => {
    const key = `pawtail:rl:${name}:${identities[identity](req)}`;
    let result;

    try {
      const redis = getRedisClient();
      if (!redis?.isReady) throw new Error("Redis is unavailable");
      result = await consumeRedis(redis, key, windowSeconds);
    } catch (error) {
      logger.warn("rate_limit.redis_unavailable", {
        policy: name,
        requestId: req.id,
        message: error.message,
      });
      if (failClosed && env.isProduction) {
        res.set("Retry-After", "5");
        return res.status(503).json({
          success: false,
          message: "This operation is temporarily unavailable. Please try again.",
        });
      }
      const local = consumeLocally(key, windowSeconds);
      result = {
        count: local.count,
        retryAfter: Math.max(1, Math.ceil((local.resetAt - Date.now()) / 1000)),
      };
    }

    const remaining = Math.max(0, max - result.count);
    res.set("RateLimit-Limit", String(max));
    res.set("RateLimit-Remaining", String(remaining));
    res.set("RateLimit-Reset", String(result.retryAfter));

    if (result.count > max) {
      res.set("Retry-After", String(result.retryAfter));
      return res.status(429).json({
        success: false,
        message: "Too many requests. Please try again later.",
        retryAfter: result.retryAfter,
      });
    }

    return next();
  };
};

const policies = {
  auth: createRateLimit({ name: "auth", max: 10, windowSeconds: 15 * 60, identity: "account", failClosed: true }),
  registration: createRateLimit({ name: "registration", max: 5, windowSeconds: 60 * 60, identity: "account", failClosed: true }),
  recovery: createRateLimit({ name: "recovery", max: 5, windowSeconds: 30 * 60, identity: "account", failClosed: true }),
  verification: createRateLimit({ name: "verification", max: 8, windowSeconds: 15 * 60, identity: "account", failClosed: true }),
  refresh: createRateLimit({ name: "refresh", max: 60, windowSeconds: 15 * 60, identity: "ip", failClosed: true }),
  browsing: createRateLimit({ name: "browsing", max: 240, windowSeconds: 60, identity: "ip" }),
  search: createRateLimit({ name: "search", max: 60, windowSeconds: 60, identity: "ip" }),
  mutation: createRateLimit({ name: "mutation", max: 120, windowSeconds: 60, identity: "user" }),
  checkout: createRateLimit({ name: "checkout", max: 10, windowSeconds: 10 * 60, identity: "user", failClosed: true }),
  admin: createRateLimit({ name: "admin", max: 180, windowSeconds: 60, identity: "user", failClosed: true }),
  upload: createRateLimit({ name: "upload", max: 20, windowSeconds: 10 * 60, identity: "user", failClosed: true }),
  inquiry: createRateLimit({ name: "inquiry", max: 5, windowSeconds: 60 * 60, identity: "account" }),
};

module.exports = { createRateLimit, policies };
