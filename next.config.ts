import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/__/auth/:path*",
        destination: "https://simpleplek-9d373.firebaseapp.com/__/auth/:path*",
      },
    ];
  },
};

export default nextConfig;
