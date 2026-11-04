import { defineConfig } from 'vite'

// Bundles the cron Worker (with its import of src/data.ts) into one ES module that Terraform uploads.
export default defineConfig({
  publicDir: false,
  build: { lib: { entry: 'etl/worker.ts', formats: ['es'], fileName: 'worker' }, outDir: 'etl/dist', minify: false },
})
