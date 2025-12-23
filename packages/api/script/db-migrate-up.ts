import { drizzle } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import path from 'path'
import { Pool } from 'pg'
import { EXTENSIONS_SCHEMA } from 'src/orm/constants'

const sql = new Pool({
  connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
})

async function main(): Promise<void> {
  const db = drizzle(sql)
  await db.$client.query(`CREATE SCHEMA IF NOT EXISTS ${EXTENSIONS_SCHEMA};`)
  await db.$client.query(`SET search_path TO public, ${EXTENSIONS_SCHEMA};`)
  await db.$client.query(
    `GRANT USAGE ON SCHEMA ${EXTENSIONS_SCHEMA} TO ${process.env.DB_USER};`,
  )

  await db.$client.query(
    `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA ${EXTENSIONS_SCHEMA};`,
  )
  await db.$client.query(
    `CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA ${EXTENSIONS_SCHEMA};`,
  )

  await migrate(db, {
    migrationsFolder: path.join(__dirname, '../src/orm/migrations'),
  })
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exit(1)
  })
