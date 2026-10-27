const { createClient } = require("redis");

const env = require("./env");
const logger = require("../utils/logger");

let client;
let connectPromise;

const getRedisClient = () => {
  if (!env.redisUrl) return null;

  if (!client) {
    client = createClient({
      url: env.redisUrl,
      socket: {
        connectTimeout: 3000,
        reconnectStrategy(retries) {
          return Math.min(100 * 2 ** retries, 5000);
        },
      },
    });
    client.on("error", (error) => {
      logger.error("redis.error", { message: error.message });
    });
  }

  return client;
};

const connectRedis = async () => {
  const redis = getRedisClient();
  if (!redis || redis.isReady) return redis;

  if (!connectPromise) {
    connectPromise = redis.connect().finally(() => {
      connectPromise = null;
    });
  }
  await connectPromise;
  return redis;
};

const disconnectRedis = async () => {
  if (!client?.isOpen) return;
  await client.quit();
};

module.exports = { connectRedis, disconnectRedis, getRedisClient };
