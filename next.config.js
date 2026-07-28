const awsApiOrigin = process.env.AWS_API_ORIGIN?.replace(/\/$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: "standalone",
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*'
      },
      {
        protocol: 'http',
        hostname: '*'
      }
    ]
  },
  experimental: {
    scrollRestoration: true,
    outputFileTracingIncludes: {
      '/api/sealed-casts/wallets': [
        './node_modules/graphql/**/*',
        './node_modules/graphql-request/**/*'
      ]
    }
  },
  async rewrites() {
    if (!awsApiOrigin) {
      return [];
    }

    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${awsApiOrigin}/api/:path*`
        }
      ]
    };
  }
};

module.exports = nextConfig;
