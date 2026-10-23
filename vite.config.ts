/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// In development the browser talks to the Vite dev server at /api, and Vite forwards the request to the
// Spring backend with the /api prefix removed. Same origin for the browser, so no CORS setup is needed.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
         target: env.VITE_API_PROXY_TARGET || 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
    test: {
      environment: 'jsdom',
      // Bound jsdom workers so parallel suites do not starve UI transitions on laptops.
      maxWorkers: 2,
      testTimeout: 15000,
      setupFiles: ['./src/test-setup.ts'],
      globals: false,
    },
  }
})
