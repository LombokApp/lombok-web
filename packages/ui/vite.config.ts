import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { defineConfig } from 'vite'

function createReactPluginWithWorkerExclusion(workerFileNames: string[] = []) {
  const [basePlugin] = react()

  return {
    ...basePlugin,
    name: 'react-swc-with-worker-filter',
    transform(code: string, id: string, ...rest: any[]) {
      if (workerFileNames.some((name) => id.endsWith(name))) {
        return null // Skip transforming this file entirely
      }
      if (
        basePlugin &&
        'transform' in basePlugin &&
        typeof basePlugin.transform === 'function'
      ) {
        return basePlugin.transform.call(this as any, code, id, ...rest)
      }
      return null
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [createReactPluginWithWorkerExclusion(['.worker.ts'])],
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
