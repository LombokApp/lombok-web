import postgres from 'postgres'

const sql = postgres(
  `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
)

async function main(): Promise<void> {
  await sql`DROP SCHEMA public CASCADE;`
  await sql`CREATE SCHEMA public;`
  await sql`GRANT ALL ON SCHEMA public TO public;`

  await sql`DROP SCHEMA drizzle CASCADE;`
  await sql`CREATE SCHEMA drizzle;`
  await sql`GRANT ALL ON SCHEMA drizzle TO public;`
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
