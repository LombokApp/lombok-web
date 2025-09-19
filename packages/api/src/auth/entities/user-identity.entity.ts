import { pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { usersTable } from 'src/users/entities/user.entity'

export const userIdentitiesTable = pgTable(
  'user_identities',
  {
    id: uuid('id').primaryKey(),
    userId: uuid('userId')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    provider: text('provider').notNull(), // 'google', 'github', 'password'
    providerUserId: text('providerUserId').notNull(), // External provider's user ID
    providerEmail: text('providerEmail'), // Email from provider (informational)
    providerName: text('providerName'), // Name from provider (informational)
    createdAt: timestamp('createdAt').notNull(),
    updatedAt: timestamp('updatedAt').notNull(),
  },
  (table) => ({
    uniqueProviderUser: unique('unique_provider_user').on(
      table.provider,
      table.providerUserId,
    ),
    uniqueUserProvider: unique('unique_user_provider').on(
      table.userId,
      table.provider,
    ),
  }),
)

export type UserIdentity = typeof userIdentitiesTable.$inferSelect
export type NewUserIdentity = typeof userIdentitiesTable.$inferInsert
