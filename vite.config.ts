import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['10.0.0.89.nip.io'],
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'eKakeibo',
        short_name: 'eKakeibo',
        theme_color: '#F7F4F0',
        background_color: '#F7F4F0',
        display: 'standalone',
        icons: [
          {
            src: '/eKakeibo-logo.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/eKakeibo-logo.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
})
