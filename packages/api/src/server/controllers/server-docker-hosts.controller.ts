import { ZodValidationPipe } from '@anatine/zod-nestjs'
import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import { coreConfig } from 'src/core/config'
import { DockerClientService } from 'src/docker/services/client/docker-client.service'
import { DockerJobsService } from 'src/docker/services/docker-jobs.service'
import { ApiStandardErrorResponses } from 'src/shared/decorators/api-standard-error-responses.decorator'

import { DockerContainerJobLogsQueryParamsDTO } from '../dto/docker-container-job-logs-query-params.dto'
import { DockerContainerJobsQueryParamsDTO } from '../dto/docker-container-jobs-query-params.dto'
import { DockerContainerLogsQueryParamsDTO } from '../dto/docker-container-logs-query-params.dto'
import { DockerContainerActionResponse } from '../dto/responses/docker-container-action-response.dto'
import { DockerContainerInspectResponse } from '../dto/responses/docker-container-inspect-response.dto'
import { DockerContainerJobDetailResponse } from '../dto/responses/docker-container-job-detail-response.dto'
import { DockerContainerJobsResponse } from '../dto/responses/docker-container-jobs-response.dto'
import { DockerContainerLogsResponse } from '../dto/responses/docker-container-logs-response.dto'
import { DockerContainerStatsResponse } from '../dto/responses/docker-container-stats-response.dto'
import { DockerContainerWorkerDetailResponse } from '../dto/responses/docker-container-worker-detail-response.dto'
import { DockerContainerWorkersResponse } from '../dto/responses/docker-container-workers-response.dto'
import { DockerHostsConfigResponse } from '../dto/responses/docker-hosts-config-response.dto'
import { DockerHostsStateResponse } from '../dto/responses/docker-hosts-state-response.dto'

@Controller('/api/v1/server/docker-hosts')
@ApiTags('ServerDockerHosts')
@ApiBearerAuth()
@UsePipes(ZodValidationPipe)
@UseGuards(AuthGuard)
@ApiStandardErrorResponses()
export class ServerDockerHostsController {
  constructor(
    @Inject(coreConfig.KEY)
    private readonly _coreConfig: nestjsConfig.ConfigType<typeof coreConfig>,
    private readonly dockerJobsService: DockerJobsService,
    private readonly dockerClientService: DockerClientService,
  ) {}

  /**
   * Get the configured docker hosts.
   */
  @Get()
  getDockerHostsConfig(@Req() req: express.Request): DockerHostsConfigResponse {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }

    const hostConfig = this._coreConfig.dockerHostConfig
    const profileHostAssignments = hostConfig.profileHostAssignments ?? {}

    const hosts = Object.entries(hostConfig.hosts ?? {}).map(
      ([hostId, config]) => {
        const assignedProfiles = Object.entries(profileHostAssignments)
          .filter(([, assignedHostId]) => assignedHostId === hostId)
          .map(([profileKey]) => profileKey)
          .sort()

        const environmentVariableKeys = config.environmentVariables
          ? Object.fromEntries(
              Object.entries(config.environmentVariables).map(
                ([profileKey, variables]) => [
                  profileKey,
                  Object.keys(variables).sort(),
                ],
              ),
            )
          : undefined

        return {
          id: hostId,
          host: config.host,
          type: config.type,
          assignedProfiles,
          networkMode: config.networkMode,
          gpus: config.gpus,
          volumes: config.volumes,
          extraHosts: config.extraHosts,
          environmentVariableKeys,
        }
      },
    )

