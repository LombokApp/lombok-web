import { build } from 'bun'
import { readFileSync } from 'fs'
import path from 'path'

const packageJsonPath = path.resolve(import.meta.dir, '../package.json')
const packageJsonRaw = readFileSync(packageJsonPath, 'utf8')
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
    entrypoints: ['./index.ts'],
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

  console.log('Built types successfully!')
})()
