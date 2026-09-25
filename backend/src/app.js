const path = require("path");

const cookieParser = require("cookie-parser");
const cors = require("cors");
const express = require("express");
const morgan = require("morgan");

const env = require("./config/env");
const requestId = require("./middleware/requestId.middleware");
const { notFound, errorHandler } = require("./middleware/error.middleware");
const createHealthRouter = require("./routes/healthRoutes");
const Routes = require("./routes/index.js");
const { runtimeState } = require("./runtime/state");

const JSON_BODY_LIMIT = "100kb";
const URL_ENCODED_BODY_LIMIT = "100kb";
const URL_ENCODED_PARAMETER_LIMIT = 100;

const isLocalDevOrigin = (origin, isProduction) => {
  if (isProduction) {
    return false;
  }

  try {
    const parsed = new URL(origin);
    return (
      parsed.hostname === "localhost" ||
      parsed.hostname === "127.0.0.1" ||
      parsed.hostname === "0.0.0.0" ||
      parsed.hostname.startsWith("192.168.") ||
      parsed.hostname.startsWith("10.") ||
      parsed.hostname.startsWith("172.")
    );
  } catch {
    return false;
  }
};

const createApp = ({ config = env, state = runtimeState } = {}) => {
  const app = express();
  const allowedOrigins = [
    ...new Set([
      config.adminUrl,
      config.clientUrl,
      ...config.additionalClientUrls,
    ]),
  ];

  app.use(requestId);
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (
          allowedOrigins.includes(origin) ||
          isLocalDevOrigin(origin, config.isProduction)
        ) {
          return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    })
  );
  app.use(morgan(config.isProduction ? "combined" : "dev"));
  app.use(cookieParser());
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(
    express.urlencoded({
      extended: true,
      limit: URL_ENCODED_BODY_LIMIT,
      parameterLimit: URL_ENCODED_PARAMETER_LIMIT,
    })
  );

  // Temporary read compatibility for records that still contain /uploads paths.
  app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

  app.use("/health", createHealthRouter(state));

  app.get("/", (req, res) => {
    res.status(200).json({
      success: true,
      message: "Server is running",
    });
  });

  app.use("/api", Routes);
  app.use(notFound);
  app.use(errorHandler);

  return app;
};

module.exports = {
  createApp,
  JSON_BODY_LIMIT,
  URL_ENCODED_BODY_LIMIT,
  URL_ENCODED_PARAMETER_LIMIT,
};
