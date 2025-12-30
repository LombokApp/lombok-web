import type { JsonSerializableObject } from '@lombokapp/types'
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { jsonbBase64 } from 'src/orm/util/json-base64-type'

export const eventsTable = pgTable(
  'events',
  {
    id: uuid('id').primaryKey(),
    eventIdentifier: text('eventIdentifier').notNull(),
    emitterIdentifier: text('emitterIdentifier').notNull(),
    targetUserId: uuid('targetUserId'),
    targetLocationFolderId: uuid('targetLocationFolderId'),
    targetLocationObjectKey: text('targetLocationObjectKey'),
    data: jsonbBase64('data').$type<JsonSerializableObject>(),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => [
    index('events_target_location_folder_id_idx').on(
      table.targetLocationFolderId,
    ),
  ],
)

export type Event = typeof eventsTable.$inferSelect
export type NewEvent = typeof eventsTable.$inferInsert
