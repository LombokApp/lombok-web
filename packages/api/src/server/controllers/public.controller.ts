import { Controller, Get, UsePipes } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { ZodValidationPipe } from 'nestjs-zod'
import { resolveBuildId } from 'src/core/utils/build-id.util'

import { PublicBuildIdGetResponse } from '../dto/responses/public-build-id-get-response.dto'
import { PublicSettingsGetResponse } from '../dto/responses/public-settings-get-response.dto'
import { ServerConfigurationService } from '../services/server-configuration.service'

@Controller('/api/v1/public')
@ApiTags('Public')
@UsePipes(ZodValidationPipe)
export class PublicController {
  constructor(
    private readonly serverConfigurationService: ServerConfigurationService,
  ) {}

  /**
   * Get the public server settings object (no authentication required).
   */
  @Get('/settings')
  @ApiOperation({
    summary:
      'Get the public server settings object (no authentication required).',
  })
  @ApiResponse({
    status: 200,
    description: 'Public server settings',
    type: PublicSettingsGetResponse,
  })
  async getPublicServerSettings(): Promise<PublicSettingsGetResponse> {
    return {
      settings: await this.serverConfigurationService.getPublicServerSettings(),
    }
  }

  /**
   * Get the build ID identifying the running server (no authentication required).
   */
  @Get('/build-id')
  @ApiOperation({
    summary: 'Get the build ID identifying the running server.',
  })
  @ApiResponse({
    status: 200,
    description: 'Build ID',
    type: PublicBuildIdGetResponse,
  })
  async getBuildId(): Promise<PublicBuildIdGetResponse> {
    return { buildId: await resolveBuildId() }
  }
}
