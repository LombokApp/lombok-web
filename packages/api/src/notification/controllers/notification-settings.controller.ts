import { ZodValidationPipe } from '@anatine/zod-nestjs'
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import { FolderService } from 'src/folders/services/folder.service'
import { ApiStandardErrorResponses } from 'src/shared/decorators/api-standard-error-responses.decorator'

import {
  NotificationSettingsResponseDTO,
  NotificationSettingsUpdateDTO,
} from '../dto/notification-settings.dto'
import { NotificationSettingsService } from '../services/notification-settings.service'

@Controller('/api/v1/notifications/settings')
@ApiTags('Notifications')
@UseGuards(AuthGuard)
@UsePipes(ZodValidationPipe)
@ApiBearerAuth()
@ApiStandardErrorResponses()
export class NotificationSettingsController {
  constructor(
    private readonly notificationSettingsService: NotificationSettingsService,
    private readonly folderService: FolderService,
  ) {}

  /**
   * Get user's global notification settings.
   */
  @Get()
  async getUserSettings(
    @Req() req: express.Request,
  ): Promise<NotificationSettingsResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const settings = await this.notificationSettingsService.getUserSettings(
      req.user.id,
    )

    return {
      settings: settings.map((s) => ({
        eventIdentifier: s.eventIdentifier,
        emitterIdentifier: s.emitterIdentifier,
        channel: s.channel,
        enabled: s.enabled,
      })),
    }
  }

  /**
   * Update user's global notification settings.
   */
  @Put()
  async updateUserSettings(
    @Req() req: express.Request,
    @Body() body: NotificationSettingsUpdateDTO,
  ): Promise<NotificationSettingsResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    await this.notificationSettingsService.updateUserSettings(
      req.user.id,
      body.settings,
    )

    const settings = await this.notificationSettingsService.getUserSettings(
      req.user.id,
    )

    return {
      settings: settings.map((s) => ({
        eventIdentifier: s.eventIdentifier,
        emitterIdentifier: s.emitterIdentifier,
        channel: s.channel,
        enabled: s.enabled,
      })),
    }
  }

  /**
   * Get folder-specific notification settings.
   */
  @Get('/folders/:folderId')
  async getFolderSettings(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
  ): Promise<NotificationSettingsResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    // Verify folder access
    await this.folderService.getFolderAsUser(req.user, folderId)

    const settings = await this.notificationSettingsService.getFolderSettings(
      req.user.id,
      folderId,
    )

    return {
      settings: settings.map((s) => ({
        eventIdentifier: s.eventIdentifier,
        emitterIdentifier: s.emitterIdentifier,
        channel: s.channel,
        enabled: s.enabled,
      })),
    }
  }

  /**
   * Update folder-specific notification settings.
   */
  @Put('/folders/:folderId')
  async updateFolderSettings(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Body() body: NotificationSettingsUpdateDTO,
  ): Promise<NotificationSettingsResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    // Verify folder access
    await this.folderService.getFolderAsUser(req.user, folderId)

    await this.notificationSettingsService.updateFolderSettings(
      req.user.id,
      folderId,
      body.settings,
    )

    const settings = await this.notificationSettingsService.getFolderSettings(
      req.user.id,
      folderId,
    )

    return {
      settings: settings.map((s) => ({
        eventIdentifier: s.eventIdentifier,
        emitterIdentifier: s.emitterIdentifier,
        channel: s.channel,
        enabled: s.enabled,
      })),
    }
  }
}
