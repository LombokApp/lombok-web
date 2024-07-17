import { ZodValidationPipe } from '@anatine/zod-nestjs'
import {
  Body,
  Controller,
  Delete,
  Get,
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
import { AuthGuard } from 'src/auth/guards/auth.guard'

import { StorageProvisionListResponse } from '../dto/responses/storage-provision-list-response.dto'
import { StorageProvisionInputDTO } from '../dto/storage-provision-input.dto'
import { StorageProvisionsListQueryParamsDTO } from '../dto/storage-provisions-list-query-params.dto'
import { transformStorageProvisionToDTO } from '../dto/transforms/storage-provisions.transforms'
import { ServerConfigurationService } from '../services/server-configuration.service'

@Controller('/server/storage-provisions')
@ApiTags('StorageProvisions')
@ApiBearerAuth()
@UsePipes(ZodValidationPipe)
@UseGuards(AuthGuard)
export class StorageProvisionsController {
  constructor(
    private readonly serverConfigurationService: ServerConfigurationService,
  ) {}

  /**
   * List the server provisions.
   */
  @Get()
  async listStorageProvisions(
    @Req() req: express.Request,
    // @Param('provisionType') provisionType: StorageProvisionType,
    @Query() queryParams: StorageProvisionsListQueryParamsDTO,
  ): Promise<StorageProvisionListResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }

    const result =
      await this.serverConfigurationService.listStorageProvisionsAsUser(
        req.user,
        queryParams,
      )
    return {
      result: result.map((r) => transformStorageProvisionToDTO(r)),
    }
  }

  /**
   * Create a new server provision.
   */
  @Post()
  async createServerProvision(
    @Req() req: express.Request,
    @Body() serverProvision: StorageProvisionInputDTO,
  ): Promise<StorageProvisionListResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }

    const _createResult =
      await this.serverConfigurationService.createStorageProvisionAsAdmin(
        req.user,
        serverProvision,
      )

    const listResult =
      await this.serverConfigurationService.listStorageProvisionsAsUser(
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
    @Param('storageProvisionId') serverProvisionId: string,
    @Body() serverProvision: StorageProvisionInputDTO,
  ): Promise<StorageProvisionListResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const _updateResult =
      await this.serverConfigurationService.updateServerProvisionAsAdmin(
        req.user,
        serverProvisionId,
        serverProvision,
      )

    const listResult =
      await this.serverConfigurationService.listStorageProvisionsAsUser(
        req.user,
      )
    const result = {
      result: listResult.map((r) => transformStorageProvisionToDTO(r)),
    }
    return result
  }

  /**
   * Delete a server provision by id.
   */
  @Delete('/:storageProvisionId')
  async deleteStorageProvision(
    @Req() req: express.Request,
    @Param('storageProvisionId') storageProvisionId: string,
  ): Promise<StorageProvisionListResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    await this.serverConfigurationService.deleteStorageProvisionAsAdmin(
      req.user,
      storageProvisionId,
    )
    return {
      result: await this.serverConfigurationService.listStorageProvisionsAsUser(
        req.user,
      ),
    }
  }
}
