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
import { AccessKeyBucketsListResponse } from '../dto/responses/access-key-buckets-list-response.dto'
import { AccessKeyGetResponse } from '../dto/responses/access-key-get-response.dto'
import { AccessKeyListResponse } from '../dto/responses/access-key-list-response.dto'
import { AccessKeyRotateResponse } from '../dto/responses/access-key-rotate-response.dto'
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
   * Get an access key by id.
   */
  @Get('/:accessKeyHashId')
  async getAccessKey(
    @Req() req: express.Request,
    @Param('accessKeyHashId') accessKeyHashId: string,
  ): Promise<AccessKeyGetResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const result = await this.storageLocationService.getAccessKeyAsUser(
      req.user,
      accessKeyHashId,
    )
    return { accessKey: result }
  }

  /**
   * Rotate an access key.
   */
  @Post('/:accessKeyHashId')
  async rotateAccessKey(
    @Req() req: express.Request,
    @Param('accessKeyHashId') accessKeyHashId: string,
    @Body() body: RotateAccessKeyInputDTO,
  ): Promise<AccessKeyRotateResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    return {
      accessKeyHashId: await this.storageLocationService.rotateAccessKeyAsUser(
        req.user,
        {
          accessKeyHashId,
          newAccessKey: body,
        },
      ),
    }
  }

  /**
   * List buckets for an access key.
   */
  @Get('/:accessKeyHashId/buckets')
  async listAccessKeyBuckets(
    @Req() req: express.Request,
    @Param('accessKeyHashId') accessKeyHashId: string,
  ): Promise<AccessKeyBucketsListResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const result = await this.storageLocationService.listAccessKeyBucketAsUser(
      req.user,
      accessKeyHashId,
    )
    return {
      result:
        result.Buckets?.map((bucket) => ({
          name: bucket.Name ?? '',
          createdDate: bucket.CreationDate,
        })) ?? [],
    }
  }
}
