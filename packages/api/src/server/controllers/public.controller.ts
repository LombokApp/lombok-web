import { ZodValidationPipe } from '@anatine/zod-nestjs'
import { Controller, Get, UsePipes } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

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
}
