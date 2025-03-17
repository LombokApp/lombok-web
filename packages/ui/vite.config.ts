import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // exclude: [/worker\.ts$/],
    }),
  ],
  resolve: {
    alias: {
      '@/utils': path.resolve(__dirname, '../ui-toolkit/src/utils'),
      '@/components': path.resolve(__dirname, '../ui-toolkit/src/components'),
      '@/components/*': path.resolve(
        __dirname,
        '../ui-toolkit/src/components/*',
      ),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
