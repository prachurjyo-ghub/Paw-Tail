const logger = require("../utils/logger");

let processHandlersRegistered = false;

const wait = (milliseconds) =>
  new Promise((resolve) => {
    const timer = setTimeout(resolve, milliseconds);
    timer.unref?.();
  });

const closeHttpServer = (server) =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error && error.code !== "ERR_SERVER_NOT_RUNNING") {
        reject(error);
        return;
      }
      resolve();
    });
    server.closeIdleConnections?.();
  });

const createShutdownManager = ({
  server,
  state,
  disconnectDatabase,
  drainTimeoutMs = 10000,
  databaseCloseTimeoutMs = 3000,
  exit = (code) => process.exit(code),
}) => {
  let shutdownPromise = null;

  const shutdown = ({ reason, exitCode = 0, error } = {}) => {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    state.beginShutdown();
    logger.info("server.shutdown_started", {
      reason: reason || "unknown",
      exitCode,
    });

    shutdownPromise = (async () => {
      try {
        const drained = await Promise.race([
          closeHttpServer(server).then(() => true),
          wait(drainTimeoutMs).then(() => false),
        ]);

        if (!drained) {
          logger.warn("server.shutdown_drain_timeout", {
            timeoutMs: drainTimeoutMs,
          });
          server.closeAllConnections?.();
        }

        const databaseClosed = await Promise.race([
          disconnectDatabase().then(() => true),
          wait(databaseCloseTimeoutMs).then(() => false),
        ]);

        if (!databaseClosed) {
          logger.error("server.database_close_timeout", {
            timeoutMs: databaseCloseTimeoutMs,
          });
          exitCode = 1;
        }
      } catch (shutdownError) {
        exitCode = 1;
        logger.error("server.shutdown_failed", {
          message: shutdownError.message,
          stack: shutdownError.stack,
        });
      }

      if (error) {
        logger.error("server.fatal_error", {
          reason,
          message: error.message,
          stack: error.stack,
        });
      }

      logger.info("server.shutdown_complete", { exitCode });
      exit(exitCode);
    })();

    return shutdownPromise;
  };

  return { shutdown };
};

const registerProcessHandlers = (shutdown) => {
  if (processHandlersRegistered) {
    return false;
  }

  processHandlersRegistered = true;
  process.once("SIGTERM", () => {
    void shutdown({ reason: "SIGTERM", exitCode: 0 });
  });
  process.once("SIGINT", () => {
    void shutdown({ reason: "SIGINT", exitCode: 0 });
  });
  process.once("uncaughtException", (error) => {
    void shutdown({ reason: "uncaughtException", exitCode: 1, error });
  });
  process.once("unhandledRejection", (reason) => {
    const error =
      reason instanceof Error ? reason : new Error(String(reason || "Unknown"));
    void shutdown({ reason: "unhandledRejection", exitCode: 1, error });
  });

  return true;
};

module.exports = {
  createShutdownManager,
  registerProcessHandlers,
};
