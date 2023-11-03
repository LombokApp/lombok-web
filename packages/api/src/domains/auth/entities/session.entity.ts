import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import type { AuthScope } from '../constants/scope.constants'

export const sessionsTable = pgTable('session', {
  id: uuid('id').primaryKey(),
  hash: text('hash').notNull(),
  userId: uuid('userId').notNull(),
  scopes: text('scopes').array().$type<AuthScope[]>(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export type Session = typeof sessionsTable.$inferSelect
export type NewSession = typeof sessionsTable.$inferInsert
