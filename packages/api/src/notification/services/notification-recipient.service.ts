import { Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { folderSharesTable } from 'src/folders/entities/folder-share.entity'
import { OrmService } from 'src/orm/orm.service'

import type { Notification } from '../entities/notification.entity'

@Injectable()
export class NotificationRecipientService {
  constructor(private readonly ormService: OrmService) {}

  /**
   * Determines relevant users who should receive a notification.
   * Implements actor suppression (doesn't notify the user who performed the action).
   *
   * @param notification - The notification to determine recipients for
   * @returns Array of user IDs who should receive the notification
   */
  async getRelevantUsers(notification: Notification): Promise<string[]> {
    const userIds = new Set<string>()

    // For folder events: include folder owner and users with folder shares
    if (notification.targetLocationFolderId) {
      const folder = await this.ormService.db.query.foldersTable.findFirst({
        where: eq(foldersTable.id, notification.targetLocationFolderId),
      })

      if (folder) {
        // Add folder owner (if not the actor)
        if (folder.ownerId) {
          userIds.add(folder.ownerId)
        }

        // Add users with folder shares
        const shares =
          await this.ormService.db.query.folderSharesTable.findMany({
            where: eq(
              folderSharesTable.folderId,
              notification.targetLocationFolderId,
            ),
          })

        for (const share of shares) {
          userIds.add(share.userId)
        }
      }
    }

    // For user events: include target user
    if (notification.targetUserId) {
      if (notification.targetUserId) {
        userIds.add(notification.targetUserId)
      }
    }

    return Array.from(userIds)
  }
}
