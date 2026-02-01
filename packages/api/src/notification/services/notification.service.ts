import { Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import type { Event } from 'src/event/entities/event.entity'
import { OrmService } from 'src/orm/orm.service'

import {
  type NewNotification,
  type Notification,
  notificationsTable,
} from '../entities/notification.entity'
import {
  buildNotificationBody,
  buildNotificationPath,
  buildNotificationTitle,
} from '../util/notification-content.util'

@Injectable()
export class NotificationService {
  constructor(private readonly ormService: OrmService) {}

  async createNotificationFromEvents(
    events: Event[],
    aggregationKey: string,
  ): Promise<Notification> {
    if (events.length === 0) {
      throw new Error('Cannot create notification from empty events array')
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const firstEvent = events[0]!
    const eventIds = events.map((e) => e.id)

    const newNotification: NewNotification = {
      eventIdentifier: firstEvent.eventIdentifier,
      emitterIdentifier: firstEvent.emitterIdentifier,
      aggregationKey,
      targetLocationFolderId: firstEvent.targetLocationFolderId,
      targetLocationObjectKey: firstEvent.targetLocationObjectKey,
      targetUserId: firstEvent.targetUserId,
      eventIds,
      title: buildNotificationTitle(firstEvent, events),
      body: buildNotificationBody(firstEvent, events),
      path: buildNotificationPath(firstEvent),
      createdAt: new Date(),
    }

    const [notification] = await this.ormService.db
      .insert(notificationsTable)
      .values(newNotification)
      .returning()

    if (!notification) {
      throw new Error('Failed to create notification')
    }

    return notification
  }

  async getNotificationById(
    notificationId: string,
  ): Promise<Notification | undefined> {
    return this.ormService.db.query.notificationsTable.findFirst({
      where: eq(notificationsTable.id, notificationId),
    })
  }
}
