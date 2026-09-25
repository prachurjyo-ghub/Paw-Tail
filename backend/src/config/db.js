const mongoose = require("mongoose");
const Brand = require("../models/Brand");
const env = require("./env");
const logger = require("../utils/logger");
const { runtimeState } = require("../runtime/state");

let listenersRegistered = false;
let intentionalShutdown = false;

const registerConnectionListeners = () => {
  if (listenersRegistered) {
    return;
  }

  listenersRegistered = true;
  const connection = mongoose.connection;

  connection.on("connecting", () => {
    runtimeState.setMongoState("connecting");
    logger.info("mongodb.connecting");
  });

  connection.on("connected", () => {
    runtimeState.setMongoState("connected");
    logger.info("mongodb.connected");
  });

  connection.on("disconnected", () => {
    runtimeState.setMongoState("disconnected");
    if (!intentionalShutdown) {
      logger.warn("mongodb.disconnected");
    }
  });

  connection.on("reconnected", () => {
    runtimeState.setMongoState("connected");
    logger.info("mongodb.reconnected");
  });

  connection.on("error", (error) => {
    runtimeState.setMongoState("error");
    if (!intentionalShutdown) {
      logger.error("mongodb.error", {
        message: error.message,
        stack: error.stack,
      });
    }
  });
};

const connectDB = async () => {
  registerConnectionListeners();
  intentionalShutdown = false;
  runtimeState.setMongoState("connecting");

  try {
    await mongoose.connect(env.mongodbUri);
    await Brand.init();
    runtimeState.setMongoState("connected");
  } catch (error) {
    runtimeState.setMongoState("error");
    logger.error("mongodb.initial_connection_failed", {
      message: error.message,
      stack: error.stack,
    });
    throw error;
  }
};

const disconnectDB = async () => {
  intentionalShutdown = true;
  runtimeState.setMongoState("disconnecting");

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  runtimeState.setMongoState("disconnected");
};

module.exports = {
  connectDB,
  disconnectDB,
  registerConnectionListeners,
};
