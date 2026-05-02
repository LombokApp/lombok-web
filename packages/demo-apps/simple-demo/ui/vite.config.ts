import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    hmr: { clientPort: 5175 },
  },
  resolve: {
    alias: {
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      '@lombokapp/app-browser-sdk': path.resolve(
        __dirname,
        '../../../app-browser-sdk/src',
      ),
      '@lombokapp/sdk': path.resolve(__dirname, '../../../sdk/src'),
      '@lombokapp/types': path.resolve(__dirname, '../../../types/src'),
      '@lombokapp/utils': path.resolve(__dirname, '../../../utils/src'),
      '@lombokapp/auth-utils': path.resolve(
        __dirname,
        '../../../auth-utils/src',
      ),
    },
  },
})
