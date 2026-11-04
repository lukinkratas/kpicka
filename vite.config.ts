import react from '@vitejs/plugin-react'
import { defineConfig, type ProxyOptions } from 'vite'
import { sources } from './src/data.ts'

// Dev stand-in for the Pages Function: /api/<host><path> is forwarded live to the source instead of read from R2.
const hosts = [...new Set(Object.values(sources).map(source => new URL(source).host))]
const proxy = Object.fromEntries(hosts.map(host => [`/api/${host}`, {
  target: `https://${host}`, changeOrigin: true,
  rewrite: (path: string) => path.replace(`/api/${host}`, ''),
  configure: (server) => {
    server.on('proxyReq', request => { request.removeHeader('origin'); request.removeHeader('referer') })
    // Without the cron's Last-Modified, the app shows the load time.
    server.on('proxyRes', response => { response.headers['cache-control'] = 'no-store'; delete response.headers['last-modified'] })
  },
} satisfies ProxyOptions]))

export default defineConfig({ plugins: [react()], server: { proxy }, preview: { proxy } })
