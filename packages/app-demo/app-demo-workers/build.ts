import { build } from 'bun'

await build({
  entrypoints: [
    './src/workers/demo_api_request_worker/index.ts',
    './src/workers/demo_object_added_worker/index.ts',
    './src/workers/demo_scheduled_worker/index.ts',
    './src/workers/demo_on_complete_worker/index.ts',
  ],
  outdir: '../dist/workers',
  external: ['@lombokapp/*', 'pg'],
  target: 'bun',
  minify: true,
  sourcemap: 'external',
})

console.log('Build completed successfully!')
