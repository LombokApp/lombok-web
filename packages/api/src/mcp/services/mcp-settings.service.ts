import { Injectable } from '@nestjs/common'
import { and, eq } from 'drizzle-orm'
import { OrmService } from 'src/orm/orm.service'

import type { McpFolderSettings } from '../entities/mcp-folder-settings.entity'
import { mcpFolderSettingsTable } from '../entities/mcp-folder-settings.entity'
import type { McpUserSettings } from '../entities/mcp-user-settings.entity'
import { mcpUserSettingsTable } from '../entities/mcp-user-settings.entity'

export interface McpPermissionInput {
  canRead?: boolean | null
  canWrite?: boolean | null
  canDelete?: boolean | null
  canMove?: boolean | null
}

@Injectable()
export class McpSettingsService {
  constructor(private readonly ormService: OrmService) {}

  async getUserSettings(userId: string): Promise<McpUserSettings | null> {
    const result =
      await this.ormService.db.query.mcpUserSettingsTable.findFirst({
        where: eq(mcpUserSettingsTable.userId, userId),
      })

    return result ?? null
  }

  async upsertUserSettings(
    userId: string,
    settings: McpPermissionInput,
  ): Promise<McpUserSettings> {
    const now = new Date()

    const [result] = await this.ormService.db
      .insert(mcpUserSettingsTable)
      .values({
        userId,
        canRead: settings.canRead ?? null,
        canWrite: settings.canWrite ?? null,
        canDelete: settings.canDelete ?? null,
        canMove: settings.canMove ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: mcpUserSettingsTable.userId,
        set: {
          canRead: settings.canRead ?? null,
          canWrite: settings.canWrite ?? null,
          canDelete: settings.canDelete ?? null,
          canMove: settings.canMove ?? null,
          updatedAt: now,
        },
      })
      .returning()

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return result!
  }

  async getFolderSettings(
    userId: string,
    folderId: string,
  ): Promise<McpFolderSettings | null> {
    const result =
      await this.ormService.db.query.mcpFolderSettingsTable.findFirst({
        where: and(
          eq(mcpFolderSettingsTable.userId, userId),
          eq(mcpFolderSettingsTable.folderId, folderId),
        ),
      })

    return result ?? null
  }

  async upsertFolderSettings(
    userId: string,
    folderId: string,
    settings: McpPermissionInput,
  ): Promise<McpFolderSettings> {
    const now = new Date()

    const [result] = await this.ormService.db
      .insert(mcpFolderSettingsTable)
      .values({
        folderId,
        userId,
        canRead: settings.canRead ?? null,
        canWrite: settings.canWrite ?? null,
        canDelete: settings.canDelete ?? null,
        canMove: settings.canMove ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          mcpFolderSettingsTable.folderId,
          mcpFolderSettingsTable.userId,
        ],
        set: {
          canRead: settings.canRead ?? null,
          canWrite: settings.canWrite ?? null,
          canDelete: settings.canDelete ?? null,
          canMove: settings.canMove ?? null,
          updatedAt: now,
        },
      })
      .returning()

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return result!
  }

  async deleteFolderSettings(userId: string, folderId: string): Promise<void> {
    await this.ormService.db
      .delete(mcpFolderSettingsTable)
      .where(
        and(
          eq(mcpFolderSettingsTable.userId, userId),
          eq(mcpFolderSettingsTable.folderId, folderId),
        ),
      )
  }
}
