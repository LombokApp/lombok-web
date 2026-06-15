import type { JsonSerializableObject } from '@lombokapp/types'
import { sql } from 'drizzle-orm'
import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { jsonbBase64 } from 'src/orm/util/json-base64-type'

export const eventsTable = pgTable(
  'events',
  {
    id: uuid('id').primaryKey(),
    eventIdentifier: text('event_identifier').notNull(),
    emitterId: text('emitter_id').notNull(), // CORE_IDENTIFIER or app.id
    targetUserId: uuid('target_user_id'),
    actorUserId: uuid('actor_user_id'),
    targetLocationFolderId: uuid('target_location_folder_id'),
    targetLocationObjectKey: text('target_location_object_key'),
    data: jsonbBase64('data').$type<JsonSerializableObject>(),
    aggregationKey: text('aggregation_key'),
    aggregationHandledAt: timestamp('aggregation_handled_at', {
      withTimezone: true,
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    check(
      'anchor_only_on_root',
      sql`
      (target_user_id IS NOT NULL AND target_location_folder_id IS NULL AND target_location_object_key IS NULL) OR
      (target_user_id IS NULL AND target_location_folder_id IS NULL AND target_location_object_key IS NULL) OR
      (target_user_id IS NULL AND target_location_folder_id IS NOT NULL AND target_location_object_key IS NOT NULL) OR
      (target_user_id IS NULL AND target_location_folder_id IS NOT NULL AND target_location_object_key IS NULL)
    `,
    ),
    index('events_target_location_folder_id_idx').on(
      table.targetLocationFolderId,
    ),
    index('events_actor_user_id_idx').on(table.actorUserId),
    index('events_target_user_id_idx').on(table.targetLocationFolderId),
    index('events_created_at_idx').on(table.createdAt),
    index('events_emitter_id_idx').on(table.emitterId),
    // Composite indexes backing app-partitioned and type-partitioned
    // activity time-series (emitter/identifier filter + created_at range).
    index('events_emitter_created_at_idx').on(table.emitterId, table.createdAt),
    index('events_identifier_created_at_idx').on(
      table.eventIdentifier,
      table.createdAt,
    ),
    index('events_folder_created_at_idx').on(
      table.targetLocationFolderId,
      table.createdAt,
    ),
    index('events_target_object_key_idx').on(table.targetLocationObjectKey),
    index('events_aggregation_key_idx').on(table.aggregationKey),
    index('events_aggregation_handled_at_idx').on(table.aggregationHandledAt),
  ],
)

export type Event = typeof eventsTable.$inferSelect
export type NewEvent = typeof eventsTable.$inferInsert
