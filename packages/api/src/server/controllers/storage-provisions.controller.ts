import { ZodValidationPipe } from '@anatine/zod-nestjs'
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
import { AuthGuard } from 'src/auth/guards/auth.guard'
import { ApiStandardErrorResponses } from 'src/platform/decorators/api-standard-error-responses.decorator'

import { StorageProvisionGetResponse } from '../dto/responses/storage-provision-get-response.dto'
import { StorageProvisionsListResponse } from '../dto/responses/storage-provision-list-response.dto'
import {
  StorageProvisionInputDTO,
  StorageProvisionUpdateDTO,
} from '../dto/storage-provision-input.dto'
import { StorageProvisionsListQueryParamsDTO } from '../dto/storage-provisions-list-query-params.dto'
import { transformStorageProvisionToDTO } from '../dto/transforms/storage-provision.transforms'
import { ServerConfigurationService } from '../services/server-configuration.service'

@Controller('/api/v1/server/storage-provisions')
@ApiTags('StorageProvisions')
@ApiBearerAuth()
@UsePipes(ZodValidationPipe)
@UseGuards(AuthGuard)
@ApiStandardErrorResponses()
export class StorageProvisionsController {
  constructor(
    private readonly serverConfigurationService: ServerConfigurationService,
  ) {}

  /**
   * List the storage provisions.
   */
  @Get()
  async listStorageProvisions(
    @Req() req: express.Request,
    @Query() queryParams: StorageProvisionsListQueryParamsDTO,
  ): Promise<StorageProvisionsListResponse> {
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
      await this.serverConfigurationService.getStorageProvisionById(
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
    @Param('storageProvisionId') storageProvisionId: string,
    @Body() storageProvision: StorageProvisionUpdateDTO,
  ): Promise<StorageProvisionsListResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }

    await this.serverConfigurationService.updateStorageProvisionAsAdmin(
      req.user,
      storageProvisionId,
      storageProvision,
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
