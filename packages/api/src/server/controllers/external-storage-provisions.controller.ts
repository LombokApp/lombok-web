import {
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
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { ZodValidationPipe } from 'nestjs-zod'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import { ApiStandardErrorResponses } from 'src/shared/decorators/api-standard-error-responses.decorator'

import { ExternalStorageProvisionsListQueryParamsDTO } from '../dto/external-storage-provisions-list-query-params.dto'
import { StorageProvisionGetResponse } from '../dto/responses/storage-provision-get-response.dto'
import { StorageProvisionsListResponse } from '../dto/responses/storage-provision-list-response.dto'
import {
  StorageProvisionInputDTO,
  StorageProvisionUpdateDTO,
} from '../dto/storage-provision-input.dto'
import { transformStorageProvisionToDTO } from '../dto/transforms/external-storage-provision.transforms'
import { StorageProvisionService } from '../services/storage-provision.service'

@Controller('/api/v1/server/external-storage-provisions')
@ApiTags('ExternalStorageProvisions')
@ApiBearerAuth()
@UsePipes(ZodValidationPipe)
@UseGuards(AuthGuard)
@ApiStandardErrorResponses()
export class StorageProvisionsController {
  constructor(
    private readonly storageProvisionService: StorageProvisionService,
  ) {}

  /**
   * List the external storage provisions.
   */
  @Get()
  async listExternalStorageProvisions(
    @Req() req: express.Request,
    @Query() queryParams: ExternalStorageProvisionsListQueryParamsDTO,
  ): Promise<StorageProvisionsListResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }

    const result =
      await this.storageProvisionService.listExternalStorageProvisionsAsUser(
        req.user,
        queryParams,
      )
    return {
      result: result.map((r) => transformStorageProvisionToDTO(r)),
    }
  }

  /**
   * Get a storage provision by id.
   */
  @Get('/:storageProvisionId')
  async getStorageProvision(
    @Req() req: express.Request,
    @Param('storageProvisionId') storageProvisionId: string,
  ): Promise<StorageProvisionGetResponse> {
    if (!req.user) {
      // TODO: Should this be admin only?
      throw new UnauthorizedException()
    }

    const result =
      await this.storageProvisionService.getStorageProvisionById(
        storageProvisionId,
      )
    if (!result) {
      throw new NotFoundException()
    }
    return {
      storageProvision: transformStorageProvisionToDTO(result),
    }
  }

  /**
   * Create a new user storage provision.
   */
  @Post()
  async createUserStorageProvision(
    @Req() req: express.Request,
    @Body() serverProvision: StorageProvisionInputDTO,
  ): Promise<StorageProvisionsListResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }

    await this.storageProvisionService.createStorageProvisionAsAdmin(
      req.user,
      serverProvision,
    )

    const listResult =
      await this.storageProvisionService.listExternalStorageProvisionsAsUser(
        req.user,
      )

    return {
      result: listResult.map((r) => transformStorageProvisionToDTO(r)),
    }
  }

  /**
   * Update a server provision by id.
   */
  @Put('/:storageProvisionId')
  async updateStorageProvision(
    @Req() req: express.Request,
    @Param('storageProvisionId') storageProvisionId: string,
    @Body() storageProvision: StorageProvisionUpdateDTO,
  ): Promise<StorageProvisionsListResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }

    await this.storageProvisionService.updateStorageProvisionAsAdmin(
      req.user,
      storageProvisionId,
      storageProvision,
    )

    const listResult =
      await this.storageProvisionService.listExternalStorageProvisionsAsUser(
        req.user,
      )
    const result = {
      result: listResult.map((r) => transformStorageProvisionToDTO(r)),
    }
    return result
  }

  /**
   * Delete a storage provision by id.
   */
  @Delete('/:storageProvisionId')
  async deleteStorageProvision(
    @Req() req: express.Request,
    @Param('storageProvisionId') storageProvisionId: string,
  ): Promise<StorageProvisionsListResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    await this.storageProvisionService.deleteStorageProvisionAsAdmin(
      req.user,
      storageProvisionId,
    )
    const listResult =
      await this.storageProvisionService.listExternalStorageProvisionsAsUser(
        req.user,
      )
    return {
      result: listResult.map((r) => transformStorageProvisionToDTO(r)),
    }
  }
}
