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
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
      },
      {
        protocol: "http",
        hostname: "192.168.*",
      },
      {
        protocol: "http",
        hostname: "10.*",
      },
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
