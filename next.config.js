/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.env.NEXT_OUTPUT_MODE || 'standalone',
  
  // Performance optimizations
  experimental: {
    serverComponentsExternalPackages: ['@upstash/redis'],
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },
  
  // Image optimization
  images: {
    domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com'],
    unoptimized: process.env.NODE_ENV === 'development',
    formats: ['image/webp', 'image/avif'],
  },
  
  // Bundle optimization
  webpack: (config, { dev, isServer }) => {
    // Optimize bundle size in production
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      };
    }
    
    return config;
  },
  
  // Compiler optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV || 'development'
  },
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig 