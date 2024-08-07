import { ZodValidationPipe } from '@anatine/zod-nestjs'
import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { ApiBearerAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { AuthGuard } from 'src/auth/guards/auth.guard'

import { AccessKeyDTO } from '../dto/access-key.dto'
import { AccessKeyListQueryParamsDTO } from '../dto/access-key-list-query-params.dto'
import { AccessKeyListResponse } from '../dto/responses/access-key-list-response.dto'
import { RotateAccessKeyInputDTO } from '../dto/rotate-access-key-input.dto'
import { StorageLocationService } from '../storage-location.service'

@Controller('/api/v1/access-keys')
@ApiTags('AccessKeys')
@UseGuards(AuthGuard)
@UsePipes(ZodValidationPipe)
@ApiBearerAuth()
@ApiExtraModels(AccessKeyDTO)
export class AccessKeysController {
  constructor(
    private readonly storageLocationService: StorageLocationService,
  ) {}

  /**
   * List access keys.
   */
  @Get()
  async listAccessKeys(
    @Req() req: express.Request,
    @Query() queryParams: AccessKeyListQueryParamsDTO,
  ): Promise<AccessKeyListResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const result = await this.storageLocationService.listAccessKeysAsUser(
      req.user,
      queryParams,
    )
    return result
  }

  /**
   * Rotate an access key.
   */
  @Post()
  async rotateAccessKey(
    @Req() req: express.Request,
    @Body() body: RotateAccessKeyInputDTO,
  ): Promise<void> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    await this.storageLocationService.rotateAccessKeyAsUser(req.user, body)
  }
}
