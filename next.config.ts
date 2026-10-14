import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A self-contained server in .next/standalone, used by the Dockerfile.
  // `npm start` (next start) works as well.
  output: "standalone",
  experimental: {
    optimizePackageImports: ['lucide-react'],
    // src/proxy.js runs on every request, so Next buffers request bodies for it
    // (10 MB by default, larger bodies are cut off). Fit a 25 MB upload
    // (MAX_UPLOAD_BYTES in src/lib/storage.js) plus multipart overhead.
    proxyClientMaxBodySize: '26mb',
  },
};

export default nextConfig;
