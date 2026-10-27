const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const createCsrfProtection = (config) => {
  const allowedOrigins = new Set([
    config.clientUrl,
    config.adminUrl,
    ...config.additionalClientUrls,
  ].filter(Boolean));

  return (req, res, next) => {
  if (!config.isProduction || SAFE_METHODS.has(req.method)) return next();

  const origin = req.get("origin");
  const marker = req.get("x-pawtail-request");
  if (!origin || !allowedOrigins.has(origin) || marker !== "1") {
    return res.status(403).json({
      success: false,
      message: "Request origin verification failed",
    });
  }

  return next();
  };
};

module.exports = createCsrfProtection;
