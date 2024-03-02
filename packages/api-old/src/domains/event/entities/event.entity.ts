import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const eventsTable = pgTable('events', {
  id: uuid('id').primaryKey(),
  eventKey: text('eventKey').notNull(),
  data: jsonb('data')
    .$type<{ folderId: string; objectKey?: string }>()
    .notNull(),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export type Event = typeof eventsTable.$inferSelect
export type NewEvent = typeof eventsTable.$inferInsert
