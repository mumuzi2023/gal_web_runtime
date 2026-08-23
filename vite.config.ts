import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => ({
  // Production builds are relocatable: the generated dist can be opened from
  // a ZIP, mounted below /gal_web_runtime, or published at any Pages path.
  // Keep the historical dev path so the Generator iframe URL remains stable.
  base: command === 'serve' ? '/gal_web_runtime/' : './',
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
}))
