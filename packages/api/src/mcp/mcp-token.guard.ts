import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'
import type { Session } from 'src/auth/entities/session.entity'
import { UserService } from 'src/users/services/users.service'

import { McpTokenService } from './services/mcp-token.service'

declare global {
  namespace Express {
    interface Request {
      mcpSession?: Session
    }
  }
}

const BEARER_PREFIX = 'Bearer '

@Injectable()
export class McpTokenGuard implements CanActivate {
  constructor(
    private readonly mcpTokenService: McpTokenService,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request: Request = context.switchToHttp().getRequest()
      const authHeader = request.header('Authorization')

      if (!authHeader?.startsWith(BEARER_PREFIX)) {
        throw new UnauthorizedException()
      }

      const rawToken = authHeader.slice(BEARER_PREFIX.length)
      const session = await this.mcpTokenService.validateMcpToken(rawToken)

      const user = await this.userService.getUserById({ id: session.userId })
      request.user = user
      // Attach the session id and clientName for downstream use
      // We attach a minimal session-like object since we only have partial session data
      // from validateMcpToken. The guard stores what's needed downstream.
      request.mcpSession = {
        id: session.id,
        userId: session.userId,
        type: 'mcp_token',
        typeDetails: { clientName: session.clientName },
        // Placeholders for required Session fields not needed by guards downstream
        hash: '',
        expiresAt: new Date('9999-12-31'),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      return true
    } catch {
      throw new UnauthorizedException()
    }
  }
}
