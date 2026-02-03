import { Injectable } from '@nestjs/common'
import { and, eq, isNull } from 'drizzle-orm'
import { OrmService } from 'src/orm/orm.service'

import {
  type NotificationSetting,
  notificationSettingsTable,
} from '../entities/notification-settings.entity'

export interface ChannelSettings {
  web: boolean
  email: boolean
  mobile: boolean
}

@Injectable()
export class NotificationSettingsService {
  constructor(private readonly ormService: OrmService) {}

  /**
   * Resolves notification settings for a user, event type, and optional folder.
   * Resolution order: folder-specific > global > defaults
   * Defaults: web=true, email=false, mobile=false
   */
  async resolveSettings(
    userId: string,
    eventIdentifier: string,
    emitterIdentifier: string,
    folderId: string | null,
  ): Promise<ChannelSettings> {
    const defaults: ChannelSettings = {
      web: true,
      email: false,
      mobile: false,
    }

    // Load global settings (folderId = null)
    const globalSettings =
      await this.ormService.db.query.notificationSettingsTable.findMany({
        where: and(
          eq(notificationSettingsTable.userId, userId),
          eq(notificationSettingsTable.eventIdentifier, eventIdentifier),
          eq(notificationSettingsTable.emitterIdentifier, emitterIdentifier),
          isNull(notificationSettingsTable.folderId),
        ),
      })

    // Build settings from global (start with defaults, then override with global)
    const resolved: ChannelSettings = { ...defaults }
    for (const setting of globalSettings) {
      if (setting.channel === 'web') {
        resolved.web = setting.enabled
      } else if (setting.channel === 'email') {
        resolved.email = setting.enabled
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      } else if (setting.channel === 'mobile') {
        resolved.mobile = setting.enabled
      }
    }

    // If folderId provided, load folder-specific overrides
    if (folderId) {
      const folderSettings =
        await this.ormService.db.query.notificationSettingsTable.findMany({
          where: and(
            eq(notificationSettingsTable.userId, userId),
            eq(notificationSettingsTable.eventIdentifier, eventIdentifier),
            eq(notificationSettingsTable.emitterIdentifier, emitterIdentifier),
            eq(notificationSettingsTable.folderId, folderId),
          ),
        })

      // Override with folder-specific settings
      for (const setting of folderSettings) {
        if (setting.channel === 'web') {
          resolved.web = setting.enabled
        } else if (setting.channel === 'email') {
          resolved.email = setting.enabled
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        } else if (setting.channel === 'mobile') {
          resolved.mobile = setting.enabled
        }
      }
    }

    return resolved
  }

  /**
   * Get user's global notification settings for an event type.
   */
  async getUserSettings(
    userId: string,
    eventIdentifier?: string,
    emitterIdentifier?: string,
  ): Promise<NotificationSetting[]> {
    const where =
      eventIdentifier && emitterIdentifier
        ? and(
            eq(notificationSettingsTable.userId, userId),
            eq(notificationSettingsTable.eventIdentifier, eventIdentifier),
            eq(notificationSettingsTable.emitterIdentifier, emitterIdentifier),
            isNull(notificationSettingsTable.folderId),
          )
        : and(
            eq(notificationSettingsTable.userId, userId),
            isNull(notificationSettingsTable.folderId),
          )

    return this.ormService.db.query.notificationSettingsTable.findMany({
      where,
    })
  }

