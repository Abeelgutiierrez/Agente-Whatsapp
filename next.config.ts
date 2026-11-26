import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";
const localAddresses = Object.values(networkInterfaces()).flatMap((entries) =>
  (entries || [])
    .filter((entry) => entry.family === "IPv4")
    .map((entry) => entry.address),
);
const config: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/[...path]": ["./src/server/migrations/**/*"],
  },
  serverExternalPackages: ["better-sqlite3"],
  devIndicators: false,
  allowedDevOrigins: ["localhost", "127.0.0.1", ...localAddresses],
};
export default config;
