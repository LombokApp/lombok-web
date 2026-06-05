import type { RegisterableTriggerConfig } from '@lombokapp/types'
import { sql } from 'drizzle-orm'
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { appsTable } from './app.entity'

/**
 * Triggers an app registers at runtime via the worker socket
 * (REGISTER_APP_TRIGGER), parallel to the config.json-declared triggers in
 * `apps.config.triggers`. Both sources are read by EventService on every
 * event emit and schedule tick.
 *
 * The trigger shape is stored as a single `definition` jsonb (same shape as a
 * config.json triggers[] entry). Lookup hot paths use Postgres expression
 * indexes on JSONB fields so there's no denormalized column to keep in sync.
 *
 * ON DELETE CASCADE lets AppService.uninstallApp's single DELETE of the apps
 * row clean these up without an extra step.
 */
export const appRuntimeTriggersTable = pgTable(
  'app_runtime_triggers',
  {
    id: uuid('id').primaryKey(),
    appId: text('app_id')
      .references(() => appsTable.id, { onDelete: 'cascade' })
      .notNull(),
    definition: jsonb('definition')
      .$type<RegisterableTriggerConfig>()
      .notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('app_runtime_triggers_app_id_idx').on(table.appId),
    // Event-emit hot path: `WHERE definition->>'eventIdentifier' = ?` resolves
    // via this index (the same expression is required at query time for
    // Postgres to pick it up).
    index('app_runtime_triggers_event_identifier_idx')
      .on(sql`(${table.definition} ->> 'eventIdentifier')`)
      .where(sql`(${table.definition} ->> 'kind') = 'event'`),
    // App-supplied triggerKey is unique per app across both kinds when set.
    // Schedules require it; events opt in. NULL keys (events that didn't
    // supply one) are excluded so multiple anonymous event rows coexist.
    uniqueIndex('app_runtime_triggers_app_trigger_key_unique')
      .on(table.appId, sql`(${table.definition} ->> 'triggerKey')`)
      .where(sql`(${table.definition} ->> 'triggerKey') IS NOT NULL`),
  ],
)

export type AppRuntimeTrigger = typeof appRuntimeTriggersTable.$inferSelect
export type NewAppRuntimeTrigger = typeof appRuntimeTriggersTable.$inferInsert
