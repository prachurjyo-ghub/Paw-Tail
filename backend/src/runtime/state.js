const mongoose = require("mongoose");

const createRuntimeState = ({
  getMongoReadyState = () => mongoose.connection.readyState,
} = {}) => {
  let startupComplete = false;
  let shuttingDown = false;
  let mongoState = "disconnected";

  return {
    markStartupComplete() {
      startupComplete = true;
    },
    beginShutdown() {
      shuttingDown = true;
    },
    setMongoState(nextState) {
      mongoState = nextState;
    },
    getSnapshot() {
      const mongoConnected =
        mongoState === "connected" && getMongoReadyState() === 1;

      return {
        startupComplete,
        shuttingDown,
        mongoState,
        ready: startupComplete && mongoConnected && !shuttingDown,
      };
    },
  };
};

module.exports = {
  createRuntimeState,
  runtimeState: createRuntimeState(),
};
