const isProduction = process.env.NODE_ENV === "production";
const remotePatterns = [
  {
    protocol: "https",
    hostname: "res.cloudinary.com",
    pathname: "/**",
  },
];

try {
  const apiUrl = new URL(process.env.NEXT_PUBLIC_API_URL || "");
  remotePatterns.push({
    protocol: apiUrl.protocol.replace(":", ""),
    hostname: apiUrl.hostname,
    port: apiUrl.port,
    pathname: "/uploads/**",
  });
} catch {
  if (!isProduction) {
    remotePatterns.push(
      { protocol: "http", hostname: "localhost", pathname: "/uploads/**" },
      { protocol: "http", hostname: "127.0.0.1", pathname: "/uploads/**" }
    );
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  experimental: {
    // Next 16 enables this by default. This project's Turbopack cache grew to
    // multiple gigabytes and restoring it substantially increased dev-server RSS.
    turbopackFileSystemCacheForDev: false,
  },
  images: {
    dangerouslyAllowLocalIP: !isProduction,
    remotePatterns,
  },
};

export default nextConfig;
