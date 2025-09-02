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
  '@lombokapp/core-worker', // Externalize to preserve its import.meta.dirname at runtime
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

  // No longer build core-app-worker inside API; it's resolved from core-worker package

  console.log('Built successfully!')
})()
