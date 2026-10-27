const dotenv = require("dotenv");
dotenv.config();

const env = require("./src/config/env");
const { createApp } = require("./src/app");
const { connectDB, disconnectDB } = require("./src/config/db");
const { connectRedis, disconnectRedis } = require("./src/config/redis");
const { runtimeState } = require("./src/runtime/state");
const {
  createShutdownManager,
  registerProcessHandlers,
} = require("./src/runtime/shutdown");
const logger = require("./src/utils/logger");

const startServer = async () => {
  try {
    await Promise.all([connectDB(), connectRedis()]);
    const app = createApp();
    const server = await new Promise((resolve, reject) => {
      const httpServer = app.listen(env.port, "0.0.0.0", () => {
        runtimeState.markStartupComplete();
        logger.info("server.started", {
          port: env.port,
          environment: env.nodeEnv,
        });
        resolve(httpServer);
      });
      httpServer.once("error", reject);
    });

    const { shutdown } = createShutdownManager({
      server,
      state: runtimeState,
      disconnectDatabase: async () => {
        await Promise.all([disconnectDB(), disconnectRedis()]);
      },
    });
    registerProcessHandlers(shutdown);

    return { app, server, shutdown };
  } catch (error) {
    logger.error("server.startup_failed", {
      message: error.message,
      stack: error.stack,
    });
    await Promise.allSettled([disconnectDB(), disconnectRedis()]);
    process.exitCode = 1;
    return null;
  }
};

if (require.main === module) {
  void startServer();
}

module.exports = {
  startServer,
};
