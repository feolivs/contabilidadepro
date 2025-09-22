import type { NextConfig } from "next";

// Bundle Analyzer
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: true,
})

const nextConfig: NextConfig = {
  // ESLint - não falhar build por warnings
  eslint: {
    // Durante builds, ignorar warnings do ESLint
    ignoreDuringBuilds: false, // Manter false para mostrar warnings
    dirs: ['src'], // Apenas verificar pasta src
  },

  // TypeScript - não falhar build por warnings
  typescript: {
    // Durante builds, ignorar erros de tipo não críticos
    ignoreBuildErrors: false, // Manter false para mostrar erros
  },

  // Otimizações de imagem
  images: {
    // Domínios permitidos para imagens externas
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      }
    ],
    // Formatos de imagem suportados
    formats: ['image/webp', 'image/avif'],
    // Tamanhos de imagem para otimização
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Cache de imagens otimizadas
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 dias
  },

  // Otimizações de performance
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      '@tanstack/react-query',
      'recharts',
      'react-markdown',
      'react-syntax-highlighter'
    ],
  },

  // Configuração do Turbopack
  turbopack: {
    root: __dirname,
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },

  // Otimizações de build
  output: 'standalone',

  // Configurações de performance
  poweredByHeader: false,
  generateEtags: false,

  // Configuração para PDF.js e otimizações webpack
  webpack: (config: any) => {
    // Configurar PDF.js worker
    config.resolve.alias = {
      ...config.resolve.alias,
      'pdfjs-dist/build/pdf.worker.entry': 'pdfjs-dist/build/pdf.worker.min.js',
    }

    // Otimizações de bundle splitting
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks?.cacheGroups,
          // Core UI libraries
          lucide: {
            name: 'lucide-react',
            test: /[\\/]node_modules[\\/]lucide-react[\\/]/,
            chunks: 'all',
            priority: 30,
          },
          radix: {
            name: 'radix-ui',
            test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
            chunks: 'all',
            priority: 25,
          },
          // Backend libraries
          supabase: {
            name: 'supabase',
            test: /[\\/]node_modules[\\/]@supabase[\\/]/,
            chunks: 'all',
            priority: 25,
          },
          // Heavy libraries - load async
          pdf: {
            name: 'pdf-libs',
            test: /[\\/]node_modules[\\/](jspdf|pdfjs-dist)[\\/]/,
            chunks: 'async',
            priority: 35,
          },
          charts: {
            name: 'charts',
            test: /[\\/]node_modules[\\/]recharts[\\/]/,
            chunks: 'async',
            priority: 30,
          },
          excel: {
            name: 'excel',
            test: /[\\/]node_modules[\\/]xlsx[\\/]/,
            chunks: 'async',
            priority: 30,
          },
          // Date utilities
          dateFns: {
            name: 'date-fns',
            test: /[\\/]node_modules[\\/]date-fns[\\/]/,
            chunks: 'all',
            priority: 20,
          },
          // React Query
          reactQuery: {
            name: 'react-query',
            test: /[\\/]node_modules[\\/]@tanstack[\\/]react-query[\\/]/,
            chunks: 'all',
            priority: 20,
          },
        },
      },
    }

    return config
  },



  // Compressão
  compress: true,

  // Headers de segurança e cache
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
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=300',
          },
        ],
      },
    ]
  },
};

export default withBundleAnalyzer(nextConfig);
