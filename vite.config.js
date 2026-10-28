import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // In development, /api is served by scripts/dev-api.mjs.
    // In production, Vercel serves the functions in /api directly.
    proxy: {
      '/api': 'http://127.0.0.1:3001',
    },
  },
})
