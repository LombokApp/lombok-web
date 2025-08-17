import { ZodValidationPipe } from '@anatine/zod-nestjs'
import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
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
import { LoginResponse } from 'src/auth/dto/responses/login-response.dto'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import { normalizeSortParam } from 'src/platform/utils/sort.util'

import { AppsListQueryParamsDTO } from '../dto/apps-list-query-params.dto'
import { AppContributionsResponse } from '../dto/responses/app-contributions-response.dto'
import { AppGetResponse } from '../dto/responses/app-get-response.dto'
import { AppListResponse } from '../dto/responses/app-list-response.dto'
import { SetAppEnabledInputDTO } from '../dto/set-app-enabled-input.dto'
import { SetWorkerScriptEnvVarsInputDTO } from '../dto/set-worker-script-env-vars-input.dto'
import { transformAppToDTO } from '../dto/transforms/app.transforms'

@Controller('/api/v1/server')
@ApiTags('Apps')
@UsePipes(ZodValidationPipe)
@UseGuards(AuthGuard)
@ApiBearerAuth()
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
    const app = await this.appService.getAppAsAdmin(appIdentifier)
    if (!app) {
      throw new NotFoundException()
    }
    const connectedExternalAppWorkers =
      this.appService.getExternalWorkerConnections()

    return {
      app: transformAppToDTO(
        app,
        connectedExternalAppWorkers[app.identifier] ?? [],
      ),
    }
  }

  @Put('/apps/:appIdentifier/workers/:workerIdentifier/env-vars')
  async setWorkerScriptEnvVars(
    @Req() req: express.Request,
    @Param('appIdentifier') appIdentifier: string,
    @Param('workerIdentifier') workerIdentifier: string,
    @Body() { envVars }: SetWorkerScriptEnvVarsInputDTO,
  ): Promise<AppGetResponse['app']['workerScripts'][0]['envVars']> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    const savedEnvVars = await this.appService.setAppWorkerEnvVars({
      appIdentifier,
      workerIdentifier,
      envVars,
    })

    return savedEnvVars
  }

  @Post('/apps/:appIdentifier/user-access-token')
  async generateAppUserAccessToken(
    @Req() req: express.Request,
    @Param('appIdentifier') appIdentifier: string,
  ): Promise<LoginResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }

    const session = await this.appService.createAppUserSession(
      req.user,
      appIdentifier,
    )

    return {
      session: {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        expiresAt: session.session.expiresAt,
      },
    }
  }

  @Get('/app-contributions')
  async getAppContributions(
    @Req() req: express.Request,
  ): Promise<AppContributionsResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const contributions = await this.appService.getAppContributions()
    return contributions
  }
}
