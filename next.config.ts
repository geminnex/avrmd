import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async redirects() {
    return [
      // /advertise was published before promotion merged into the wider
      // organisation journey.
      { source: "/advertise", destination: "/for-organizations", permanent: true },
    ];
  },
};

export default nextConfig;
