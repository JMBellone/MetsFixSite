import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': 'https://mets-fix-site.vercel.app',
    },
  },
  build: {
    outDir: 'dist',
  },
})
