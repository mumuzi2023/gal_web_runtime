import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/gal_web_runtime/',
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api-data': {
        target: 'https://storyforge.r2.it-bill.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-data/, ''),
      },
    },
  },
})
