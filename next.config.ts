import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: { position: 'bottom-left' },
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
  },
  // Media in /public isn't content-hashed, so it can't be cached forever: a day fresh, then
  // served from cache while it revalidates for a week.
  async headers() {
    return ['/hero/:path*', '/brand/:path*'].map(source => ({
      source,
      headers: [
        { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
      ],
    }))
  },
}

export default nextConfig
