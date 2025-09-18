import { build } from 'bun'
import fs from 'fs'
import path from 'path'

// Externalize all dependencies to avoid bundling third-party code.
// This prevents Bun from rewriting __dirname based on the build root
// (e.g., /temp/dev inside Docker multi-stage builds).
const packageJsonPath = path.resolve(import.meta.dir, '../package.json')
const packageJsonRaw = fs.readFileSync(packageJsonPath, 'utf8')
const packageJson = JSON.parse(packageJsonRaw) as {
  dependencies?: Record<string, string>
}
const dependencyPackageNames = Object.keys(packageJson.dependencies ?? {})

const alwaysExternalPackages = ['node:*']

const externalPackages: string[] = Array.from(
  new Set([...alwaysExternalPackages, ...dependencyPackageNames]),
)

void (async () => {
  const result = await build({
    entrypoints: ['./src/index.ts'],
    outdir: './dist',
    target: 'bun',
    format: 'esm',
    minify: {
      syntax: true,
      whitespace: true,
    },
    external: externalPackages,
  })

  if (!result.success) {
    console.log('Build failed:', result.logs[0])
    process.exit(1)
  }

  console.log('Built core-worker-utils successfully!')
})()
