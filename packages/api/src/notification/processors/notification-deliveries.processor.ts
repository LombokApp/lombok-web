import { CORE_IDENTIFIER, UserPushMessage } from '@lombokapp/types'
import { Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { eventsTable } from 'src/event/entities/event.entity'
import { OrmService } from 'src/orm/orm.service'
import { getUtcTimestampBucket } from 'src/shared/utils/timestamp.util'
import { UserSocketService } from 'src/socket/user/user-socket.service'
import { BaseCoreTaskProcessor } from 'src/task/base.processor'
import { type NewTask, tasksTable } from 'src/task/entities/task.entity'
import { CoreTaskName } from 'src/task/task.constants'
import { withTaskIdempotencyKey } from 'src/task/util/task-idempotency-key.util'

import { transformNotificationToDTO } from '../dto/transforms/notification.transforms'
import { notificationsTable } from '../entities/notification.entity'
import { NotificationDeliveryService } from '../services/notification-delivery.service'
import { NotificationRecipientService } from '../services/notification-recipient.service'
import { NotificationSettingsService } from '../services/notification-settings.service'

@Injectable()
export class NotificationDeliveriesProcessor extends BaseCoreTaskProcessor<CoreTaskName.BuildNotificationDeliveries> {
  constructor(
    private readonly ormService: OrmService,
    private readonly notificationRecipientService: NotificationRecipientService,
    private readonly notificationSettingsService: NotificationSettingsService,
    private readonly notificationDeliveryService: NotificationDeliveryService,
    private readonly userSocketService: UserSocketService,
  ) {
    super(CoreTaskName.BuildNotificationDeliveries, async (task) => {
      const { notificationId } = task.data

      // Load notification record
      const notification =
        await this.ormService.db.query.notificationsTable.findFirst({
          where: eq(notificationsTable.id, notificationId),
        })

      if (!notification) {
        throw new Error(`Notification not found: ${notificationId}`)
      }

      // Determine actor (user who performed the action) from event data
      let actorUserId: string | null = null
      if (notification.eventIds[0]) {
        const firstEvent = await this.ormService.db.query.eventsTable.findFirst(
          {
            where: eq(eventsTable.id, notification.eventIds[0]),
          },
        )

        if (firstEvent) {
          const eventData = firstEvent.data as { actorId?: string } | undefined
          actorUserId = eventData?.actorId ?? null
        }
      }

      // Determine relevant users
      const relevantUserIds =
        await this.notificationRecipientService.getRelevantUsers(notification)

      // Track if any emails were queued
      let hasEmailDeliveries = false

      // For each relevant user, create deliveries based on settings
      for (const userId of relevantUserIds) {
        // Resolve settings for this user and event type
        const settings = await this.notificationSettingsService.resolveSettings(
          userId,
          notification.eventIdentifier,
          notification.emitterIdentifier,
          notification.targetLocationFolderId,
        )

        // Create delivery for user (one row per notification+user)
        // Web is always enabled
        await this.notificationDeliveryService.upsertDelivery(
          notificationId,
          userId,
          {
            email: settings.email,
            mobile: settings.mobile,
          },
        )

        if (settings.email) {
          hasEmailDeliveries = true
        }

        // Emit real-time notification to user's socket room (skip for actor's own actions)
        if (actorUserId !== userId) {
          const notificationDTO = transformNotificationToDTO({
            ...notification,
            readAt: null,
          })
          this.userSocketService.sendToUserRoom(
            userId,
            UserPushMessage.NOTIFICATION_DELIVERED,
            { notification: notificationDTO },
          )
        }
      }

      // If any email deliveries were created, queue the email task
      if (hasEmailDeliveries) {
        const now = new Date()
        const delayMs = 2000 // 2 second delay to allow batching
        const dontStartBefore = new Date(now.getTime() + delayMs)
        const timestampBucket = getUtcTimestampBucket(
          5, // 5 second buckets for batching emails from multiple notifications
          'seconds',
          dontStartBefore,
        )

        const emailTask: NewTask = withTaskIdempotencyKey({
          id: crypto.randomUUID(),
          ownerIdentifier: CORE_IDENTIFIER,
          taskIdentifier: CoreTaskName.SendNotificationEmails,
          invocation: {
            kind: 'system_action',
            invokeContext: {
              idempotencyData: {
                bucketIndex: timestampBucket.bucketIndex,
              },
            },
          },
          taskDescription: 'Send batched notification emails',
          data: { bucketIndex: timestampBucket.bucketIndex },
          dontStartBefore,
          createdAt: now,
          updatedAt: now,
          handlerType: 'core',
        })

        await this.ormService.db.insert(tasksTable).values(emailTask)
      }
    })
  }
}
