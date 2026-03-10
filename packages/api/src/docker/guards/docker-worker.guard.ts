import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'

import {
  DockerContainerClaims,
  DockerWorkerHookService,
} from '../services/docker-worker-hook.service'

const BEARER_PREFIX = 'Bearer '

/**
 * Guard for endpoints called by long-lived docker containers.
 * Validates the container-scoped JWT token (not a job token).
 */
@Injectable()
export class DockerWorkerGuard implements CanActivate {
  constructor(
    private readonly dockerWorkerHookService: DockerWorkerHookService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest()
    const authHeader = request.header('Authorization')

    if (!authHeader?.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedException('Missing or invalid Authorization header')
    }

    const token = authHeader.slice(BEARER_PREFIX.length)

    // Verify the token is a valid container token
    const claims =
      this.dockerWorkerHookService.verifyDockerContainerToken(token)

    // Attach claims to request for use in controllers
    request.dockerContainerClaims = claims

    return true
  }
}

// Extend Express Request type to include container claims
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      dockerContainerClaims?: DockerContainerClaims
    }
  }
}
