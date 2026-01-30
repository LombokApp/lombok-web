import { pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { usersTable } from 'src/users/entities/user.entity'

export const userIdentitiesTable = pgTable(
  'user_identities',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(), // 'google', 'github', 'password'
    providerUserId: text('provider_user_id').notNull(), // External provider's user ID
    providerEmail: text('provider_email'), // Email from provider (informational)
    providerName: text('provider_name'), // Name from provider (informational)
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    unique('unique_provider_user').on(table.provider, table.providerUserId),
    unique('unique_user_provider').on(table.userId, table.provider),
  ],
)

export type UserIdentity = typeof userIdentitiesTable.$inferSelect
export type NewUserIdentity = typeof userIdentitiesTable.$inferInsert
