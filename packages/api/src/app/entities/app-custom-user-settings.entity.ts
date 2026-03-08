import { relations } from 'drizzle-orm'
import {
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { usersTable } from 'src/users/entities/user.entity'

import { appsTable } from './app.entity'

export const appCustomUserSettingsTable = pgTable(
  'app_custom_user_settings',
  {
    userId: uuid('user_id')
      .references(() => usersTable.id)
      .notNull(),
    appIdentifier: text('app_identifier')
      .references(() => appsTable.identifier)
      .notNull(),
    values: jsonb('values')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('app_custom_user_settings_user_app_unique').on(
      table.userId,
      table.appIdentifier,
    ),
  ],
)

export const appCustomUserSettingsRelations = relations(
  appCustomUserSettingsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [appCustomUserSettingsTable.userId],
      references: [usersTable.id],
    }),
    app: one(appsTable, {
      fields: [appCustomUserSettingsTable.appIdentifier],
      references: [appsTable.identifier],
    }),
  }),
)

export type AppCustomUserSettings =
  typeof appCustomUserSettingsTable.$inferSelect
export type NewAppCustomUserSettings =
  typeof appCustomUserSettingsTable.$inferInsert
