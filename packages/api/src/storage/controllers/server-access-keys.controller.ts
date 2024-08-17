import { ZodValidationPipe } from '@anatine/zod-nestjs'
import {
  Body,
  Controller,
  Get,
  Param,
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
import { AccessKeyGetResponse } from '../dto/responses/access-key-get-response.dto'
import { AccessKeyListResponse } from '../dto/responses/access-key-list-response.dto'
import { AccessKeyRotateResponse } from '../dto/responses/access-key-rotate-response.dto'
import { RotateAccessKeyInputDTO } from '../dto/rotate-access-key-input.dto'
import { StorageLocationService } from '../storage-location.service'

@Controller('/api/v1/server/access-keys')
@ApiTags('ServerAccessKeys')
@UseGuards(AuthGuard)
@UsePipes(ZodValidationPipe)
@ApiBearerAuth()
@ApiExtraModels(AccessKeyDTO)
export class ServerAccessKeysController {
  constructor(
    private readonly storageLocationService: StorageLocationService,
  ) {}

  /**
   * List server access keys.
   */
  @Get()
  async listServerAccessKeys(
    @Req() req: express.Request,
    @Query() queryParams: AccessKeyListQueryParamsDTO,
  ): Promise<AccessKeyListResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    const result =
      await this.storageLocationService.listServerAccessKeysAsAdmin(
        req.user,
        queryParams,
      )
    return result
  }

  /**
   * Get server access key by id.
   */
  @Get('/:accessKeyHashId')
  async getServerAccessKey(
    @Req() req: express.Request,
    @Param('accessKeyHashId') accessKeyHashId: string,
  ): Promise<AccessKeyGetResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    const result = await this.storageLocationService.getServerAccessKeyAsAdmin(
      req.user,
      accessKeyHashId,
    )
    return { accessKey: result }
  }

  /**
   * Rotate a server access key.
   */
  @Post('/:accessKeyHashId')
  async rotateAccessKey(
    @Req() req: express.Request,
    @Param('accessKeyHashId') accessKeyHashId: string,
    @Body() body: RotateAccessKeyInputDTO,
  ): Promise<AccessKeyRotateResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }

    return {
      accessKeyHashId: await this.storageLocationService.rotateAccessKeyAsAdmin(
        req.user,
        {
          accessKeyHashId,
          newAccessKey: body,
        },
      ),
    }
  }
}
