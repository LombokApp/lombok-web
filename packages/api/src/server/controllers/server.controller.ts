import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { ZodValidationPipe } from 'nestjs-zod'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import { ApiStandardErrorResponses } from 'src/shared/decorators/api-standard-error-responses.decorator'
import { MAX_IMAGE_UPLOAD_BYTES } from 'src/shared/utils'

import { ActivityMetricsQueryDTO } from '../dto/activity-metrics-query.dto'
import { ActivityMetricsResponse } from '../dto/responses/activity-metrics-response.dto'
import { ServerMetricsResponse } from '../dto/responses/server-metrics-response.dto'
import { SettingSetResponse } from '../dto/responses/setting-set-response.dto'
import { SettingsGetResponse } from '../dto/responses/settings-get-response.dto'
import { SetSettingInputDTO } from '../dto/set-setting-input.dto'
import { transformServerMetricsToDTO } from '../dto/transforms/server-metrics.transforms'
import { ActivityMetricsService } from '../services/activity-metrics.service'
import { ServerConfigurationService } from '../services/server-configuration.service'
import { ServerIconService } from '../services/server-icon.service'
import { ServerMetricsService } from '../services/server-metrics.service'

@Controller('/api/v1/server')
@ApiTags('Server')
@ApiBearerAuth()
@UsePipes(ZodValidationPipe)
@UseGuards(AuthGuard)
@ApiStandardErrorResponses()
export class ServerController {
  constructor(
    private readonly serverConfigurationService: ServerConfigurationService,
    private readonly serverMetricsService: ServerMetricsService,
    private readonly activityMetricsService: ActivityMetricsService,
    private readonly serverIconService: ServerIconService,
  ) {}

  /**
   * Get the server settings object.
   */
  @Get('/settings')
  async getServerSettings(
    @Req() req: express.Request,
  ): Promise<SettingsGetResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    return {
      settings: await this.serverConfigurationService.getServerSettingsAsAdmin(
        req.user,
      ),
    }
  }

  /**
   * Set a setting in the server settings objects.
   */
  @Put('/settings/:settingKey')
  async setServerSetting(
    @Req() req: express.Request,
    @Param('settingKey') settingKey: string,
    @Body() settingValue: SetSettingInputDTO,
  ): Promise<SettingSetResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    await this.serverConfigurationService.setServerSettingAsAdmin(
      req.user,
      settingKey,
      settingValue.value,
    )
    return {
      settingKey,
      settingValue: settingValue.value as never,
    }
  }

  /**
   * Reset a setting in the server settings objects.
   */
  @Delete('/settings/:settingKey')
  async resetServerSetting(
    @Req() req: express.Request,
    @Param('settingKey') settingKey: string,
  ): Promise<SettingSetResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    await this.serverConfigurationService.resetServerSettingAsUser(
      req.user,
      settingKey,
    )
    const newSettings =
      await this.serverConfigurationService.getServerSettingsAsAdmin(req.user)

    return { settingKey, settingValue: newSettings[settingKey] as never }
  }

  /**
   * Get server metrics including user counts, folder counts, and storage statistics.
   */
  @Get('/metrics')
  async getServerMetrics(
    @Req() req: express.Request,
  ): Promise<ServerMetricsResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    const metrics = await this.serverMetricsService.getServerMetrics(req.user)
    return transformServerMetricsToDTO(metrics)
  }

  /**
   * Get a unified activity time-series (events, tasks, task duration, or logs),
   * fixed-bucketed over a rolling window and optionally partitioned by app.
   */
  @Get('/metrics/activity')
  async getServerActivityMetrics(
    @Req() req: express.Request,
    @Query() query: ActivityMetricsQueryDTO,
  ): Promise<ActivityMetricsResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    return this.activityMetricsService.getActivityTimeseries({
      actor: req.user,
      metric: query.metric,
      range: query.range,
      granularity: query.granularity,
      groupBy: query.groupBy,
      appId: query.appId,
    })
  }

  /**
   * Upload (or replace) the server icon shown across the platform.
   */
  @Post('/icon')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_UPLOAD_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  async setServerIcon(
    @Req() req: express.Request,
    @UploadedFile()
    file: { buffer?: Buffer; mimetype: string; size: number } | undefined,
  ): Promise<{ updatedAt: string }> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    if (!file?.buffer) {
      throw new BadRequestException({
        code: 'image_upload_empty',
        message: 'No file was uploaded',
      })
    }
    const updatedAt = await this.serverIconService.setIcon({
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    })
    return { updatedAt: updatedAt.toISOString() }
  }

  /**
   * Remove the server icon.
   */
  @Delete('/icon')
  @HttpCode(204)
  async deleteServerIcon(@Req() req: express.Request): Promise<void> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    await this.serverIconService.deleteIcon()
  }
}
