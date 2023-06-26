import type { Constructor, MigrationObject } from '@mikro-orm/core'
import type { Migration } from '@mikro-orm/migrations'
import glob from 'glob'
import path from 'path'

/**
 * Load migrations matching a pattern. This is based on the internal behavior
 * defined in https://github.com/mikro-orm/mikro-orm/blob/c9c8ce6/packages/migrations/src/Migrator.ts
 * and generates an array that can be provided as `migrations.migrationList` in
 * the MikroORM config.
 */
export const loadMigrations = async (dir: string, pattern: string) => {
  const filenames = glob.sync(pattern, { cwd: dir })

  const loadMigration = async (filename: string): Promise<MigrationObject> => {
    const name = path.parse(filename).name

    const exports = (await import(path.join(dir, filename))) as {
      [key: string]: Constructor<Migration>
    }

    return { class: exports[name], name }
  }

  return Promise.all(filenames.map(loadMigration))
}

export type HexLike = string | Buffer | null
