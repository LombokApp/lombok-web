import type { JsonSerializableObject } from '@lombokapp/types'
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { jsonbBase64 } from 'src/orm/util/json-base64-type'

export const eventsTable = pgTable(
  'events',
  {
    id: uuid('id').primaryKey(),
    eventIdentifier: text('event_identifier').notNull(),
    emitterIdentifier: text('emitter_identifier').notNull(),
    targetUserId: uuid('target_user_id'),
    targetLocationFolderId: uuid('target_location_folder_id'),
    targetLocationObjectKey: text('target_location_object_key'),
    data: jsonbBase64('data').$type<JsonSerializableObject>(),
    createdAt: timestamp('created_at').notNull(),
  },
  (table) => [
    index('events_target_location_folder_id_idx').on(
      table.targetLocationFolderId,
    ),
    index('events_created_at_idx').on(table.createdAt),
    index('events_emitter_identifier_idx').on(table.emitterIdentifier),
    index('events_folder_created_at_idx').on(
      table.targetLocationFolderId,
      table.createdAt,
    ),
    index('events_target_object_key_idx').on(table.targetLocationObjectKey),
  ],
)

export type Event = typeof eventsTable.$inferSelect
export type NewEvent = typeof eventsTable.$inferInsert
