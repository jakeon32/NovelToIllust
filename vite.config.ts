import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          // Proxy API requests to production server to avoid CORS issues
          '/api': {
            target: 'https://novel-to-illust.vercel.app',
            changeOrigin: true,
            secure: true,
          }
        }
      },
      plugins: [react()],
      base: '/',
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
