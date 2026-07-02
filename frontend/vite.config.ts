import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const allowedHosts = process.env.VITE_ALLOWED_HOSTS?.split(',').map((h) => h.trim()).filter(Boolean)

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('jspdf')) return 'pdf-core'
          if (id.includes('html2canvas')) return 'canvas-tools'
          if (id.includes('dompurify')) return 'sanitize-tools'
          if (id.includes('qrcode') || id.includes('jsqr')) return 'qr-tools'
          if (id.includes('react-muscle-highlighter')) return 'body-map'
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('react-router-dom')) return 'react-core'
          if (id.includes('@tanstack/react-query') || id.includes('axios') || id.includes('zustand')) return 'app-data'
          if (id.includes('lucide-react')) return 'icons'
          return 'vendor'
        },
      },
    },
  },
  server: {
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5050',
        changeOrigin: true,
      }
    },
    ...(allowedHosts?.length ? { allowedHosts } : {}),
  }
})
