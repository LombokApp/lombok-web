import { relations } from 'drizzle-orm'
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

import type { Event } from './event.entity'
import { eventsTable } from './event.entity'

export const eventReceiptsTable = pgTable('event_receipts', {
  id: uuid('id').primaryKey(),
  appIdentifier: text('appIdentifier').notNull(),
  eventId: uuid('eventId')
    .notNull()
    .references(() => eventsTable.id),
  eventKey: text('eventKey').notNull(),
  handlerId: text('handlerId'),
  startedAt: timestamp('startedAt'),
  completedAt: timestamp('completedAt'),
  errorAt: timestamp('errorAt'),
  error: text('error'),
  createdAt: timestamp('createdAt').notNull(),
  updatedAt: timestamp('updatedAt').notNull(),
})

export const eventReceiptRelations = relations(
  eventReceiptsTable,
  ({ one }) => ({
    event: one(eventsTable, {
      fields: [eventReceiptsTable.eventId],
      references: [eventsTable.id],
    }),
  }),
)

export type EventReceipt = typeof eventReceiptsTable.$inferSelect
export type NewEventReceipt = typeof eventReceiptsTable.$inferInsert
export type EventReceiptWithEvent = typeof eventReceiptsTable.$inferSelect & {
  event: Event
}
