import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone", // production
  images: {
    domains: ["s4.anilist.co", "via.placeholder.com"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "s4.anilist.co",
        pathname: "/file/anilistcdn/**",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
