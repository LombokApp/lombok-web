import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const sessionsTable = pgTable('session', {
  id: uuid('id').primaryKey(),
  hash: text('hash').notNull(),
  userId: uuid('userId').notNull(),
  type: text('type').notNull(),
  typeDetails:
    jsonb('typeDetails').$type<
      Record<string, string | number | boolean | null>
    >(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export type Session = typeof sessionsTable.$inferSelect
export type NewSession = typeof sessionsTable.$inferInsert