    return {
      profileHostAssignments:
        Object.keys(profileHostAssignments).length > 0
          ? profileHostAssignments
          : undefined,
      hosts,
    }
  }

  /**
   * Get the current runtime state of docker hosts.
   */
  @Get('/state')
  async getDockerHostsState(
    @Req() req: express.Request,
  ): Promise<DockerHostsStateResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }

    return {
      hosts: await this.dockerJobsService.getDockerHostStates(),
    }
  }

  /**
   * Get logs for a container running on a docker host.
   */
  @Get('/:hostId/containers/:containerId/logs')
  async getDockerContainerLogs(
    @Req() req: express.Request,
    @Param('hostId') hostId: string,
    @Param('containerId') containerId: string,
    @Query() query: DockerContainerLogsQueryParamsDTO,
  ): Promise<DockerContainerLogsResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }

    const entries = await this.dockerClientService.getContainerLogs(
      hostId,
      containerId,
      {
        tail: query.tail ?? 200,
        timestamps: query.timestamps === 'true',
      },
    )

    return { entries }
  }

  /**
   * Get resource usage for a container.
   */
  @Get('/:hostId/containers/:containerId/stats')
  async getDockerContainerStats(
    @Req() req: express.Request,
    @Param('hostId') hostId: string,
    @Param('containerId') containerId: string,
  ): Promise<DockerContainerStatsResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }

    const stats = await this.dockerClientService.getContainerStats(
      hostId,
      containerId,
    )

    return { stats }
  }

  /**
   * Get inspection details for a container.
   */
  @Get('/:hostId/containers/:containerId/inspect')
  async getDockerContainerInspect(
    @Req() req: express.Request,
    @Param('hostId') hostId: string,
    @Param('containerId') containerId: string,
  ): Promise<DockerContainerInspectResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }

    const inspect = await this.dockerClientService.getContainerInspect(
      hostId,
      containerId,
    )
    const gpuInfo = await this.dockerClientService.getContainerGpuInfo(
      hostId,
      containerId,
      inspect,
    )

    return { inspect, gpuInfo }
  }

  /**
   * List HTTP workers for a container.
   */
  @Get('/:hostId/containers/:containerId/workers')
  async getDockerContainerWorkers(
    @Req() req: express.Request,
    @Param('hostId') hostId: string,
    @Param('containerId') containerId: string,
  ): Promise<DockerContainerWorkersResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }

    const filePaths =
      await this.dockerJobsService.listContainerWorkerStateFiles(
        hostId,
        containerId,
      )

    const workers = filePaths
      .map((filePath) => {
        const fileName = filePath.split('/').pop() ?? filePath
        const workerId = fileName.endsWith('.json')
          ? fileName.slice(0, -'.json'.length)
          : fileName
        if (!workerId.startsWith('http_')) {
          return null
        }
        const port = Number.parseInt(workerId.slice('http_'.length), 10)
        if (!Number.isFinite(port) || port <= 0) {
          return null
        }
        return { workerId, port, filePath }
      })
      .filter((worker): worker is NonNullable<typeof worker> => worker !== null)

    return { workers }
  }

  /**
   * Get worker state and recent jobs for a worker.
   */
  @Get('/:hostId/containers/:containerId/workers/:workerId')
  async getDockerContainerWorkerDetail(
    @Req() req: express.Request,
    @Param('hostId') hostId: string,
    @Param('containerId') containerId: string,
    @Param('workerId') workerId: string,
    @Query() query: DockerContainerJobsQueryParamsDTO,
  ): Promise<DockerContainerWorkerDetailResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }

    let workerState: unknown
    let workerStateError: string | undefined
    try {
      workerState = await this.dockerJobsService.getContainerWorkerState(
        hostId,
        containerId,
        workerId,
      )
    } catch (error) {
      workerStateError = error instanceof Error ? error.message : String(error)
    }

    let jobs: { jobId: string; filePath: string }[] = []
    let jobsError: string | undefined
    try {
      const limit = query.limit ?? 20
      const filePaths =
        await this.dockerJobsService.listContainerWorkerJobStateFiles(
          hostId,
          containerId,
          workerId,
        )
      jobs = filePaths.slice(0, limit).map((filePath) => {
        const fileName = filePath.split('/').pop() ?? filePath
        const jobId = fileName.endsWith('.json')
          ? fileName.slice(0, -'.json'.length)
          : fileName
        return { jobId, filePath }
      })
    } catch (error) {
      jobsError = error instanceof Error ? error.message : String(error)
    }

    return {
      workerState,
      workerStateError,
      jobs,
      jobsError,
    }
  }

  /**
   * List recent job state files for a container.
   */
  @Get('/:hostId/containers/:containerId/jobs')
  async getDockerContainerJobs(
    @Req() req: express.Request,
    @Param('hostId') hostId: string,
    @Param('containerId') containerId: string,
    @Query() query: DockerContainerJobsQueryParamsDTO,
  ): Promise<DockerContainerJobsResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }

    const limit = query.limit ?? 20
    const filePaths = await this.dockerJobsService.listContainerJobStateFiles(
      hostId,
      containerId,
    )

    const jobs = filePaths
      .filter((filePath) => !filePath.endsWith('.result.json'))
      .slice(0, limit)
      .map((filePath) => {
        const fileName = filePath.split('/').pop() ?? filePath
        const jobId = fileName.endsWith('.json')
          ? fileName.slice(0, -'.json'.length)
          : fileName
        return { jobId, filePath }
      })

    return { jobs }
  }

  /**
   * Get job state and log details for a container job.
   */
  @Get('/:hostId/containers/:containerId/jobs/:jobId')
  async getDockerContainerJobDetail(
    @Req() req: express.Request,
    @Param('hostId') hostId: string,
    @Param('containerId') containerId: string,
    @Param('jobId') jobId: string,
    @Query() query: DockerContainerJobLogsQueryParamsDTO,
  ): Promise<DockerContainerJobDetailResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }

    let state: unknown
    let stateError: string | undefined
    try {
      state = await this.dockerJobsService.getContainerJobState(
        hostId,
        containerId,
        jobId,
      )
    } catch (error) {
      stateError = error instanceof Error ? error.message : String(error)
    }

    let entries: { stream: 'stdout' | 'stderr'; text: string }[] = []
    let logError: string | undefined
    try {
      const logResult = await this.dockerJobsService.getContainerJobLogEntries(
        hostId,
        containerId,
        jobId,
        query.tail,
      )
      entries = logResult.entries
      logError = logResult.logError
    } catch (error) {
      logError = error instanceof Error ? error.message : String(error)
    }

    return {
      state,
      stateError,
      entries,
      logError,
    }
  }

  /**
   * Start a container.
   */
  @Post('/:hostId/containers/:containerId/start')
  async startDockerContainer(
    @Req() req: express.Request,
    @Param('hostId') hostId: string,
    @Param('containerId') containerId: string,
  ): Promise<DockerContainerActionResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }

    await this.dockerClientService.startContainer(hostId, containerId)
    return { success: true }
  }

  /**
   * Stop a container.
   */
  @Post('/:hostId/containers/:containerId/stop')
  async stopDockerContainer(
    @Req() req: express.Request,
    @Param('hostId') hostId: string,
    @Param('containerId') containerId: string,
  ): Promise<DockerContainerActionResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }

    await this.dockerClientService.stopContainer(hostId, containerId)
    return { success: true }
  }

  /**
   * Restart a container.
   */
  @Post('/:hostId/containers/:containerId/restart')
  async restartDockerContainer(
    @Req() req: express.Request,
    @Param('hostId') hostId: string,
    @Param('containerId') containerId: string,
  ): Promise<DockerContainerActionResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }

    await this.dockerClientService.restartContainer(hostId, containerId)
    return { success: true }
  }

  /**
   * Remove a container.
   */
  @Post('/:hostId/containers/:containerId/remove')
  async removeDockerContainer(
    @Req() req: express.Request,
    @Param('hostId') hostId: string,
    @Param('containerId') containerId: string,
  ): Promise<DockerContainerActionResponse> {
    if (!req.user?.isAdmin) {
      throw new UnauthorizedException()
    }

    await this.dockerClientService.removeContainer(hostId, containerId, {
      force: true,
    })
    return { success: true }
  }
}
