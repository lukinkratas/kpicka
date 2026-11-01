import react from '@vitejs/plugin-react'
import { defineConfig, type ProxyOptions } from 'vite'

// The providers do not all allow browser CORS. Forward each request without caching.
const proxy = Object.fromEntries([
  ['cnb', 'https://www.cnb.cz'],
  ['csu', 'https://data.csu.gov.cz'],
  ['mf', 'https://data.mf.gov.cz'],
  ['cssz', 'https://data.cssz.cz'],
].map(([key, target]) => [`/api/${key}`, {
  target, changeOrigin: true,
  rewrite: (path: string) => path.replace(`/api/${key}`, ''),
  configure: (server) => {
    server.on('proxyReq', request => { request.removeHeader('origin'); request.removeHeader('referer') })
    server.on('proxyRes', response => { response.headers['cache-control'] = 'no-store' })
  },
} satisfies ProxyOptions]))

export default defineConfig({ plugins: [react()], server: { proxy }, preview: { proxy } })
