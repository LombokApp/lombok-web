import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const dockerRegistryCredentialsTable = pgTable(
  'docker_registry_credentials',
  {
    id: uuid('id').primaryKey(),
    registry: text('registry').notNull(),
    serverAddress: text('server_address').notNull(),
    username: text('username').notNull(),
    password: text('password').notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('docker_registry_credentials_registry_unique').on(
      table.registry,
    ),
  ],
)

export type DockerRegistryCredential =
  typeof dockerRegistryCredentialsTable.$inferSelect
export type NewDockerRegistryCredential =
  typeof dockerRegistryCredentialsTable.$inferInsert
