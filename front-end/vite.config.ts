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
      '/users': {
        target: 'http://user-service:9001',
        changeOrigin: true,
      },
      '/products': {
        target: 'http://product-service:9000',
        changeOrigin: true,
      },
      '/cart': {
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
  // مهم للـ production build
  preview: {
    proxy: {
      '/users': { target: 'http://user-service:9001', changeOrigin: true },
      '/products': { target: 'http://product-service:9000', changeOrigin: true },
      '/cart': { target: 'http://cart-service:9003', changeOrigin: true }
    }
  }
})
