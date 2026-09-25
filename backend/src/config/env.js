const VALID_NODE_ENVS = new Set(["development", "test", "production"]);
const DURATION_PATTERN = /^\d+(?:s|m|h|d)$/i;

const readString = (name, { required = false, fallback } = {}) => {
  const value = process.env[name]?.trim() || fallback;

  if (required && !value) {
    throw new Error(`${name} is required`);
  }

  return value;
};

const readBoolean = (name, { fallback = false } = {}) => {
  const rawValue = process.env[name]?.trim().toLowerCase();

  if (!rawValue) {
    return fallback;
  }

  if (rawValue !== "true" && rawValue !== "false") {
    throw new Error(`${name} must be either "true" or "false"`);
  }

  return rawValue === "true";
};

const readPort = (name, { required = false, fallback } = {}) => {
  const rawValue = readString(name, { required, fallback });
  const value = Number(rawValue);

  if (!Number.isInteger(value) || value < 1 || value > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535`);
  }

  return value;
};

const readDuration = (name, { required = false, fallback } = {}) => {
  const value = readString(name, { required, fallback });

  if (!DURATION_PATTERN.test(value)) {
    throw new Error(
      `${name} must be a positive duration such as "15m", "1h", or "7d"`
    );
  }

  return value;
};

const readMongoUri = ({ requireDatabase = false } = {}) => {
  const value = readString("MONGODB_URI", { required: true });

  if (!/^mongodb(?:\+srv)?:\/\//i.test(value)) {
    throw new Error(
      "MONGODB_URI must begin with mongodb:// or mongodb+srv://"
    );
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("MONGODB_URI must be a valid MongoDB connection URI");
  }

  if (requireDatabase && (!parsed.pathname || parsed.pathname === "/")) {
    throw new Error(
      "MONGODB_URI must include an explicit database name in production"
    );
  }

  return value;
};

const readUrl = (
  name,
  { required = false, fallback, requireHttps = false } = {}
) => {
  const value = readString(name, { required, fallback });

  if (!value) {
    return undefined;
  }

  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`${name} must use http or https`);
  }

  if (requireHttps && parsed.protocol !== "https:") {
    throw new Error(`${name} must use https in production`);
  }

  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error(`${name} must be an origin without a path, query, or hash`);
  }

  return parsed.origin;
};

const readUrlList = (name, { requireHttps = false } = {}) => {
  const rawValue = process.env[name]?.trim();

  if (!rawValue) {
    return [];
  }

  return rawValue.split(",").map((value, index) => {
    const temporaryName = `${name}[${index}]`;
    const trimmedValue = value.trim();

    if (!trimmedValue) {
      throw new Error(`${temporaryName} must not be empty`);
    }

    let parsed;
    try {
      parsed = new URL(trimmedValue);
    } catch {
      throw new Error(`${temporaryName} must be a valid absolute URL`);
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error(`${temporaryName} must use http or https`);
    }

    if (requireHttps && parsed.protocol !== "https:") {
      throw new Error(`${temporaryName} must use https in production`);
    }

    if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
      throw new Error(
        `${temporaryName} must be an origin without a path, query, or hash`
      );
    }

    return parsed.origin;
  });
};

const loadEnv = () => {
  const nodeEnv = readString("NODE_ENV", { required: true });

  if (!VALID_NODE_ENVS.has(nodeEnv)) {
    throw new Error(
      `NODE_ENV must be one of: ${[...VALID_NODE_ENVS].join(", ")}`
    );
  }

  const isProduction = nodeEnv === "production";
  const mailDeliveryEnabled = readBoolean("MAIL_DELIVERY_ENABLED", {
    fallback: false,
  });

  if (isProduction && !mailDeliveryEnabled) {
    throw new Error(
      "MAIL_DELIVERY_ENABLED must be true in production because account email flows are enabled"
    );
  }

  const accessTokenSecret = readString("ACCESS_TOKEN_SECRET", {
    required: true,
  });
  const refreshTokenSecret = readString("REFRESH_TOKEN_SECRET", {
    required: true,
  });
  const cloudinaryCloudName = readString("CLOUDINARY_CLOUD_NAME", {
    required: isProduction,
  });
  const cloudinaryApiKey = readString("CLOUDINARY_API_KEY", {
    required: isProduction,
  });
  const cloudinaryApiSecret = readString("CLOUDINARY_API_SECRET", {
    required: isProduction,
  });
  const cloudinaryFolderPrefix = readString("CLOUDINARY_FOLDER_PREFIX", {
    required: isProduction,
  });

  if (isProduction && accessTokenSecret.length < 32) {
    throw new Error(
      "ACCESS_TOKEN_SECRET must contain at least 32 characters in production"
    );
  }

  if (isProduction && refreshTokenSecret.length < 32) {
    throw new Error(
      "REFRESH_TOKEN_SECRET must contain at least 32 characters in production"
    );
  }

  if (accessTokenSecret === refreshTokenSecret) {
    throw new Error(
      "ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be different"
    );
  }

  if (
    cloudinaryFolderPrefix &&
    !/^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+)*$/.test(cloudinaryFolderPrefix)
  ) {
    throw new Error(
      "CLOUDINARY_FOLDER_PREFIX may contain only letters, numbers, underscores, hyphens, and path separators"
    );
  }

  const env = {
    nodeEnv,
    isProduction,
    port: readPort("PORT", { fallback: "3000" }),
    mongodbUri: readMongoUri({ requireDatabase: isProduction }),
    accessTokenSecret,
    refreshTokenSecret,
    accessTokenExpiresIn: readDuration("ACCESS_TOKEN_EXPIRES_IN", {
      required: isProduction,
      fallback: isProduction ? undefined : "1h",
    }),
    refreshTokenExpiresIn: readDuration("REFRESH_TOKEN_EXPIRES_IN", {
      required: isProduction,
      fallback: isProduction ? undefined : "1h",
    }),
    clientUrl: readUrl("CLIENT_URL", {
      required: isProduction,
      fallback: isProduction ? undefined : "http://localhost:3002",
      requireHttps: isProduction,
    }),
    adminUrl: readUrl("ADMIN_URL", {
      required: isProduction,
      fallback: isProduction ? undefined : "http://localhost:3001",
      requireHttps: isProduction,
    }),
    additionalClientUrls: readUrlList("CLIENT_URLS", {
      requireHttps: isProduction,
    }),
    mailDeliveryEnabled,
    smtpHost: readString("SMTP_HOST", { required: mailDeliveryEnabled }),
    smtpPort: mailDeliveryEnabled
      ? readPort("SMTP_PORT", { required: true })
      : undefined,
    smtpSecure: readBoolean("SMTP_SECURE", { fallback: false }),
    smtpUser: readString("SMTP_USER", { required: mailDeliveryEnabled }),
    smtpPass: readString("SMTP_PASS", { required: mailDeliveryEnabled }),
    mailFrom: readString("MAIL_FROM", { required: mailDeliveryEnabled }),
    cloudinaryCloudName,
    cloudinaryApiKey,
    cloudinaryApiSecret,
    cloudinaryFolderPrefix,
  };

  return Object.freeze(env);
};

module.exports = loadEnv();
