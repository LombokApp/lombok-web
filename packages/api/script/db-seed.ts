/**
 * Idempotent seed wrapper for dev startup.
 * Uses a dev-only `_dev_flags` table (not part of the app schema) to track
 * whether the seed has already been applied.
 */
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import fs from 'fs'
import path from 'path'
import { Pool } from 'pg'
import { dbSchema } from 'src/orm/orm.service'

const sql = new Pool({
  connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
})
const db = drizzle(sql, { schema: dbSchema })

async function main(): Promise<void> {
  const client = await sql.connect()
  try {
    // Create dev-only flags table if it doesn't exist (outside Drizzle migrations)
    await client.query(`
      CREATE TABLE IF NOT EXISTS _dev_flags (
        key TEXT PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `)

    const seedCheckResult = await client.query(
      `SELECT 1 FROM _dev_flags WHERE key = 'seed_applied'`,
    )

    if (seedCheckResult.rows.length > 0) {
      // eslint-disable-next-line no-console
      console.log(
        'Dev seed already applied or skipped. If you want to re-seed, run `bun dx db reset`.',
      )
      if (process.argv.includes('--exit-0')) {
        process.exit(0)
      }
      process.exit(0)
    }

    if (
      !process.env.DEV_SEED_FILE?.trim() ||
      process.env.DEV_SEED_FILE.trim() === 'none'
    ) {
      // eslint-disable-next-line no-console
      console.log('No seed file provided, skipping.')
    } else {
      // eslint-disable-next-line no-console
      console.log(`Running dev seed "${process.env.DEV_SEED_FILE}" ...`)
      const seedFilePath = path.join(
        import.meta.dir,
        '..',
        'script',
        'db-seeds',
        process.env.DEV_SEED_FILE,
      )
      if (!fs.existsSync(seedFilePath)) {
        // eslint-disable-next-line no-console
        console.error('\n')
        // eslint-disable-next-line no-console
        console.error(
          '\x1b[31m\x1b[1m%s\x1b[0m',
          '═══════════════════════════════════════════════════════════',
        )
        // eslint-disable-next-line no-console
        console.error(
          '\x1b[31m\x1b[1m%s\x1b[0m',
          '  ERROR: Seed file does not exist!',
        )
        // eslint-disable-next-line no-console
        console.error(
          '\x1b[31m\x1b[1m%s\x1b[0m',
          '═══════════════════════════════════════════════════════════',
        )
        // eslint-disable-next-line no-console
        console.error('\x1b[31m\x1b[1m%s\x1b[0m', `  File: ${seedFilePath}`)
        // eslint-disable-next-line no-console
        console.error(
          '\x1b[31m\x1b[1m%s\x1b[0m',
          `  DEV_SEED_FILE: ${process.env.DEV_SEED_FILE}`,
        )
        // eslint-disable-next-line no-console
        console.error(
          '\x1b[31m\x1b[1m%s\x1b[0m',
          '═══════════════════════════════════════════════════════════',
        )
        // eslint-disable-next-line no-console
        console.error('\n')
        throw new Error(`Seed file does not exist: ${seedFilePath}`)
      }
      const seedModule = (await import(seedFilePath)) as {
        seed?: (db: NodePgDatabase<typeof dbSchema>) => Promise<void>
      }

      if (typeof seedModule.seed !== 'function') {
        // eslint-disable-next-line no-console
        console.error('\n')
        // eslint-disable-next-line no-console
        console.error(
          '\x1b[31m\x1b[1m%s\x1b[0m',
          '═══════════════════════════════════════════════════════════',
        )
        // eslint-disable-next-line no-console
        console.error(
          '\x1b[31m\x1b[1m%s\x1b[0m',
          '  ERROR: Seed module does not export a seed() function!',
        )
        // eslint-disable-next-line no-console
        console.error(
          '\x1b[31m\x1b[1m%s\x1b[0m',
          '═══════════════════════════════════════════════════════════',
        )
        // eslint-disable-next-line no-console
        console.error('\x1b[31m\x1b[1m%s\x1b[0m', `  File: ${seedFilePath}`)
        // eslint-disable-next-line no-console
        console.error(
          '\x1b[31m\x1b[1m%s\x1b[0m',
          `  DEV_SEED_FILE: ${process.env.DEV_SEED_FILE}`,
        )
        // eslint-disable-next-line no-console
        console.error(
          '\x1b[31m\x1b[1m%s\x1b[0m',
          '═══════════════════════════════════════════════════════════',
        )
        // eslint-disable-next-line no-console
        console.error('\n')
        throw new Error(
          `Seed module "${process.env.DEV_SEED_FILE}" does not export a seed() function`,
        )
      }

      await seedModule.seed(db)
    }
    await client.query(`INSERT INTO _dev_flags (key) VALUES ('seed_applied')`)
  } finally {
    client.release()
    await sql.end()
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exit(1)
  })
