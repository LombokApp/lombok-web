import { fileURLToPath } from 'node:url'

import alias from '@rollup/plugin-alias'
import resolve from '@rollup/plugin-node-resolve'
import typescript from '@rollup/plugin-typescript'
import { defineConfig } from 'rollup'
import dts from 'rollup-plugin-dts'

const workspaceAliases = {
  '@stellariscloud/api-client': fileURLToPath(
    new URL('../api-client/dist', import.meta.url),
  ),
  '@stellariscloud/utils': fileURLToPath(
    new URL('../shared/packages/utils/dist', import.meta.url),
  ),
}

const rollupConfig = defineConfig([
  {
    input: './src/index.ts', // Entry point for your application
    output: {
      dir: 'dist',
      format: 'es',
    },
    plugins: [
      resolve({ extensions: ['.jsx', '.js'] }),
      alias({ entries: workspaceAliases }),
      typescript(),
    ],
  },
  {
    input: './src/index.ts', // Entry point for your application
    output: {
      dir: 'dist',
      format: 'es',
    },
    plugins: [alias({ entries: workspaceAliases }), dts()],
  },
])

export default rollupConfig
