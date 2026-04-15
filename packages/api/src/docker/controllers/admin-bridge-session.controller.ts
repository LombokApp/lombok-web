import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { ZodValidationPipe } from 'nestjs-zod'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import { ApiStandardErrorResponses } from 'src/shared/decorators/api-standard-error-responses.decorator'

import { CreateAdminBridgeTunnelSessionRequestDTO } from '../dto/create-admin-bridge-tunnel-session-request.dto'
import { CreateBridgeTunnelSessionResponseDTO } from '../dto/create-bridge-tunnel-session-response.dto'
import { DockerClientService } from '../services/client/docker-client.service'

function assertAdmin(req: express.Request): void {
  if (!req.user?.isAdmin) {
    throw new UnauthorizedException()
  }
}

@Controller('/api/v1/docker/admin-bridge-sessions')
@ApiTags('AdminBridgeSessions')
@UsePipes(ZodValidationPipe)
@ApiBearerAuth()
@ApiStandardErrorResponses()
@UseGuards(AuthGuard)
export class AdminBridgeSessionController {
  private readonly logger = new Logger(AdminBridgeSessionController.name)

  constructor(private readonly dockerClientService: DockerClientService) {}

  @Post('tunnel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create an admin bridge tunnel session',
    description:
      'Creates an ephemeral raw PTY tunnel session on the Docker bridge for admin container exec. ' +
      'Returns session credentials for direct WebSocket access to the bridge.',
  })
  async createAdminTunnelSession(
    @Req() req: express.Request,
    @Body() body: CreateAdminBridgeTunnelSessionRequestDTO,
  ): Promise<CreateBridgeTunnelSessionResponseDTO> {
    assertAdmin(req)

    // Detect best available shell if no explicit command provided
    const command =
      body.command ?? (await this.detectShell(body.hostId, body.containerId))

    const credentials = await this.dockerClientService.createTunnelSession(
      body.hostId,
      body.containerId,
      command,
      body.label,
      'ephemeral',
      'raw',
    )

    this.logger.debug(
      `Admin bridge tunnel created: ${credentials.sessionId} for user ${req.user?.id}, container ${body.containerId}`,
    )

    return credentials
  }

  private async detectShell(
    hostId: string,
    containerId: string,
  ): Promise<string[]> {
    try {
      const result = await this.dockerClientService.execInContainer(
        hostId,
        containerId,
        ['which', 'bash'],
      )
      if (result.exitCode === 0 && result.stdout.trim()) {
        return ['/bin/bash']
      }
    } catch {
      // Fall through to default
    }
    return ['/bin/sh']
  }
}
