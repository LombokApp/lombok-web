import { execFile } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const REPO_ROOT = '/usr/src/app'
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

// In production the build ID is baked into the image as LOMBOK_BUILD_ID.
// In dev there is no env var; we resolve it live from .lombok-project-id (the
// stable compose project name written by ./dx) plus the current branch and
// short commit hash. The project name itself is reused verbatim as
// COMPOSE_PROJECT_NAME so containers/volumes survive across commits.
export const resolveBuildId = async (): Promise<string> => {
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
