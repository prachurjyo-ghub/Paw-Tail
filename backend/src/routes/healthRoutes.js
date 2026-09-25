const express = require("express");

const createHealthRouter = (state) => {
  const router = express.Router();

  router.get("/live", (req, res) => {
    res.status(200).json({
      status: "alive",
      timestamp: new Date().toISOString(),
    });
  });

  router.get("/ready", (req, res) => {
    const snapshot = state.getSnapshot();

    res.status(snapshot.ready ? 200 : 503).json({
      status: snapshot.ready ? "ready" : "not_ready",
      timestamp: new Date().toISOString(),
    });
  });

  return router;
};

module.exports = createHealthRouter;
