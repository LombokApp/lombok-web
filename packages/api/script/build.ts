import { build } from 'bun'

const optionalRequirePackages = [
  'class-transformer',
  'class-validator',
  '@nestjs/microservices',
  '@nestjs/websockets',
  '@fastify/static',
]

const alwaysExternalPackages = [
  '@heyputer/kv.js', // Always external to avoid XMap bundling issues
]

void (async () => {
  // Build main application
  const mainResult = await build({
    entrypoints: ['./src/main.ts'],
    outdir: './dist/src',
    target: 'bun',
    format: 'esm',
    minify: {
      syntax: true,
      whitespace: true,
    },
    external: [
      ...alwaysExternalPackages,
      ...optionalRequirePackages.filter((pkg) => {
        try {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require(pkg)
          return false
        } catch {
          return true
        }
      }),
    ],
  })

  if (!mainResult.success) {
    console.log('Main build failed:', mainResult.logs[0])
    process.exit(1)
  }

  // Build core-app-worker
  const workerResult = await build({
    entrypoints: ['./src/app/core-app-worker.ts'],
    outdir: './dist/src',
    target: 'bun',
    format: 'esm',
    minify: {
      syntax: true,
      whitespace: true,
    },
  })

  if (!workerResult.success) {
    console.log('Worker build failed:', workerResult.logs[0])
    process.exit(1)
  }

  console.log('Built successfully!')
})()
