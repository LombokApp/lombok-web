import { ZodValidationPipe } from '@anatine/zod-nestjs'
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
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
import { AppService } from 'src/app/services/app.service'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import { normalizeSortParam } from 'src/core/utils/sort.util'
import { ApiStandardErrorResponses } from 'src/shared/decorators/api-standard-error-responses.decorator'

import { AppsListQueryParamsDTO } from '../dto/apps-list-query-params.dto'
import { AppGetResponse } from '../dto/responses/app-get-response.dto'
import { AppInstallResponse } from '../dto/responses/app-install-response.dto'
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

  @Post('/apps/install')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  async installAppFromZip(
    @Req() req: express.Request,
    @UploadedFile()
    file:
      | { buffer?: Buffer; mimetype: string; originalname?: string }
      | undefined,
  ): Promise<AppInstallResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }

    if (!file) {
      throw new BadRequestException('No file uploaded')
    }

    if (!file.buffer) {
      throw new BadRequestException('File buffer is missing')
    }

    // Check if file is a zip file
    if (
      file.mimetype !== 'application/zip' &&
      file.mimetype !== 'application/x-zip-compressed' &&
      !file.originalname?.endsWith('.zip')
    ) {
      throw new BadRequestException('File must be a zip file')
    }

    // const app = await this.appService.installAppFromZip(file.buffer)
    const app = await this.appService.handleAppInstall({
      zipFilename: file.originalname ?? 'no filename provided',
      zipFileBuffer: file.buffer,
    })
    const connectedAppWorkers = this.appService.getWorkerConnections()

    return {
      app: transformAppToDTO(app, connectedAppWorkers[app.identifier] ?? []),
    }
  }

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
    const connectedExternalAppWorkers = this.appService.getWorkerConnections()
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
    const connectedExternalAppWorkers = this.appService.getWorkerConnections()
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
    const connectedExternalAppWorkers = this.appService.getWorkerConnections()

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
    const connectedExternalAppWorkers = this.appService.getWorkerConnections()
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

  @Delete('/apps/:appIdentifier')
  async uninstallApp(
    @Req() req: express.Request,
    @Param('appIdentifier') appIdentifier: string,
  ): Promise<void> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    const app = await this.appService.getApp(appIdentifier)
    if (!app) {
      throw new NotFoundException()
    }
    await this.appService.uninstallApp(app)
  }
}
