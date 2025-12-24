import type {
  JsonSerializableObject,
  TargetLocationContext,
} from '@lombokapp/types'
import { sql } from 'drizzle-orm'
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

export const eventsTable = pgTable(
  'events',
  {
    id: uuid('id').primaryKey(),
    eventIdentifier: text('eventIdentifier').notNull(),
    emitterIdentifier: text('emitterIdentifier').notNull(),
    targetUserId: uuid('targetUserId'),
    targetLocation: jsonb('targetLocation').$type<TargetLocationContext>(),
    data: jsonb('data').$type<JsonSerializableObject>(),
    createdAt: timestamp('createdAt').notNull(),
  },
  (table) => [
    index('events_target_location_folder_id_idx').using(
      'btree',
      sql`((${table.targetLocation} ->> 'folderId')::uuid)`,
    ),
  ],
)

export type Event = typeof eventsTable.$inferSelect
export type NewEvent = typeof eventsTable.$inferInsert
