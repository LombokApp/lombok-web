import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  and,
  count,
  desc,
  eq,
  gt,
  isNull,
  lt,
  lte,
  not,
  or,
  SQL,
} from 'drizzle-orm'
import { OrmService } from 'src/orm/orm.service'

import { notificationDeliveriesTable } from '../entities'
import {
  type Notification,
  notificationsTable,
} from '../entities/notification.entity'

export interface NotificationListQuery {
  cursor?: string
  limit?: number
  sort?: 'createdAt-asc' | 'createdAt-desc'
  read?: boolean
  eventIdentifier?: string
  emitterIdentifier?: string
}

export interface NotificationListResult {
  notifications: { notification: Notification; readAt: Date | null }[]
  nextCursor?: string
}

@Injectable()
export class NotificationQueryService {
  constructor(private readonly ormService: OrmService) {}

  /**
   * List notifications for a user with pagination, filtering, and sorting.
   */
  async listNotifications(
    userId: string,
    query: NotificationListQuery,
  ): Promise<NotificationListResult> {
    const limit = Math.min(query.limit ?? 25, 100)
    const conditions: (SQL | undefined)[] = [
      eq(notificationDeliveriesTable.userId, userId),
    ]

    // Filter by read status
    if (query.read === true) {
      conditions.push(not(isNull(notificationDeliveriesTable.readAt)))
    } else if (query.read === false) {
      conditions.push(isNull(notificationDeliveriesTable.readAt))
    }

    // Filter by event identifier and emitter identifier
    if (query.eventIdentifier) {
      conditions.push(
        eq(notificationsTable.eventIdentifier, query.eventIdentifier),
      )
    }
    if (query.emitterIdentifier) {
      conditions.push(
        eq(notificationsTable.emitterIdentifier, query.emitterIdentifier),
      )
    }

    // Cursor-based pagination (format: "timestamp:uuid")
    if (query.cursor) {
      const [cursorTimestamp, cursorId] = query.cursor.split(':')
      if (!cursorTimestamp || !cursorId) {
        throw new BadRequestException('Invalid cursor format')
      }
      const cursorDate = new Date(cursorTimestamp)
      if (query.sort === 'createdAt-asc') {
        conditions.push(
          or(
            gt(notificationsTable.createdAt, cursorDate),
            and(
              eq(notificationsTable.createdAt, cursorDate),
              gt(notificationsTable.id, cursorId),
            ),
          ),
        )
      } else {
        conditions.push(
          or(
            lte(notificationsTable.createdAt, cursorDate),
            and(
              eq(notificationsTable.createdAt, cursorDate),
              lt(notificationsTable.id, cursorId),
            ),
          ),
        )
      }
    }

    const orderBy =
      query.sort === 'createdAt-asc'
        ? [notificationsTable.createdAt, notificationsTable.id]
        : [desc(notificationsTable.createdAt), desc(notificationsTable.id)]

    // console.log(
    //   'query:',
    //   this.ormService.db
    //     .select({
    //       notification: notificationsTable,
    //       readAt: notificationDeliveriesTable.readAt,
    //     })
    //     .from(notificationDeliveriesTable)
    //     .innerJoin(
    //       notificationsTable,
    //       eq(notificationDeliveriesTable.notificationId, notificationsTable.id),
    //     )
    //     .where(and(...conditions.filter((c) => !!c)))
    //     .orderBy(...orderBy)
    //     .limit(limit + 1)
    //     .toSQL(),
    // )
    const notificationsResult = await this.ormService.db
      .select({
        notification: notificationsTable,
        readAt: notificationDeliveriesTable.readAt,
      })
      .from(notificationDeliveriesTable)
      .innerJoin(
        notificationsTable,
        eq(notificationDeliveriesTable.notificationId, notificationsTable.id),
      )
      .where(and(...conditions.filter((c) => !!c)))
      .orderBy(...orderBy)
      .limit(limit + 1) // Fetch one extra to determine if there's a next page

    const notifications = notificationsResult.map((row) => ({
      notification: row.notification,
      readAt: row.readAt ?? null,
    }))

    const hasNextPage = notifications.length > limit
    const resultNotifications = hasNextPage
      ? notifications.slice(0, limit)
      : notifications

    const lastRow = resultNotifications[resultNotifications.length - 1]
    const nextCursor =
      hasNextPage && lastRow
        ? `${lastRow.notification.createdAt.toISOString()}:${lastRow.notification.id}`
        : undefined

    return {
      notifications: resultNotifications,
      nextCursor,
    }
  }

  /**
   * Get a single notification by ID (must belong to user).
   */
  async getNotification(
    userId: string,
    notificationId: string,
  ): Promise<Notification> {
    const notification =
      await this.ormService.db.query.notificationsTable.findFirst({
        where: and(
          eq(notificationsTable.id, notificationId),
          eq(notificationsTable.targetUserId, userId),
        ),
      })

    if (!notification) {
      throw new NotFoundException('Notification not found')
    }

    return notification
  }

  /**
   * Mark a notification as read.
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const now = new Date()

    const result = await this.ormService.db
      .update(notificationDeliveriesTable)
      .set({ readAt: now })
      .where(
        and(
          eq(notificationDeliveriesTable.notificationId, notificationId),
          eq(notificationDeliveriesTable.userId, userId),
        ),
      )
      .returning()

    if (result.length === 0) {
      throw new NotFoundException('Notification not found')
    }
  }

  /**
   * Get count of unread notifications for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    const [result] = await this.ormService.db
      .select({ count: count() })
      .from(notificationsTable)
      .innerJoin(
        notificationDeliveriesTable,
        eq(notificationDeliveriesTable.notificationId, notificationsTable.id),
      )
      .where(
        and(
          eq(notificationDeliveriesTable.userId, userId),
          isNull(notificationDeliveriesTable.readAt),
        ),
      )

    return result?.count ?? 0
  }
}
