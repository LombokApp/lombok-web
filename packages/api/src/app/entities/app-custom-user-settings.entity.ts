import { relations } from 'drizzle-orm'
import {
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { usersTable } from 'src/users/entities/user.entity'

import { appsTable } from './app.entity'

export const appCustomUserSettingsTable = pgTable(
  'app_custom_user_settings',
  {
    userId: uuid('user_id')
      .references(() => usersTable.id, { onDelete: 'cascade' })
      .notNull(),
    appIdentifier: text('app_identifier')
      .references(() => appsTable.identifier, { onDelete: 'cascade' })
      .notNull(),
    key: text('key').notNull(),
    value: jsonb('value').$type<unknown>().notNull(),
    createdAt: timestamp('created_at').notNull(),
    updatedAt: timestamp('updated_at').notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.appIdentifier, table.key],
    }),
    index('app_custom_user_settings_user_app_idx').on(
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

export type AppCustomUserSetting =
  typeof appCustomUserSettingsTable.$inferSelect
export type NewAppCustomUserSetting =
  typeof appCustomUserSettingsTable.$inferInsert
