import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export enum EventLevel {
  TRACE = 'TRACE',
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export const eventsTable = pgTable('events', {
  id: uuid('id').primaryKey(),
  eventKey: text('eventKey').notNull(),
  emitterIdentifier: text('emitterIdentifier').notNull(),
  userId: text('userId'),
  folderId: text('folderId'),
  level: text('level').notNull().$type<EventLevel>(),
  objectKey: text('objectKey'),
  data: jsonb('data').$type<unknown>(),
  createdAt: timestamp('createdAt').notNull(),
})

export type Event = typeof eventsTable.$inferSelect
export type NewEvent = typeof eventsTable.$inferInsert
