import { relations } from 'drizzle-orm'
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { usersTable } from 'src/users/entities/user.entity'

import { notificationDeliveriesTable } from './notification-delivery.entity'

export const notificationsTable = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventIdentifier: text('event_identifier').notNull(),
    emitterIdentifier: text('emitter_identifier').notNull(),
    aggregationKey: text('aggregation_key').notNull(),
    targetLocationFolderId: uuid('target_location_folder_id').references(
      () => foldersTable.id,
    ),
    targetLocationObjectKey: text('target_location_object_key'),
    targetUserId: uuid('target_user_id').references(() => usersTable.id),
    eventIds: uuid('event_ids').array().notNull(),
    title: text('title').notNull(),
    body: text('body'),
    image: text('image'),
    path: text('path'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('notifications_user_id_created_at_idx').on(
      table.targetUserId,
      table.createdAt,
    ),
    index('notifications_aggregation_key_idx').on(table.aggregationKey),
    index('notifications_target_location_folder_id_idx').on(
      table.targetLocationFolderId,
    ),
    index('notifications_emitter_identifier_idx').on(table.emitterIdentifier),
  ],
)

export const notificationsRelations = relations(
  notificationsTable,
  ({ one }) => ({
    targetUser: one(usersTable, {
      fields: [notificationsTable.targetUserId],
      references: [usersTable.id],
    }),
    targetLocationFolder: one(foldersTable, {
      fields: [notificationsTable.targetLocationFolderId],
      references: [foldersTable.id],
    }),
    deliveries: one(notificationDeliveriesTable),
  }),
)

export type Notification = typeof notificationsTable.$inferSelect
export type NewNotification = typeof notificationsTable.$inferInsert