  /**
   * Update user's global notification settings.
   */
  async updateUserSettings(
    userId: string,
    settings: {
      eventIdentifier: string
      emitterIdentifier: string
      channel: 'web' | 'email' | 'mobile'
      enabled: boolean
    }[],
  ): Promise<void> {
    const now = new Date()

    for (const setting of settings) {
      // Check if setting exists
      const existing =
        await this.ormService.db.query.notificationSettingsTable.findFirst({
          where: and(
            eq(notificationSettingsTable.userId, userId),
            eq(
              notificationSettingsTable.eventIdentifier,
              setting.eventIdentifier,
            ),
            eq(
              notificationSettingsTable.emitterIdentifier,
              setting.emitterIdentifier,
            ),
            eq(notificationSettingsTable.channel, setting.channel),
            isNull(notificationSettingsTable.folderId),
          ),
        })

      if (existing) {
        // Update existing
        await this.ormService.db
          .update(notificationSettingsTable)
          .set({
            enabled: setting.enabled,
            updatedAt: now,
          })
          .where(
            and(
              eq(notificationSettingsTable.userId, userId),
              eq(
                notificationSettingsTable.eventIdentifier,
                setting.eventIdentifier,
              ),
              eq(
                notificationSettingsTable.emitterIdentifier,
                setting.emitterIdentifier,
              ),
              eq(notificationSettingsTable.channel, setting.channel),
              isNull(notificationSettingsTable.folderId),
            ),
          )
      } else {
        // Insert new
        await this.ormService.db.insert(notificationSettingsTable).values({
          userId,
          eventIdentifier: setting.eventIdentifier,
          emitterIdentifier: setting.emitterIdentifier,
          channel: setting.channel,
          enabled: setting.enabled,
          folderId: null,
          createdAt: now,
          updatedAt: now,
        })
      }
    }
  }

  /**
   * Get folder-specific notification settings.
   */
  async getFolderSettings(
    userId: string,
    folderId: string,
    eventIdentifier?: string,
    emitterIdentifier?: string,
  ): Promise<NotificationSetting[]> {
    const where =
      eventIdentifier && emitterIdentifier
        ? and(
            eq(notificationSettingsTable.userId, userId),
            eq(notificationSettingsTable.folderId, folderId),
            eq(notificationSettingsTable.eventIdentifier, eventIdentifier),
            eq(notificationSettingsTable.emitterIdentifier, emitterIdentifier),
          )
        : and(
            eq(notificationSettingsTable.userId, userId),
            eq(notificationSettingsTable.folderId, folderId),
          )

    return this.ormService.db.query.notificationSettingsTable.findMany({
      where,
    })
  }

  /**
   * Update folder-specific notification settings.
   */
  async updateFolderSettings(
    userId: string,
    folderId: string,
    settings: {
      eventIdentifier: string
      emitterIdentifier: string
      channel: 'web' | 'email' | 'mobile'
      enabled: boolean
    }[],
  ): Promise<void> {
    const now = new Date()

    for (const setting of settings) {
      // Check if setting exists
      const existing =
        await this.ormService.db.query.notificationSettingsTable.findFirst({
          where: and(
            eq(notificationSettingsTable.userId, userId),
            eq(
              notificationSettingsTable.eventIdentifier,
              setting.eventIdentifier,
            ),
            eq(
              notificationSettingsTable.emitterIdentifier,
              setting.emitterIdentifier,
            ),
            eq(notificationSettingsTable.channel, setting.channel),
            eq(notificationSettingsTable.folderId, folderId),
          ),
        })

      if (existing) {
        // Update existing
        await this.ormService.db
          .update(notificationSettingsTable)
          .set({
            enabled: setting.enabled,
            updatedAt: now,
          })
          .where(
            and(
              eq(notificationSettingsTable.userId, userId),
              eq(
                notificationSettingsTable.eventIdentifier,
                setting.eventIdentifier,
              ),
              eq(
                notificationSettingsTable.emitterIdentifier,
                setting.emitterIdentifier,
              ),
              eq(notificationSettingsTable.channel, setting.channel),
              eq(notificationSettingsTable.folderId, folderId),
            ),
          )
      } else {
        // Insert new
        await this.ormService.db.insert(notificationSettingsTable).values({
          userId,
          eventIdentifier: setting.eventIdentifier,
          emitterIdentifier: setting.emitterIdentifier,
          channel: setting.channel,
          enabled: setting.enabled,
          folderId,
          createdAt: now,
          updatedAt: now,
        })
      }
    }
  }
}
