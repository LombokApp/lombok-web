import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { ZodValidationPipe } from 'nestjs-zod'

import { AppService } from '../../app/services/app.service'
import { AuthGuard } from '../../auth/guards/auth.guard'
import {
  AllowedActor,
  AuthGuardConfig,
} from '../../auth/guards/auth.guard-config'
import { JWTService } from '../../auth/services/jwt.service'
import { ApiStandardErrorResponses } from '../../shared/decorators/api-standard-error-responses.decorator'
import { CreateBridgeTunnelSessionRequestDTO } from '../dto/create-bridge-tunnel-session-request.dto'
import { CreateBridgeTunnelSessionResponseDTO } from '../dto/create-bridge-tunnel-session-response.dto'
import { DockerClientService } from '../services/client/docker-client.service'
import { DOCKER_LABELS } from '../services/docker-jobs.service'

@Controller('/api/v1/docker/bridge-sessions')
@ApiTags('BridgeSessions')
@UsePipes(ZodValidationPipe)
@ApiBearerAuth()
@ApiStandardErrorResponses()
@UseGuards(AuthGuard)
@AuthGuardConfig({ allowedActors: [AllowedActor.APP_USER] })
export class BridgeSessionController {
  private readonly logger = new Logger(BridgeSessionController.name)

  constructor(
    private readonly jwtService: JWTService,
    private readonly appService: AppService,
    private readonly dockerClientService: DockerClientService,
  ) {}

  private async extractAppUserIdentity(req: Request): Promise<{
    userId: string
    appIdentifier: string
  }> {
    const authHeader = req.header('Authorization')
    const token = authHeader?.slice(7)
    if (!token) {
      throw new UnauthorizedException('Missing authorization token')
    }
    const claims = await this.jwtService.verifyAppToken(token)
    if (claims.actorType !== 'app_user' || claims.worker !== undefined) {
      throw new UnauthorizedException(
        'Bridge session requires an app-user UI token',
      )
    }
    return { userId: claims.userId, appIdentifier: claims.appIdentifier }
  }

  private async validateContainerAccess(
    hostId: string,
    containerId: string,
    userId: string,
    appIdentifier: string,
  ) {
    await this.appService.validateAppUserAccess({ appIdentifier, userId })

    const container = await this.dockerClientService.findContainerById(
      hostId,
      containerId,
      { start: true },
    )

    if (!container) {
      throw new NotFoundException(
        `No running container found for instance "${containerId}"`,
      )
    }

    const containerAppId = container.labels[DOCKER_LABELS.APP_ID]
    if (!containerAppId || containerAppId !== appIdentifier) {
      throw new ForbiddenException('Container not owned by this app')
    }

    const containerUserId = container.labels[DOCKER_LABELS.USER_ID]
    if (!containerUserId || containerUserId !== userId) {
      throw new ForbiddenException('Container not owned by this user')
    }

    return container
  }

  /**
   * Create a tunnel session on the Docker bridge.
   * Supports both framed (HTTP proxy via tunnel-agent) and raw (PTY/terminal) protocols.
   */
  @Post('tunnel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create a bridge tunnel',
    description:
      'Creates a tunnel session on the Docker bridge. For framed protocol, spawns ' +
      'a tunnel-agent that proxies HTTP/WebSocket traffic. For raw protocol, creates ' +
      'a PTY exec for direct terminal access. Returns a tunnel URL for browser access ' +
      'and session credentials for direct WebSocket access.',
  })
  async createTunnelSession(
    @Req() req: Request,
    @Body() body: CreateBridgeTunnelSessionRequestDTO,
  ): Promise<CreateBridgeTunnelSessionResponseDTO> {
    const { userId, appIdentifier } = await this.extractAppUserIdentity(req)

    await this.validateContainerAccess(
      body.hostId,
      body.containerId,
      userId,
      appIdentifier,
    )

    const credentials = await this.dockerClientService.createTunnelSession(
      body.hostId,
      body.containerId,
      body.command,
      body.label,
      body.mode,
      body.protocol,
      { public: body.public, appIdentifier },
    )

    this.logger.debug(
      `Bridge tunnel created: ${credentials.sessionId} for user ${userId}, app ${appIdentifier}, label ${body.label}, protocol ${body.protocol}${credentials.public ? `, publicId ${credentials.public.id} publicUrl ${credentials.public.url}` : ''}`,
    )

    return credentials
  }
}
