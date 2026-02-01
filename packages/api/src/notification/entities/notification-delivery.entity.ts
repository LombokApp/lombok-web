import type { JsonSerializableObject } from '@lombokapp/types'
import { relations } from 'drizzle-orm'
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { jsonbBase64 } from 'src/orm/util/json-base64-type'
import { usersTable } from 'src/users/entities/user.entity'

import { notificationsTable } from './notification.entity'

export interface NotificationDeliveryChannelError {
  code: string
  message: string
  details?: JsonSerializableObject
}

export const notificationDeliveriesTable = pgTable(
  'notification_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    notificationId: uuid('notification_id')
      .notNull()
      .references(() => notificationsTable.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at'),
    // Email channel (null status = not requested)
    emailStatus: text('email_status').$type<
      'pending' | 'sent' | 'failed' | null
    >(),
    emailSentAt: timestamp('email_sent_at'),
    emailFailedAt: timestamp('email_failed_at'),
    emailError:
      jsonbBase64('email_error').$type<NotificationDeliveryChannelError>(),
    // Mobile channel (null status = not requested)
    mobileStatus: text('mobile_status').$type<
      'pending' | 'sent' | 'failed' | null
    >(),
    mobileSentAt: timestamp('mobile_sent_at'),
    mobileFailedAt: timestamp('mobile_failed_at'),
    mobileError:
      jsonbBase64('mobile_error').$type<NotificationDeliveryChannelError>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('notification_deliveries_notification_id_idx').on(
      table.notificationId,
    ),
    index('notification_deliveries_user_id_idx').on(table.userId),
    uniqueIndex('notification_deliveries_notification_user_unique').on(
      table.notificationId,
      table.userId,
    ),
  ],
)

export const notificationDeliveriesRelations = relations(
  notificationDeliveriesTable,
  ({ one }) => ({
    notification: one(notificationsTable, {
      fields: [notificationDeliveriesTable.notificationId],
      references: [notificationsTable.id],
    }),
    user: one(usersTable, {
      fields: [notificationDeliveriesTable.userId],
      references: [usersTable.id],
    }),
  }),
)

export type NotificationDelivery =
  typeof notificationDeliveriesTable.$inferSelect
export type NewNotificationDelivery =
  typeof notificationDeliveriesTable.$inferInsert
