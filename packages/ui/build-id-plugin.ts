import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import type { PluginOption } from 'vite'

const execFileAsync = promisify(execFile)

const REPO_ROOT = path.resolve(__dirname, '../..')
const PROJECT_ID_FILE = path.join(REPO_ROOT, '.lombok-project-id')

const sanitizeBranch = (branch: string): string =>
  branch
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

// Returns '' on any failure (missing git binary, not-a-repo, ENOENT, etc.).
const git = async (...args: string[]): Promise<string> => {
  try {
    const { stdout } = await execFileAsync('git', ['-C', REPO_ROOT, ...args], {
      timeout: 2000,
    })
    return stdout.trim()
  } catch {
    return ''
  }
}

const resolveDevBuildId = async (): Promise<string> => {
  if (process.env.LOMBOK_BUILD_ID) {
    return process.env.LOMBOK_BUILD_ID
  }
  const project = (await readFile(PROJECT_ID_FILE, 'utf8')).trim()
  const hash = (await git('rev-parse', '--short', 'HEAD')) || 'nogit'
  const rawBranch = await git('rev-parse', '--abbrev-ref', 'HEAD')
  const branchPart =
    rawBranch && rawBranch !== 'HEAD' ? sanitizeBranch(rawBranch) : ''
  return branchPart ? `${project}-${branchPart}-${hash}` : `${project}-${hash}`
}

// Exposes the same build ID at GET /build-id that the backend exposes at
// /api/v1/public/build-id. In dev the dev server resolves it live; in build
// the plugin emits a static `build-id` asset using the LOMBOK_BUILD_ID env
// (set via Docker build-arg in release images).
export function buildIdPlugin(): PluginOption {
  return {
    name: 'lombok-build-id',
    configureServer(server) {
      server.middlewares.use('/build-id', (_req, res) => {
        void resolveDevBuildId()
          .then((buildId) => {
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.setHeader('Cache-Control', 'no-store')
            res.end(buildId)
          })
          .catch((error: unknown) => {
            const message =
              error instanceof Error ? error.message : String(error)
            res.statusCode = 500
            res.end(`build-id resolution failed: ${message}`)
          })
      })
    },
    generateBundle() {
      const buildId = process.env.LOMBOK_BUILD_ID || 'unknown'
      this.emitFile({
        type: 'asset',
        fileName: 'build-id',
        source: buildId,
      })
    },
  }
}
