import { ZodValidationPipe } from '@anatine/zod-nestjs'
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { AppService } from 'src/app/services/app.service'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import { ApiStandardErrorResponses } from 'src/platform/decorators/api-standard-error-responses.decorator'
import { normalizeSortParam } from 'src/platform/utils/sort.util'

import { AppsListQueryParamsDTO } from '../dto/apps-list-query-params.dto'
import { AppGetResponse } from '../dto/responses/app-get-response.dto'
import { AppListResponse } from '../dto/responses/app-list-response.dto'
import { StringMapDTO } from '../dto/responses/string-map.dto'
import { SetAppEnabledInputDTO } from '../dto/set-app-enabled-input.dto'
import { SetWorkerEnvironmentVariablesInputDTO } from '../dto/set-worker-environment-variables-input.dto'
import { transformAppToDTO } from '../dto/transforms/app.transforms'
import { UpdateAppAccessSettingsInputDTO } from '../dto/update-app-access-settings-input.dto'

@Controller('/api/v1/server')
@ApiTags('Apps')
@UsePipes(ZodValidationPipe)
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiStandardErrorResponses()
export class AppsController {
  constructor(private readonly appService: AppService) {}

  @Get('/apps')
  async listApps(
    @Req() req: express.Request,
    @Query() queryParams: AppsListQueryParamsDTO,
  ): Promise<AppListResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    const { result: apps, meta } = await this.appService.listAppsAsAdmin(
      req.user,
      {
        offset: queryParams.offset,
        limit: queryParams.limit,
        sort: normalizeSortParam(queryParams.sort),
        search: queryParams.search,
        enabled: queryParams.enabled,
      },
    )
    const connectedExternalAppWorkers =
      this.appService.getExternalWorkerConnections()
    const result = apps.map((app) => {
      return transformAppToDTO(
        app,
        connectedExternalAppWorkers[app.identifier] ?? [],
      )
    })
    return {
      result,
      meta,
    }
  }

  @Put('/apps/:appIdentifier/enabled')
  async setAppEnabled(
    @Req() req: express.Request,
    @Param('appIdentifier') appIdentifier: string,
    @Body() { enabled }: SetAppEnabledInputDTO,
  ): Promise<AppGetResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    const app = await this.appService.setAppEnabledAsAdmin(
      req.user,
      appIdentifier,
      enabled,
    )
    const connectedExternalAppWorkers =
      this.appService.getExternalWorkerConnections()
    return {
      app: transformAppToDTO(
        app,
        connectedExternalAppWorkers[app.identifier] ?? [],
      ),
    }
  }

  @Get('/apps/:appIdentifier')
  async getApp(
    @Req() req: express.Request,
    @Param('appIdentifier') appIdentifier: string,
  ): Promise<AppGetResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    const app = await this.appService.getApp(appIdentifier)
    if (!app) {
      throw new NotFoundException()
    }
    const connectedExternalAppWorkers =
      this.appService.getExternalWorkerConnections()

    // Calculate app metrics
    const metrics = await this.appService.calculateAppMetrics(appIdentifier)

    return {
      app: {
        ...transformAppToDTO(
          app,
          connectedExternalAppWorkers[app.identifier] ?? [],
        ),
        metrics,
      },
    }
  }

  @Put('/apps/:appIdentifier/access-settings')
  async updateAppAccessSettings(
    @Req() req: express.Request,
    @Param('appIdentifier') appIdentifier: string,
    @Body() body: UpdateAppAccessSettingsInputDTO,
  ): Promise<AppGetResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    const app = await this.appService.updateAppAccessSettingsAsAdmin(
      req.user,
      appIdentifier,
      body,
    )
    const connectedExternalAppWorkers =
      this.appService.getExternalWorkerConnections()
    return {
      app: transformAppToDTO(
        app,
        connectedExternalAppWorkers[app.identifier] ?? [],
      ),
    }
  }

  @Put('/apps/:appIdentifier/workers/:workerIdentifier/environment-variables')
  async setWorkerEnvironmentVariables(
    @Req() req: express.Request,
    @Param('appIdentifier') appIdentifier: string,
    @Param('workerIdentifier') workerIdentifier: string,
    @Body() { environmentVariables }: SetWorkerEnvironmentVariablesInputDTO,
  ): Promise<StringMapDTO> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    const savedEnvironmentVariables =
      await this.appService.setAppWorkerEnvironmentVariables({
        appIdentifier,
        workerIdentifier,
        environmentVariables,
      })

    return savedEnvironmentVariables
  }
}
