import path from 'path'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
})
