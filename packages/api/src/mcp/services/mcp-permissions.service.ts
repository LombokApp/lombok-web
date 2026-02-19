import { Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { OrmService } from 'src/orm/orm.service'

import { mcpFolderSettingsTable } from '../entities/mcp-folder-settings.entity'
import { mcpUserSettingsTable } from '../entities/mcp-user-settings.entity'

export interface EffectivePermissions {
  canRead: boolean
  canWrite: boolean
  canDelete: boolean
  canMove: boolean
}

@Injectable()
export class McpPermissionsService {
  constructor(private readonly ormService: OrmService) {}

  async resolveEffectivePermissions(
    userId: string,
    folderId: string,
  ): Promise<EffectivePermissions> {
    // First check folder-level settings — they fully override user-level
    const folderSettings =
      await this.ormService.db.query.mcpFolderSettingsTable.findFirst({
        where: and(
          eq(mcpFolderSettingsTable.userId, userId),
          eq(mcpFolderSettingsTable.folderId, folderId),
        ),
      })

    if (folderSettings) {
      return {
        canRead: folderSettings.canRead ?? true,
        canWrite: folderSettings.canWrite ?? true,
        canDelete: folderSettings.canDelete ?? true,
        canMove: folderSettings.canMove ?? true,
      }
    }

    // Fall back to user-level settings
    const userSettings =
      await this.ormService.db.query.mcpUserSettingsTable.findFirst({
        where: eq(mcpUserSettingsTable.userId, userId),
      })

    if (userSettings) {
      return {
        canRead: userSettings.canRead ?? true,
        canWrite: userSettings.canWrite ?? true,
        canDelete: userSettings.canDelete ?? true,
        canMove: userSettings.canMove ?? true,
      }
    }

    // No settings at all — default: everything allowed
    return {
      canRead: true,
      canWrite: true,
      canDelete: true,
      canMove: true,
    }
  }
}
