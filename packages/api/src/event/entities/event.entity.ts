import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const eventsTable = pgTable('events', {
  id: uuid('id').primaryKey(),
  eventKey: text('eventKey').notNull(),
  emitterIdentifier: text('emitterIdentifier').notNull(),
  userId: text('userId'),
  folderId: text('folderId'),
  objectKey: text('objectKey'),
  data: jsonb('data').$type<unknown>(),
  createdAt: timestamp('createdAt').notNull(),
})

export type Event = typeof eventsTable.$inferSelect
export type NewEvent = typeof eventsTable.$inferInsert
