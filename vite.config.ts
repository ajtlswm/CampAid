import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/opinet': {
        target: 'https://www.opinet.co.kr/api',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/opinet/, ''),
      },
    },
  },
})
