import postgres from 'postgres'

const sql = postgres(
  `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
)

async function main(): Promise<void> {
  // Drop all schemas starting with app_
  const appSchemas = await sql`
    SELECT schema_name 
    FROM information_schema.schemata 
    WHERE schema_name LIKE 'app_%'
  `

  for (const schema of appSchemas) {
    await sql`DROP SCHEMA IF EXISTS ${sql(schema.schema_name)} CASCADE;`
  }

  await sql`DROP SCHEMA IF EXISTS public CASCADE;`
  await sql`CREATE SCHEMA public;`
  await sql`GRANT ALL ON SCHEMA public TO public;`

  await sql`DROP SCHEMA IF EXISTS drizzle CASCADE;`
  await sql`CREATE SCHEMA drizzle;`
  await sql`GRANT ALL ON SCHEMA drizzle TO public;`
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error)
    process.exit(1)
  })
