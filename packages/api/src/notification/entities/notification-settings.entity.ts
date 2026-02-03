import { relations } from 'drizzle-orm'
import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { usersTable } from 'src/users/entities/user.entity'

export const notificationSettingsTable = pgTable(
  'notification_settings',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    eventIdentifier: text('event_identifier').notNull(),
    emitterIdentifier: text('emitter_identifier').notNull(),
    channel: text('channel').notNull().$type<'web' | 'email' | 'mobile'>(),
    enabled: boolean('enabled').notNull(),
    folderId: uuid('folder_id').references(() => foldersTable.id, {
      onDelete: 'cascade',
    }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('notification_settings_user_id_emitter_identifier_idx').on(
      table.userId,
      table.emitterIdentifier,
      table.eventIdentifier,
    ),
    index('notification_settings_emitter_identifier_idx').on(
      table.emitterIdentifier,
    ),
    index('notification_settings_folder_id_idx').on(table.folderId),
    uniqueIndex(
      'notification_settings_user_emitter_identifier_channel_unique',
    ).on(
      table.userId,
      table.emitterIdentifier,
      table.eventIdentifier,
      table.channel,
      // Use COALESCE for null folderId in unique constraint
      // Note: Drizzle doesn't support COALESCE in uniqueIndex directly,
      // so we'll handle this in the migration SQL
    ),
  ],
)

export const notificationSettingsRelations = relations(
  notificationSettingsTable,
  ({ one }) => ({
    user: one(usersTable, {
      fields: [notificationSettingsTable.userId],
      references: [usersTable.id],
    }),
    folder: one(foldersTable, {
      fields: [notificationSettingsTable.folderId],
      references: [foldersTable.id],
    }),
  }),
)

export type NotificationSetting = typeof notificationSettingsTable.$inferSelect
export type NewNotificationSetting =
  typeof notificationSettingsTable.$inferInsert
