import { inArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'

import { appsTable } from '../src/app/entities/app.entity'

const sql = new Pool({
  connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
})

export async function enableApps(appIds?: string[]): Promise<void> {
  const db = drizzle(sql)

  const now = new Date()
  const updateValues = {
    enabled: true,
    userScopeEnabledDefault: true,
    folderScopeEnabledDefault: true,
    updatedAt: now,
  }

  if (appIds && appIds.length > 0) {
    // Update specific apps
    const result = await db
      .update(appsTable)
      .set(updateValues)
      .where(inArray(appsTable.slug, appIds))
      .returning()

    console.log(
      `Updated ${result.length} app(s):`,
      result.map((app) => app.identifier).join(', '),
    )
  } else {
    // Update all apps
    const result = await db.update(appsTable).set(updateValues).returning()

    console.log(
      `Updated ${result.length} app(s):`,
      result.map((app) => app.identifier).join(', '),
    )
  }

  await sql.end()
}

if (require.main === module) {
  // Get CLI arguments (skip first 2: node/bun and script path)
  const appIds =
    process.argv.slice(2).length > 0 ? process.argv.slice(2) : undefined

  enableApps(appIds)
    .then(() => {
      console.log('Done')
      process.exit(0)
    })
    .catch((error) => {
      console.error('Error:', error)
      process.exit(1)
    })
}
