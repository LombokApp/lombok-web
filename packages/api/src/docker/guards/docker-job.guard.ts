import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'
import { z } from 'zod'

import {
  DockerWorkerHookService,
  DockerWorkerJobClaims,
} from '../services/docker-worker-hook.service'

const BEARER_PREFIX = 'Bearer '

/**
 * Guard for worker job endpoints.
 * Validates the job-specific JWT token and attaches the decoded claims to the request.
 */
@Injectable()
export class DockerJobGuard implements CanActivate {
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

    // Get the job ID from the URL
    const urlParts = request.url.slice(1).split('/')

    if (
      urlParts[0] !== 'api' ||
      urlParts[2] !== 'docker' ||
      urlParts[3] !== 'jobs' ||
      !urlParts[4]?.length ||
      !z.string().uuid().safeParse(urlParts[4]).success
    ) {
      throw new UnauthorizedException('Missing job ID in request')
    }

    const jobId = urlParts[4]

    // Verify the token and get claims (this is synchronous - JWT verification)
    const claims = this.dockerWorkerHookService.verifyDockerWorkerJobToken(
      token,
      jobId,
    )

    // Attach claims to request for use in controllers
    request.dockerWorkerClaims = claims

    return true
  }
}

// Extend Express Request type to include worker job claims
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      dockerWorkerClaims?: DockerWorkerJobClaims
    }
  }
}
