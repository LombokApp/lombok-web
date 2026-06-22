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
          // Vite 8 / Rolldown only accepts the function form of manualChunks.
          // Workspace deps are aliased to source, so match by path too.
          manualChunks(id) {
            if (
              id.includes('@lombokapp/ui-toolkit') ||
              id.includes('/packages/ui-toolkit/')
            ) {
              return 'ui-toolkit'
            }
            if (
              id.includes('@tanstack/react-query') ||
              id.includes('openapi-react-query')
            ) {
              return 'query'
            }
            if (
              id.includes('@lombokapp/sdk') ||
              id.includes('@lombokapp/types') ||
              id.includes('@lombokapp/auth-utils') ||
              id.includes('/packages/sdk/') ||
              id.includes('/packages/types/') ||
              id.includes('/packages/auth-utils/')
            ) {
              return 'lombok-sdk'
            }
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
