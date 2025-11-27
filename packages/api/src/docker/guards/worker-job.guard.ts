import type { CanActivate, ExecutionContext } from '@nestjs/common'
import { Injectable, UnauthorizedException } from '@nestjs/common'
import type { Request } from 'express'

import { WorkerJobService } from '../services/worker-job.service'

const BEARER_PREFIX = 'Bearer '

/**
 * Guard for worker job endpoints.
 * Validates the job-specific JWT token and attaches the decoded claims to the request.
 */
@Injectable()
export class WorkerJobGuard implements CanActivate {
  constructor(private readonly workerJobService: WorkerJobService) {}

  canActivate(context: ExecutionContext): boolean {
    const request: Request = context.switchToHttp().getRequest()
    const authHeader = request.header('Authorization')

    if (!authHeader?.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedException('Missing or invalid Authorization header')
    }

    const token = authHeader.slice(BEARER_PREFIX.length)

    // Get the job ID from the URL params
    const jobId = request.params.jobId
    if (!jobId) {
      throw new UnauthorizedException('Missing job ID in request')
    }

    // Verify the token and get claims (this is synchronous - JWT verification)
    const claims = this.workerJobService.verifyWorkerJobToken(token, jobId)

    // Attach claims to request for use in controllers
    request.workerJobClaims = claims

    return true
  }
}

// Extend Express Request type to include worker job claims
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      workerJobClaims?: {
        jobId: string
        taskId: string
        appIdentifier: string
        allowedUploads: Record<string, string[]>
      }
    }
  }
}
