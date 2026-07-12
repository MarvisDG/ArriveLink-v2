// import type { NextConfig } from "next";
// import path from "path";

// const nextConfig: NextConfig = {
//   turbopack: {
//     root: path.join(process.cwd()),
//   },
// };

// export default nextConfig;




import type { NextConfig } from "next";
import path from "path";

const BACKEND_PORT = process.env.BACKEND_PORT ?? "5000";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(process.cwd()),
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `http://localhost:${BACKEND_PORT}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;