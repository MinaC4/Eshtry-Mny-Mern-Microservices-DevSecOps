import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    watch: { usePolling: true },
    proxy: {
      '/api/v1/users': {
        target: 'http://user-service:9001',
        changeOrigin: true,
      },
      '/api/v1/products': {
        target: 'http://product-service:9000',
        changeOrigin: true,
      },
      '/api/v1/filter': {
        target: 'http://product-service:9000',
        changeOrigin: true,
      },
      '/api/v1/cart': {
        target: 'http://cart-service:9003',
        changeOrigin: true,
        bypass(req) {
          if (req.headers.accept?.includes('text/html')) {
            return req.url;
          }
          return null;
        }
      }
    }
  },
  preview: {
    proxy: {
      '/api/v1/users': { target: 'http://user-service:9001', changeOrigin: true },
      '/api/v1/products': { target: 'http://product-service:9000', changeOrigin: true },
      '/api/v1/filter': { target: 'http://product-service:9000', changeOrigin: true },
      '/api/v1/cart': { target: 'http://cart-service:9003', changeOrigin: true }
    }
  }
})
