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
import type { Request } from 'express'
import { ZodValidationPipe } from 'nestjs-zod'

import { AppService } from '../../app/services/app.service'
import { AuthGuard } from '../../auth/guards/auth.guard'
import {
  AllowedActor,
  AuthGuardConfig,
} from '../../auth/guards/auth.guard-config'
import {
  AccessTokenJWT,
  APP_USER_JWT_SUB_PREFIX,
  JWTService,
} from '../../auth/services/jwt.service'
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

  private extractAppUserIdentity(req: Request): {
    userId: string
    appIdentifier: string
  } {
    const authHeader = req.header('Authorization')
    const token = authHeader?.slice(7)
    if (!token) {
      throw new UnauthorizedException('Missing authorization token')
    }
    const verifiedToken = AccessTokenJWT.parse(
      this.jwtService.verifyUserJWT(token),
    )

    if (!verifiedToken.sub.startsWith(APP_USER_JWT_SUB_PREFIX)) {
      throw new UnauthorizedException(
        'Invalid token subject for bridge session',
      )
    }

    const parts = verifiedToken.sub.split(':')
    const userId = parts[1]
    const appIdentifier = parts[2]

    if (!userId || !appIdentifier) {
      throw new UnauthorizedException(
        'Invalid token subject for bridge session',
      )
    }

    return { userId, appIdentifier }
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
      throw new Error(
        `No running container found for instance "${containerId}"`,
      )
    }

    const containerAppId = container.labels[DOCKER_LABELS.APP_ID]
    if (!containerAppId || containerAppId !== appIdentifier) {
      throw new Error('Container not owned by this app')
    }

    const containerUserId = container.labels[DOCKER_LABELS.USER_ID]
    if (!containerUserId || containerUserId !== userId) {
      throw new Error('Container not owned by this user')
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
    const { userId, appIdentifier } = this.extractAppUserIdentity(req)

    await this.validateContainerAccess(
      body.hostId,
      body.containerId,
      userId,
      appIdentifier,
    )

    const credentials = await this.dockerClientService.createTunnelSession(
      body.containerId,
      body.command,
      body.label,
      appIdentifier,
      body.mode,
      body.protocol,
      {
        hostId: body.hostId,
        public: body.public,
      },
    )

    this.logger.debug(
      `Bridge tunnel created: ${credentials.sessionId} for user ${userId}, app ${appIdentifier}, label ${body.label}, protocol ${body.protocol}${credentials.public ? `, publicId ${credentials.public.id} publicUrl ${credentials.public.url}` : ''}`,
    )

    return credentials
  }
}
