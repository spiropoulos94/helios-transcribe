import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Turbopack is enabled via --turbopack flag in dev script

  // Increase body size limit for file uploads (500MB for large audio/video files)
  experimental: {
    serverActions: {
      bodySizeLimit: '750mb',
    },
    proxyClientMaxBodySize: '750mb',
  },
};

export default nextConfig;
