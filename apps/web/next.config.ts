import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@amoji/emotion-core", "@amoji/vrm-renderer"],
};

export default nextConfig;
