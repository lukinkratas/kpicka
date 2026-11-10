import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In development, /api (functions/api) is served by the deployed Pages project.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { proxy: { '/api': { target: 'https://kpicka.pages.dev', changeOrigin: true } } },
})
