import {
  All,
  BadRequestException,
  Controller,
  Param,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common'
import { ApiExcludeController } from '@nestjs/swagger'
import type { Request, Response } from 'express'
import * as jwt from 'jsonwebtoken'
import {
  APP_RUNTIME_WORKER_JWT_SUB_PREFIX,
  APP_USER_JWT_SUB_PREFIX,
} from 'src/auth/services/jwt.service'

import { DockerWorkerHookService } from '../services/docker-worker-hook.service'

const BEARER_PREFIX = 'Bearer '

/**
 * Proxy endpoint that allows Docker containers to call app runtime workers
 * directly using their platform token (app or app-user).
 * Replaces the old relay mechanism.
 */
@Controller('/api/v1/apps')
@ApiExcludeController()
export class DockerWorkerApiProxyController {
  constructor(
    private readonly dockerWorkerHooksService: DockerWorkerHookService,
  ) {}

  @All('/worker-api/:workerIdentifier/*')
  async proxyWorkerApi(
    @Param('workerIdentifier') workerIdentifier: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Extract and validate the bearer token
    const authHeader = req.header('Authorization')
    if (!authHeader?.startsWith(BEARER_PREFIX)) {
      throw new UnauthorizedException('Missing or invalid Authorization header')
    }
    const token = authHeader.slice(BEARER_PREFIX.length)

    // Decode (without full verification — the core-worker will verify)
    // to ensure the token's appIdentifier matches the URL parameter.
    let decoded: jwt.JwtPayload
    try {
      decoded = jwt.decode(token) as jwt.JwtPayload
    } catch {
      throw new UnauthorizedException('Invalid token')
    }

    if (!decoded.sub) {
      throw new UnauthorizedException('Token has no subject')
    }

    // Validate appIdentifier matches
    let tokenAppIdentifier: string | undefined
    if (decoded.sub.startsWith(APP_USER_JWT_SUB_PREFIX)) {
      // app_user:{userId}:{appIdentifier}
      const parts = decoded.sub.slice(APP_USER_JWT_SUB_PREFIX.length).split(':')
      tokenAppIdentifier = parts[1]
    } else if (decoded.sub.startsWith(APP_RUNTIME_WORKER_JWT_SUB_PREFIX)) {
      // app_runtime_worker:{appIdentifier}
      tokenAppIdentifier = decoded.sub.slice(
        APP_RUNTIME_WORKER_JWT_SUB_PREFIX.length,
      )
    }

    if (!tokenAppIdentifier) {
      throw new BadRequestException(
        'Token appIdentifier does not match URL appIdentifier',
      )
    }

    // Build the path
    const endpointPath = `${typeof req.params.path === 'string' ? req.params.path : `/${req.params.path?.join('/')}`}`

    // Forward relevant headers (skip hop-by-hop headers)
    const forwardHeaders: Record<string, string> = {}
    const skipHeaders = new Set([
      'host',
      'connection',
      'transfer-encoding',
      'keep-alive',
    ])
    for (const [key, value] of Object.entries(req.headers)) {
      if (!skipHeaders.has(key.toLowerCase()) && typeof value === 'string') {
        forwardHeaders[key] = value
      }
    }

    const result = await this.dockerWorkerHooksService.forwardToWorkerApi({
      appIdentifier: tokenAppIdentifier,
      workerIdentifier,
      path: endpointPath,
      method: req.method,
      headers: forwardHeaders,
      body: req.body as unknown,
    })

    // Send the response directly
    res.status(result.status)
    for (const [key, value] of Object.entries(result.headers)) {
      // Skip content-encoding/transfer-encoding since we're re-serializing
      if (
        key.toLowerCase() !== 'content-encoding' &&
        key.toLowerCase() !== 'transfer-encoding' &&
        key.toLowerCase() !== 'content-length'
      ) {
        res.setHeader(key, value)
      }
    }
    res.json(result.body)
  }
}
