import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'pwa-192.png', 'pwa-512.png'],
      manifest: {
        name: 'Washington Township Little League',
        short_name: 'WTLL',
        description: 'WTLL — volunteer sign-ups, pitch log, and scorekeeper tools',
        theme_color: '#C41230',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait-primary',
        scope: '/',
        start_url: '/public/volunteer-signups',
        categories: ['sports', 'utilities'],
        icons: [
          {
            src: '/pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Cache all static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Network-first for API calls so pitch counts are always fresh
        runtimeCaching: [
          {
            urlPattern: ({ url }: { url: URL }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst' as const,
            options: {
              cacheName: 'wtll-api',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 60, maxAgeSeconds: 300 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // SPA fallback — only for public routes so admin isn't impacted offline
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^\/public\//],
      },
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000/',
        changeOrigin: true
      }
    }
  },
  resolve: {
    dedupe: ['@emotion/react', '@emotion/styled', '@mui/material'],
  },
  optimizeDeps: {
    include: [
      '@mui/material',
      '@mui/material/styles',
      '@mui/material/Accordion',
      '@mui/material/AccordionSummary',
      '@mui/material/AccordionDetails',
      '@mui/icons-material',
      '@emotion/react',
      '@emotion/styled',
    ],
    force: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})