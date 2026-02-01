import { CORE_IDENTIFIER } from '@lombokapp/types'
import { Injectable } from '@nestjs/common'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import { eventsTable } from 'src/event/entities/event.entity'
import { OrmService } from 'src/orm/orm.service'
import { getUtcTimestampBucket } from 'src/shared/utils/timestamp.util'
import { BaseCoreTaskProcessor } from 'src/task/base.processor'
import { type NewTask, tasksTable } from 'src/task/entities/task.entity'
import { CoreTaskName } from 'src/task/task.constants'
import { withTaskIdempotencyKey } from 'src/task/util/task-idempotency-key.util'

import { notificationsTable } from '../entities/notification.entity'
import { NotificationBatchingService } from '../services/notification-batching.service'
import {
  buildNotificationBody,
  buildNotificationPath,
  buildNotificationTitle,
} from '../util/notification-content.util'

@Injectable()
export class CreateEventNotificationsProcessor extends BaseCoreTaskProcessor<CoreTaskName.CreateEventNotifications> {
  constructor(
    private readonly ormService: OrmService,
    private readonly notificationBatchingService: NotificationBatchingService,
  ) {
    super(CoreTaskName.CreateEventNotifications, async (task) => {
      const { aggregationKey } = task.data

      // Get unhandled events for this aggregation key
      const [unhandledEvent] =
        await this.notificationBatchingService.getUnhandledEvents(
          aggregationKey,
        )

      if (!unhandledEvent) {
        // No unhandled events, exit
        return
      }

      // Extract event type from first event (all events in aggregation key have same eventType)

      // Check batching config
      const batchingDecision =
        await this.notificationBatchingService.shouldFlushEvents(
          aggregationKey,
          {
            eventIdentifier: unhandledEvent.eventIdentifier,
            emitterIdentifier: unhandledEvent.emitterIdentifier,
          },
        )

      if (!batchingDecision.shouldFlush) {
        // Not ready to flush, requeue if delay specified
        if (batchingDecision.requeueDelayMs) {
          // Requeue the same task with delay
          const now = new Date()
          const dontStartBefore = new Date(
            now.getTime() + batchingDecision.requeueDelayMs,
          )

          const requeueTask: NewTask = withTaskIdempotencyKey({
            id: crypto.randomUUID(),
            ownerIdentifier: CORE_IDENTIFIER,
            taskIdentifier: CoreTaskName.CreateEventNotifications,
            invocation: {
              kind: 'user_action',
              invokeContext: {
                userId: 'system',
                requestId: crypto.randomUUID(),
              },
            },
            taskDescription: 'Create event notifications',
            data: { aggregationKey },
            dontStartBefore,
            createdAt: now,
            updatedAt: now,
            handlerType: 'core',
          })

          await this.ormService.db.insert(tasksTable).values(requeueTask)
        }
        return
      }

      // Flush: create notification and mark events as handled (in transaction)
      await this.ormService.db.transaction(async (tx) => {
        // Re-read unhandled events to ensure fresh data
        const eventsToProcess = await tx
          .select()
          .from(eventsTable)
          .where(
            and(
              eq(eventsTable.aggregationKey, aggregationKey),
              isNull(eventsTable.aggregationHandledAt),
            ),
          )

        if (eventsToProcess.length === 0) {
          // Events already handled by another task, exit
          return
        }

        const eventIds = eventsToProcess.map((e) => e.id)
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const firstEvent = eventsToProcess[0]!
        const now = new Date()

        // Create notification (need to insert directly in transaction)

        const [notification] = await tx
          .insert(notificationsTable)
          .values({
            eventIdentifier: firstEvent.eventIdentifier,
            emitterIdentifier: firstEvent.emitterIdentifier,
            aggregationKey,
            targetLocationFolderId: firstEvent.targetLocationFolderId,
            targetLocationObjectKey: firstEvent.targetLocationObjectKey,
            targetUserId: firstEvent.targetUserId,
            eventIds,
            title: buildNotificationTitle(firstEvent, eventsToProcess),
            body: buildNotificationBody(firstEvent, eventsToProcess),
            path: buildNotificationPath(firstEvent),
            createdAt: now,
          })
          .returning()

        if (!notification) {
          throw new Error('Failed to create notification')
        }

        // Mark events as handled
        const updateResult = await tx
          .update(eventsTable)
          .set({
            aggregationHandledAt: now,
          })
          .where(
            and(
              inArray(eventsTable.id, eventIds),
              isNull(eventsTable.aggregationHandledAt),
            ),
          )
          .returning()

        // Idempotency check: verify expected number of events were updated
        if (updateResult.length !== eventIds.length) {
          throw new Error(
            `Expected to update ${eventIds.length} events but updated ${updateResult.length}. Another task may have processed some events.`,
          )
        }

        // Queue NotificationDeliveriesProcessor task
        const delayMs = 2000
        const timestampBucket = getUtcTimestampBucket(
          delayMs / 1000,
          'seconds',
          new Date(now.getTime() + delayMs),
        )

        const deliveryTask: NewTask = withTaskIdempotencyKey({
          id: crypto.randomUUID(),
          ownerIdentifier: CORE_IDENTIFIER,
          taskIdentifier: CoreTaskName.BuildNotificationDeliveries,
          invocation: {
            kind: 'system_action',
            invokeContext: {
              idempotencyData: {
                aggregationKey,
                bucketIndex: timestampBucket.bucketIndex,
              },
            },
          },
          taskDescription: 'Create notification deliveries',
          data: { notificationId: notification.id },
          createdAt: now,
          updatedAt: now,
          handlerType: 'core',
        })

        await tx.insert(tasksTable).values(deliveryTask)
      })
    })
  }
}
