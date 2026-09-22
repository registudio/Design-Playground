import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /**
   * esbuild ships a native binary and spawns it as a child process. Bundling it into
   * the server build breaks that lookup, so it stays external and is required from
   * node_modules at runtime — the element preview route compiles registry source with it.
   */
  serverExternalPackages: ["esbuild"],
};

export default nextConfig;
