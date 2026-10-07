import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /**
   * esbuild ships a native binary and spawns it as a child process. Bundling it into
   * the server build breaks that lookup, so it stays external and is required from
   * node_modules at runtime — the element preview route compiles registry source with it.
   */
  serverExternalPackages: ["esbuild"],
  /**
   * The preview route bundles React, Motion and GSAP from node_modules at runtime, with
   * esbuild. File tracing cannot see those reads, so on Vercel the function shipped
   * only part of them — react-dom without the `scheduler` it requires — and every
   * preview failed with 'Could not resolve "scheduler"'. These are exactly the packages
   * esbuild reads (its metafile for the preview harness), shipped whole. A pattern that
   * matches nothing (framer-motion is nested inside motion unless npm hoists it) is
   * harmless.
   */
  outputFileTracingIncludes: {
    "/api/element-preview": [
      "./node_modules/react/**/*",
      "./node_modules/react-dom/**/*",
      "./node_modules/scheduler/**/*",
      "./node_modules/motion/**/*",
      "./node_modules/motion-dom/**/*",
      "./node_modules/motion-utils/**/*",
      "./node_modules/framer-motion/**/*",
      "./node_modules/gsap/**/*",
    ],
  },
};

export default nextConfig;
