import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Local backend; override when port 8000 is taken, e.g. BACKEND_URL=http://localhost:8010 npm run dev
const backendUrl = process.env.BACKEND_URL ?? 'http://localhost:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
      },
      // Locally-uploaded images (POST /upload/image) are served by the backend at
      // this path with a relative URL - without proxying it too, every uploaded
      // image 404s (falls through to the SPA) in dev.
      // Référencement (en production : règles équivalentes dans nginx.conf.template)
      '/sitemap.xml': {
        target: backendUrl,
        changeOrigin: true,
        rewrite: () => '/api/v1/seo/sitemap.xml',
      },
      '/robots.txt': {
        target: backendUrl,
        changeOrigin: true,
        rewrite: () => '/api/v1/seo/robots.txt',
      },
      '/uploads': {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
})
