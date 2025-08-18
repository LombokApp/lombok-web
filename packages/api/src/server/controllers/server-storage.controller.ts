import { ZodValidationPipe } from '@anatine/zod-nestjs'
import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { AuthGuard } from 'src/auth/guards/auth.guard'

import { ServerStorageLocationGetResponse } from '../dto/responses/server-storage-location-get-response.dto'
import { ServerStorageInputDTO } from '../dto/server-storage-input.dto'
import { ServerConfigurationService } from '../services/server-configuration.service'

@Controller('/api/v1/server/server-storage')
@ApiTags('ServerStorage')
@ApiBearerAuth()
@UsePipes(ZodValidationPipe)
@UseGuards(AuthGuard)
export class ServerStorageController {
  constructor(
    private readonly serverConfigurationService: ServerConfigurationService,
  ) {}

  /**
   * Get the server storage location.
   */
  @Get()
  async getServerStorageLocation(
    @Req() req: express.Request,
  ): Promise<ServerStorageLocationGetResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }

    const result =
      await this.serverConfigurationService.getServerStorageAsAdmin(req.user)
    return {
      serverStorageLocation: result,
    }
  }

  /**
   * Create a new server provision.
   */
  @Post()
  async setServerStorageLocation(
    @Req() req: express.Request,
    @Body() serverStorageLocation: ServerStorageInputDTO,
  ): Promise<ServerStorageLocationGetResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }

    const setResult =
      await this.serverConfigurationService.setServerStorageAsAdmin(
        req.user,
        serverStorageLocation,
      )

    return {
      serverStorageLocation: setResult,
    }
  }

  /**
   * Delete any set server storage location.
   */
  @Delete('/')
  async deleteServerStorageLocation(
    @Req() req: express.Request,
  ): Promise<void> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }
    await this.serverConfigurationService.deleteServerStorageLocationAsAdmin(
      req.user,
    )
  }
}
