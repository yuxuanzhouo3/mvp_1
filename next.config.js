/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Performance optimizations
  experimental: {
    serverComponentsExternalPackages: ['@upstash/redis'],
    optimizePackageImports: ['@radix-ui/react-icons', 'lucide-react'],
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.in',
      },
      {
        protocol: 'https',
        hostname: '**.mornscience.top',
      },
      {
        protocol: 'https',
        hostname: '636c-cloud2-6gyd32hf02a19502-1389657646.tcb.qcloud.la',
      },
    ],
    unoptimized: process.env.NODE_ENV === 'production',
    formats: ['image/webp', 'image/avif'],
  },
  
  // Bundle optimization
  webpack: (config, { dev, isServer }) => {
    // Add path aliases resolution
    const path = require('path');
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
      '@/components': path.resolve(__dirname, 'components'),
      '@/lib': path.resolve(__dirname, 'lib'),
      '@/types': path.resolve(__dirname, 'types'),
      '@/app': path.resolve(__dirname, 'app'),
    };

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
  // 注意：不要在生产环境完全移除 console，否则无法看到服务端日志
  // 只移除 console.debug，保留 console.log, console.warn, console.error
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['log', 'warn', 'error', 'info'],
    } : false,
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV || 'development'
  },
  
  // Security headers
  async headers() {
    return [
      // 安全头 - 应用于所有路由
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
          }
        ]
      },
      // 静态资源缓存 - 仅应用于 _next/static 目录
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      // 公共静态文件缓存
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400'
          }
        ]
      },
      // 需要认证的路由 - 禁止缓存
      {
        source: '/dashboard/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate, max-age=0'
          },
          {
            key: 'Pragma',
            value: 'no-cache'
          },
          {
            key: 'Expires',
            value: '0'
          },
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow'
          }
        ]
      },
      {
        source: '/auth/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate'
          }
        ]
      },
      {
        source: '/profile/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate'
          }
        ]
      },
      // API 路由 - 禁止缓存
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'private, no-cache, no-store, must-revalidate'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig 
