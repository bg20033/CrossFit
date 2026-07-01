import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const allowedHosts = process.env.VITE_ALLOWED_HOSTS?.split(',').map((h) => h.trim()).filter(Boolean)

export default defineConfig({
  plugins: [react()],
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
