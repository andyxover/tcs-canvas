import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    /**
     * Every route here is dynamic (each reads the viewer cookie), and the client
     * router cache defaults to 0s for dynamic routes — so returning to a page you
     * just visited refetched it from scratch. These values let the router reuse a
     * recently-fetched segment instead.
     *
     * Server actions call revalidatePath, which busts this cache too, so your own
     * mutations still appear immediately. The trade-off only applies to changes
     * made by someone else while you sit on a page: up to 30s stale. Fine for a
     * single-process sandbox; revisit when this runs against real shared data.
     */
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
}

export default nextConfig
