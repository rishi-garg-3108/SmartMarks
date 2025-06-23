/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker
  output: 'standalone',
  
  // Image configuration for production
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "smartmarks.deep-research.eu",
        pathname: "/api/uploads/**",
      },
      // Keep localhost for development
      {
        protocol: "http",
        hostname: "localhost",
        pathname: "/api/uploads/**",
      },
    ],
  },

  // Security headers for production
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;