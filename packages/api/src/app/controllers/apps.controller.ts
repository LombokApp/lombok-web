import { ZodValidationPipe } from '@anatine/zod-nestjs'
import {
  Controller,
  Get,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import express from 'express'
import { AppService } from 'src/app/services/app.service'
import { AuthGuard } from 'src/auth/guards/auth.guard'

import { AppListResponse } from '../dto/responses/app-list-response.dto'

@Controller('/server/apps')
@ApiTags('Apps')
@UsePipes(ZodValidationPipe)
@UseGuards(AuthGuard)
export class AppsController {
  constructor(private readonly appService: AppService) {}

  @Get()
  async listApps(@Req() req: express.Request): Promise<AppListResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    const apps = await this.appService.getApps()
    const result = Object.keys(apps).reduce(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      (acc, next) => acc.concat(apps[next] as any),
      [],
    )
    return {
      result,
      meta: { totalCount: result.length },
    }
  }
}
