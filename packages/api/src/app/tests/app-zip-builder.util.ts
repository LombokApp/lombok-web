import type { AppConfig } from '@lombokapp/types'
import { spawn } from 'bun'
import fs from 'fs'
import os from 'os'
import path from 'path'

export interface AppZipBuilderOptions {
  slug: string
  label: string
  config: AppConfig
  files?: { path: string; content: string | Buffer }[]
  migrations?: { filename: string; content: string }[]
}

/**
 * Builds a valid app zip file dynamically for testing
 */
export async function buildAppZip(
  options: AppZipBuilderOptions,
): Promise<Buffer> {
  const tempDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'app-zip-builder-'),
  )

  try {
    const appDir = path.join(tempDir, options.slug)
    // Write config.json
    await fs.promises.mkdir(appDir, { recursive: true })

    await fs.promises.writeFile(
      path.join(appDir, 'config.json'),
      JSON.stringify(options.config, null, 2),
    )

    // Write additional files if provided
    if (options.files) {
      for (const file of options.files) {
        const filePath = path.join(appDir, file.path)
        await fs.promises.mkdir(path.dirname(filePath), { recursive: true })
        await fs.promises.writeFile(
          filePath,
          typeof file.content === 'string' ? file.content : file.content,
        )
      }
    }

    // Write migration files if provided
    if (options.migrations && options.migrations.length > 0) {
      const migrationsDir = path.join(appDir, 'migrations')
      await fs.promises.mkdir(migrationsDir, { recursive: true })
      for (const migration of options.migrations) {
        await fs.promises.writeFile(
          path.join(migrationsDir, migration.filename),
          migration.content,
        )
      }
    }

    // Create zip file
    const zipPath = path.join(tempDir, `${options.slug}.zip`)
    const zipProc = spawn({
      cmd: ['zip', '-r', zipPath, '.'],
      cwd: tempDir,
      stdout: 'inherit',
      stderr: 'inherit',
    })
    const zipCode = await zipProc.exited
    if (zipCode !== 0) {
      throw new Error(`Failed to create zip file: ${zipCode}`)
    }

    // Read zip file as buffer
    const zipBuffer = await fs.promises.readFile(zipPath)

    return zipBuffer
  } finally {
    // Clean up temp directory
    await fs.promises.rm(tempDir, { recursive: true, force: true })
  }
}

/**
 * Creates a minimal valid app config for testing
 */
export function createTestAppConfig(
  slug: string,
  label: string,
  overrides?: Partial<AppConfig>,
): AppConfig {
  return {
    slug,
    label,
    description: `Test app: ${label}`,
    requiresStorage: false,
    subscribedCoreEvents: [],
    permissions: {
      core: [],
      user: [],
      folder: [],
    },
    ...overrides,
  }
}
