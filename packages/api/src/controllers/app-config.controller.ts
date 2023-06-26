import express from 'express'
import {
  Body,
  Controller,
  Get,
  OperationId,
  Path,
  Put,
  Request,
  Response,
  Route,
  Security,
  SuccessResponse,
  Tags,
} from 'tsoa'
import { Lifecycle, scoped } from 'tsyringe'

import { AppConfigService } from '../domains/app-config/services/app-config.service'
import type { AppConfigData } from '../domains/app-config/transfer-objects/app-config.dto'
import { AppConfigCreateData } from '../domains/app-config/transfer-objects/app-config.dto'
import { AuthScheme } from '../domains/auth/constants/scheme.constants'
import { AuthScope } from '../domains/auth/constants/scope.constants'
import type { ErrorResponse } from '../transfer-objects/error-response.dto'

export interface AppConfigListResponse {
  data: AppConfigData[]
  meta: {
    totalCount: number
  }
}
export interface AppConfigGetResponse {
  value: unknown
}

@scoped(Lifecycle.ContainerScoped)
@Route('app-config')
@Tags('AppConfig')
export class AppConfigController extends Controller {
  constructor(private readonly appConfigService: AppConfigService) {
    super()
  }

  @Security(AuthScheme.AccessToken, [AuthScope.CreateAppConfig])
  @SuccessResponse(201)
  @Response<ErrorResponse>('4XX')
  @OperationId('setAppConfig')
  @Put()
  async setAppConfig(
    @Request() req: express.Request,
    @Body() body: AppConfigCreateData,
  ) {
    await this.appConfigService.set(body)
  }

  @Security(AuthScheme.AccessToken, [AuthScope.ReadAppConfig])
  @OperationId('getAppConfig')
  @Response<ErrorResponse>('4XX')
  @Get(':key')
  async getAppConfig(@Request() req: express.Request, @Path() key: string) {
    const appConfig = await this.appConfigService.get(key)

    return {
      value: appConfig,
    } as AppConfigGetResponse
  }
}
