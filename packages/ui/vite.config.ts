import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import type { PluginOption } from 'vite'
import { defineConfig } from 'vite'

import { buildIdPlugin } from './build-id-plugin'

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [tailwindcss(), react(), buildIdPlugin()] as PluginOption[],
    resolve: {
      alias: {
        '@/src': path.resolve(__dirname, './src'),
        '@lombokapp/utils': path.resolve(__dirname, '../utils/src'),
        '@lombokapp/types': path.resolve(__dirname, '../types/src'),
        '@lombokapp/sdk': path.resolve(__dirname, '../sdk/src'),
        '@lombokapp/auth-utils': path.resolve(__dirname, '../auth-utils/src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'ui-toolkit': ['@lombokapp/ui-toolkit'],
            query: ['@tanstack/react-query', 'openapi-react-query'],
            'lombok-sdk': [
              '@lombokapp/sdk',
              '@lombokapp/types',
              '@lombokapp/auth-utils',
            ],
          },
        },
      },
    },
    preview: {
      proxy: {
        '^/api/': {
          target: process.env.LOMBOK_BACKEND_HOST,
        },
        '^/socket.io/': {
          target: process.env.LOMBOK_BACKEND_HOST,
          ws: true,
        },
      },
    },
    server: {
      allowedHosts: true,
      cors: true,
      hmr: {
        overlay: true,
      },
    },
  }
})
