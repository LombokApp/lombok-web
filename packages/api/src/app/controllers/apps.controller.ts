import { ZodValidationPipe } from '@anatine/zod-nestjs'
import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { ApiBearerAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { AppService } from 'src/app/services/app.service'
import { AuthGuard } from 'src/auth/guards/auth.guard'

import { AppDTO } from '../dto/app.dto'
import { AppGetResponse } from '../dto/responses/app-get-response.dto'
import { AppListResponse } from '../dto/responses/app-list-response.dto'
import { transformAppToDTO } from '../dto/transforms/app.transforms'

@Controller('/api/v1/server/apps')
@ApiTags('Apps')
@UsePipes(ZodValidationPipe)
@UseGuards(AuthGuard)
@ApiBearerAuth()
@ApiExtraModels(AppDTO)
export class AppsController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async listApps(@Req() req: express.Request): Promise<AppListResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const apps = await this.appService.listApps()
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
      meta: { totalCount: result.length },
    }
  }

  @Get('/:appIdentifier')
  async getApp(
    @Req() req: express.Request,
    @Param('appIdentifier') appIdentifier: string,
  ): Promise<AppGetResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const app = await this.appService.getApp(appIdentifier)
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
}
