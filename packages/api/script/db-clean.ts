import { Pool } from 'pg'

const sql = new Pool({
  connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
})

const client = await sql.connect()

async function main(): Promise<void> {
  // Drop all schemas starting with app_
  const appSchemas = await client.query<{ schema_name: string }>(
    `SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE 'app_%'`,
  )

  for (const { schema_name } of appSchemas.rows) {
    await client.query(`DROP SCHEMA IF EXISTS ${schema_name} CASCADE;`)
  }

  await client.query(`DROP SCHEMA IF EXISTS public CASCADE;`)
  await client.query(`CREATE SCHEMA public;`)
  await client.query(`GRANT ALL ON SCHEMA public TO public;`)

  await client.query(`DROP SCHEMA IF EXISTS drizzle CASCADE;`)
  await client.query(`CREATE SCHEMA drizzle;`)
  await client.query(`GRANT ALL ON SCHEMA drizzle TO public;`)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exit(1)
  })
