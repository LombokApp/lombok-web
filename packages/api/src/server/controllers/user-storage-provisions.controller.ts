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
import { ApiBearerAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { AuthGuard } from 'src/auth/guards/auth.guard'

import { UserStorageProvisionGetResponse } from '../dto/responses/user-storage-provision-get-response.dto'
import { UserStorageProvisionListResponse } from '../dto/responses/user-storage-provision-list-response.dto'
import { transformUserStorageProvisionToDTO } from '../dto/transforms/user-storage-provision.transforms'
import { UserStorageProvisionDTO } from '../dto/user-storage-provision.dto'
import { UserStorageProvisionInputDTO } from '../dto/user-storage-provision-input.dto'
import { StorageProvisionsListQueryParamsDTO } from '../dto/user-storage-provisions-list-query-params.dto'
import { ServerConfigurationService } from '../services/server-configuration.service'

@Controller('/api/v1/server/user-storage-provisions')
@ApiTags('UserStorageProvisions')
@ApiBearerAuth()
@UsePipes(ZodValidationPipe)
@UseGuards(AuthGuard)
@ApiExtraModels(UserStorageProvisionDTO)
export class UserStorageProvisionsController {
  constructor(
    private readonly serverConfigurationService: ServerConfigurationService,
  ) {}

  /**
   * List the user storage provisions.
   */
  @Get()
  async listUserStorageProvisions(
    @Req() req: express.Request,
    @Query() queryParams: StorageProvisionsListQueryParamsDTO,
  ): Promise<UserStorageProvisionListResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }

    const result =
      await this.serverConfigurationService.listUserStorageProvisionsAsUser(
        req.user,
        queryParams,
      )
    return {
      result: result.map((r) => transformUserStorageProvisionToDTO(r)),
    }
  }

  /**
   * Get a user storage provision by id.
   */
  @Get('/:userStorageProvisionId')
  async getUserStorageProvision(
    @Req() req: express.Request,
    @Param('userStorageProvisionId') userStorageProvisionId: string,
  ): Promise<UserStorageProvisionGetResponse> {
    if (!req.user) {
      // TODO: Should this be admin only?
      throw new UnauthorizedException()
    }

    const result =
      await this.serverConfigurationService.getUserStorageProvisionById(
        userStorageProvisionId,
      )
    if (!result) {
      throw new NotFoundException()
    }
    return {
      userStorageProvision: transformUserStorageProvisionToDTO(result),
    }
  }

  /**
   * Create a new user storage provision.
   */
  @Post()
  async createUserStorageProvision(
    @Req() req: express.Request,
    @Body() serverProvision: UserStorageProvisionInputDTO,
  ): Promise<UserStorageProvisionListResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }

    await this.serverConfigurationService.createStorageProvisionAsAdmin(
      req.user,
      serverProvision,
    )

    const listResult =
      await this.serverConfigurationService.listUserStorageProvisionsAsUser(
        req.user,
      )

    return {
      result: listResult.map((r) => transformUserStorageProvisionToDTO(r)),
    }
  }

  /**
   * Update a server provision by id.
   */
  @Put('/:userStorageProvisionId')
  async updateUserStorageProvision(
    @Req() req: express.Request,
    @Param('userStorageProvisionId') userStorageProvisionId: string,
    @Body() userStorageProvision: UserStorageProvisionInputDTO,
  ): Promise<UserStorageProvisionListResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }

    await this.serverConfigurationService.updateUserStorageProvisionAsAdmin(
      req.user,
      userStorageProvisionId,
      userStorageProvision,
    )

    const listResult =
      await this.serverConfigurationService.listUserStorageProvisionsAsUser(
        req.user,
      )
    const result = {
      result: listResult.map((r) => transformUserStorageProvisionToDTO(r)),
    }
    return result
  }

  /**
   * Delete a server provision by id.
   */
  @Delete('/:userStorageProvisionId')
  async deleteUserStorageProvision(
    @Req() req: express.Request,
    @Param('userStorageProvisionId') userStorageProvisionId: string,
  ): Promise<UserStorageProvisionListResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    await this.serverConfigurationService.deleteUserStorageProvisionAsAdmin(
      req.user,
      userStorageProvisionId,
    )
    return {
      result:
        await this.serverConfigurationService.listUserStorageProvisionsAsUser(
          req.user,
        ),
    }
  }
}
