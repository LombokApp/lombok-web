import type { Notification } from '../../entities/notification.entity'
import type { NotificationDTO } from '../notification.dto'

export function transformNotificationToDTO(
  notification: Notification & {
    readAt: Date | null
  },
): NotificationDTO {
  return {
    id: notification.id,
    eventIdentifier: notification.eventIdentifier,
    emitterIdentifier: notification.emitterIdentifier,
    aggregationKey: notification.aggregationKey,
    targetLocationFolderId: notification.targetLocationFolderId,
    targetLocationObjectKey: notification.targetLocationObjectKey,
    targetUserId: notification.targetUserId,
    eventIds: notification.eventIds,
    title: notification.title,
    body: notification.body,
    image: notification.image,
    path: notification.path,
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt?.toISOString() ?? null,
  }
}
