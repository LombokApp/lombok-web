import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import { modulesTable } from '../../module/entities/module.entity'
import { eventsTable } from './event.entity'

export const eventReceiptsTable = pgTable('event_receipts', {
  id: uuid('id').primaryKey(),
  moduleId: uuid('moduleId')
    .notNull()
    .references(() => modulesTable.id),
  eventId: uuid('eventId')
    .notNull()
    .references(() => eventsTable.id),
  eventKey: text('eventKey').notNull(),
  handlerId: uuid('handlerId'),
  startedAt: timestamp('startedAt'),
  completedAt: timestamp('completedAt'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export type EventReceipt = typeof eventReceiptsTable.$inferSelect
export type NewEventReceipt = typeof eventReceiptsTable.$inferInsert
