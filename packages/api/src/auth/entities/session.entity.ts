import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const sessionsTable = pgTable(
  'session',
  {
    id: uuid('id').primaryKey(),
    hash: text('hash').notNull(),
    userId: uuid('user_id').notNull(),
    type: text('type').notNull(),
    typeDetails:
      jsonb('type_details').$type<
        Record<string, string | number | boolean | null>
      >(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    index('session_user_id_idx').on(table.userId),
    index('session_expires_at_idx').on(table.expiresAt),
  ],
)

export type Session = typeof sessionsTable.$inferSelect
export type NewSession = typeof sessionsTable.$inferInsert
