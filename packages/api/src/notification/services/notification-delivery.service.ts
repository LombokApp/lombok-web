import { Injectable } from '@nestjs/common'
import { eq, sql } from 'drizzle-orm'
import { OrmService } from 'src/orm/orm.service'

import {
  type NewNotificationDelivery,
  notificationDeliveriesTable,
  type NotificationDelivery,
} from '../entities/notification-delivery.entity'

export interface UpsertDeliveryOptions {
  email?: boolean
  mobile?: boolean
}

@Injectable()
export class NotificationDeliveryService {
  constructor(private readonly ormService: OrmService) {}

  /**
   * Creates or updates a delivery record for a notification and user.
   * One row per (notification_id, user_id). Web delivery is implicit when the row exists.
   * Email and mobile channels are optional; status is 'pending' when requested, null when not.
   */
  async upsertDelivery(
    notificationId: string,
    userId: string,
    options: UpsertDeliveryOptions = {},
  ): Promise<NotificationDelivery> {
    const conflictSet: Record<string, unknown> = {}
    if (options.email) {
      conflictSet.emailStatus = sql`COALESCE(${notificationDeliveriesTable.emailStatus}, 'pending')`
    }
    if (options.mobile) {
      conflictSet.mobileStatus = sql`COALESCE(${notificationDeliveriesTable.mobileStatus}, 'pending')`
    }

    const [result] = await this.ormService.db
      .insert(notificationDeliveriesTable)
      .values({
        notificationId,
        userId,
        emailStatus: options.email ? 'pending' : null,
        mobileStatus: options.mobile ? 'pending' : null,
      })
      .onConflictDoUpdate({
        target: [
          notificationDeliveriesTable.notificationId,
          notificationDeliveriesTable.userId,
        ],
        set:
          Object.keys(conflictSet).length > 0
            ? (conflictSet as Partial<NewNotificationDelivery>)
            : { notificationId: notificationDeliveriesTable.notificationId },
      })
      .returning()

    if (!result) {
      throw new Error('Failed to upsert notification delivery')
    }
    return result
  }

  /**
   * Gets delivery records for a notification.
   */
  async getDeliveriesForNotification(
    notificationId: string,
  ): Promise<NotificationDelivery[]> {
    return this.ormService.db.query.notificationDeliveriesTable.findMany({
      where: eq(notificationDeliveriesTable.notificationId, notificationId),
    })
  }
}
