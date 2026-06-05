import {
  Controller,
  Get,
  Query,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import express from 'express'
import { ZodValidationPipe } from 'nestjs-zod'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import { ApiStandardErrorResponses } from 'src/shared/decorators/api-standard-error-responses.decorator'

import { BridgeLogsQueryParamsDTO } from '../dto/bridge-logs-query-params.dto'
import { DockerSessionsListQueryParamsDTO } from '../dto/docker-sessions-list-query-params.dto'
import {
  BridgeLogListResponse,
  DockerSessionListResponse,
} from '../dto/responses/bridge-observability-responses.dto'
import { DockerClientService } from '../services/client/docker-client.service'
import {
  type BridgeLogEntry,
  DockerBridgeService,
} from '../services/docker-bridge.service'

function assertAdmin(req: express.Request): void {
  if (!req.user?.isAdmin) {
    throw new UnauthorizedException()
  }
}

/** Heartbeat keeps the long-lived stream past nginx's default 60s idle timeout. */
const STREAM_HEARTBEAT_MS = 15000

@Controller('/api/v1/server')
@ApiTags('AdminBridgeObservability')
@ApiBearerAuth()
@UsePipes(ZodValidationPipe)
@UseGuards(AuthGuard)
@ApiStandardErrorResponses()
export class AdminBridgeLogsController {
  constructor(
    private readonly dockerBridgeService: DockerBridgeService,
    private readonly dockerClientService: DockerClientService,
  ) {}

  @Get('docker-sessions')
  @ApiOperation({ summary: 'List all docker bridge tunnel sessions (admin)' })
  @ApiOkResponse({ type: DockerSessionListResponse })
  async listSessions(
    @Req() req: express.Request,
    @Query() query: DockerSessionsListQueryParamsDTO,
  ): Promise<DockerSessionListResponse> {
    assertAdmin(req)
    const result = await this.dockerClientService.listSessions(query)
    return { result }
  }

  @Get('bridge-logs')
  @ApiOperation({ summary: 'Recent docker bridge process log lines (admin)' })
  @ApiOkResponse({ type: BridgeLogListResponse })
  bridgeLogs(
    @Req() req: express.Request,
    @Query() query: BridgeLogsQueryParamsDTO,
  ): BridgeLogListResponse {
    assertAdmin(req)
    return { result: this.dockerBridgeService.getRecentLogs(query) }
  }

  @Get('bridge-logs/stream')
  @ApiExcludeEndpoint() // raw ndjson stream — consumed by the UI via fetch, not the typed client
  streamBridgeLogs(
    @Req() req: express.Request,
    @Res() res: express.Response,
  ): void {
    assertAdmin(req)

    res.setHeader('Content-Type', 'application/x-ndjson')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('X-Accel-Buffering', 'no') // disable nginx buffering for this response
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    let paused = false
    let cleanedUp = false

    // Drop-on-backpressure: a slow consumer is never queued past the socket
    // buffer. Missed lines remain recoverable via the snapshot endpoint. A dead
    // socket surfaces via res 'close'/'error', which drives cleanup.
    const writeEntry = (entry: BridgeLogEntry): void => {
      if (cleanedUp || paused) {
        return
      }
      let ok: boolean
      try {
        ok = res.write(`${JSON.stringify(entry)}\n`)
      } catch {
        return
      }
      if (!ok) {
        paused = true
        res.once('drain', () => {
          paused = false
        })
      }
    }

    // Backlog first, then live tail.
    for (const entry of this.dockerBridgeService.getRecentLogs()) {
      writeEntry(entry)
    }
    const unsubscribe = this.dockerBridgeService.subscribeLogs(writeEntry)

    const heartbeat = setInterval(() => {
      if (cleanedUp) {
        return
      }
      try {
        res.write('\n') // empty ndjson record the client skips
      } catch {
        // res 'close'/'error' will drive cleanup
      }
    }, STREAM_HEARTBEAT_MS)

    const cleanup = (): void => {
      if (cleanedUp) {
        return
      }
      cleanedUp = true
      clearInterval(heartbeat)
      unsubscribe()
    }

    req.on('close', cleanup)
    res.on('close', cleanup)
    res.on('error', cleanup)
  }
}
