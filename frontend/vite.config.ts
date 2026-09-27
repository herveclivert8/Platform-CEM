import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Locally-uploaded images (POST /upload/image) are served by the backend at
      // this path with a relative URL - without proxying it too, every uploaded
      // image 404s (falls through to the SPA) in dev.
      // Référencement (en production : règles équivalentes dans nginx.conf)
      '/sitemap.xml': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: () => '/api/v1/seo/sitemap.xml',
      },
      '/robots.txt': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: () => '/api/v1/seo/robots.txt',
      },
      '/uploads': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
