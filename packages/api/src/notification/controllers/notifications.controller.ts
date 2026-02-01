import { ZodValidationPipe } from '@anatine/zod-nestjs'
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { and, eq } from 'drizzle-orm'
import express from 'express'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import { OrmService } from 'src/orm/orm.service'
import { ApiStandardErrorResponses } from 'src/shared/decorators/api-standard-error-responses.decorator'

import {
  NotificationDTO,
  NotificationListQueryDTO,
  NotificationListResponseDTO,
  NotificationUnreadCountResponseDTO,
} from '../dto/notification.dto'
import { transformNotificationToDTO } from '../dto/transforms/notification.transforms'
import { notificationDeliveriesTable } from '../entities/notification-delivery.entity'
import { NotificationQueryService } from '../services/notification-query.service'

@Controller('/api/v1/notifications')
@ApiTags('Notifications')
@UseGuards(AuthGuard)
@UsePipes(ZodValidationPipe)
@ApiBearerAuth()
@ApiStandardErrorResponses()
export class NotificationsController {
  constructor(
    private readonly notificationQueryService: NotificationQueryService,
    private readonly ormService: OrmService,
  ) {}

  /**
   * List user's notifications with pagination, filtering, and sorting.
   */
  @Get()
  async listNotifications(
    @Req() req: express.Request,
    @Query() query: NotificationListQueryDTO,
  ): Promise<NotificationListResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const result = await this.notificationQueryService.listNotifications(
      req.user.id,
      query,
    )

    return {
      notifications: result.notifications.map(({ notification, readAt }) =>
        transformNotificationToDTO({ ...notification, readAt }),
      ),
      nextCursor: result.nextCursor,
    }
  }

  /**
   * Get count of unread notifications.
   */
  @Get('/unread-count')
  async getUnreadCount(
    @Req() req: express.Request,
  ): Promise<NotificationUnreadCountResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const count = await this.notificationQueryService.getUnreadCount(
      req.user.id,
    )
    return { count }
  }

  /**
   * Get a single notification by ID.
   */
  @Get('/:notificationId')
  async getNotification(
    @Req() req: express.Request,
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
  ): Promise<NotificationDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }

    const result =
      await this.ormService.db.query.notificationDeliveriesTable.findFirst({
        where: and(
          eq(notificationDeliveriesTable.notificationId, notificationId),
          eq(notificationDeliveriesTable.userId, req.user.id),
        ),
        with: {
          notification: true,
        },
      })

    if (!result) {
      throw new NotFoundException('Notification not found')
    }

    return transformNotificationToDTO({
      ...result.notification,
      readAt: result.readAt,
    })
  }

  /**
   * Mark a notification as read.
   */
  @Patch('/:id/read')
  async markAsRead(
    @Req() req: express.Request,
    @Param('id', ParseUUIDPipe) notificationId: string,
  ): Promise<void> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    await this.notificationQueryService.markAsRead(req.user.id, notificationId)
  }
}
