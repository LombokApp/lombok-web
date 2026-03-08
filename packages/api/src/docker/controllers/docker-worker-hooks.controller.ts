import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { ZodValidationPipe } from 'nestjs-zod'
import { ApiStandardErrorResponses } from 'src/shared/decorators/api-standard-error-responses.decorator'

import {
  DiscriminatedDockerJobCompleteRequestDTO,
  DockerJobCompleteRequestDTO,
} from '../dto/docker-job-complete-request.dto'
import { DockerJobPresignedUrlsRequestDTO } from '../dto/docker-job-presigned-urls-request.dto'
import { DockerJobPresignedUrlsResponseDTO } from '../dto/docker-job-presigned-urls-response.dto'
import { DockerJobUpdateRequestDTO } from '../dto/docker-job-update-request.dto'
import { DockerRouteAppContainerRequestDTO } from '../dto/docker-route-app-container-request.dto'
import { DockerRouteAppContainerResponseDTO } from '../dto/docker-route-app-container-response.dto'
import { DockerJobGuard } from '../guards/docker-job.guard'
import { DockerWorkerGuard } from '../guards/docker-worker.guard'
import { DockerWorkerHookService } from '../services/docker-worker-hook.service'

@Controller('/api/v1/docker')
@ApiTags('DockerWorkerHooks')
@UsePipes(ZodValidationPipe)
@ApiBearerAuth()
@ApiStandardErrorResponses()
export class DockerWorkerHooksController {
  constructor(
    private readonly dockerWorkerHooksService: DockerWorkerHookService,
  ) {}

  /**
   * Request presigned URLs for uploading files to S3.
   * Called by the worker agent after a job produces output files.
   */
  @Post('/jobs/:jobId/request-presigned-urls')
  @UseGuards(DockerJobGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request presigned URLs for file operations',
    description:
      'Returns presigned URLs for performing storage operations. ' +
      'The job token must have permissions for the requested folder/prefix/method combinations.',
  })
  async requestPresignedStorageUrls(
    @Req() req: Request,
    @Param('jobId') _jobId: string,
    @Body() body: DockerJobPresignedUrlsRequestDTO,
  ): Promise<DockerJobPresignedUrlsResponseDTO> {
    const claims = req.dockerWorkerClaims
    if (!claims) {
      throw new BadRequestException('Worker job claims not found')
    }

    const urls =
      await this.dockerWorkerHooksService.requestPresignedStorageUrls(
        claims,
        body,
      )

    return urls
  }

  /**
   * Signal that a worker job has started.
   * Called by the worker agent before job execution.
   */
  @Post('/jobs/:jobId/start')
  @UseGuards(DockerJobGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Signal job start',
    description:
      'Marks the associated task as started. The job token must be valid.',
  })
  async startJob(@Req() req: Request, @Param('jobId') _jobId: string) {
    const claims = req.dockerWorkerClaims
    if (!claims) {
      throw new BadRequestException('Worker job claims not found')
    }

    await this.dockerWorkerHooksService.startJob(claims)
  }

  /**
   * Signal that a worker job has completed.
   * Called by the worker agent after job execution finishes.
   */
  @Post('/jobs/:jobId/complete')
  @UseGuards(DockerJobGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Signal job completion',
    description:
      'Signals that a worker job has completed (success or failure). ' +
      'Updates the task status and stores the result/error information.',
  })
  async completeJob(
    @Req() req: Request,
    @Param('jobId') _jobId: string,
    @Body() body: DockerJobCompleteRequestDTO,
  ) {
    const claims = req.dockerWorkerClaims
    if (!claims) {
      throw new BadRequestException('Worker job claims not found')
    }

    const bodyDiscriminated = body as DiscriminatedDockerJobCompleteRequestDTO

    await this.dockerWorkerHooksService.completeJob(
      claims,
      bodyDiscriminated.success
        ? {
            success: true,
            result: bodyDiscriminated.result,
            outputFiles: bodyDiscriminated.outputFiles,
          }
        : {
            success: false,
            error: {
              name: 'Error',
              ...bodyDiscriminated.error,
            },
            outputFiles: bodyDiscriminated.outputFiles,
          },
    )
  }

  /**
   * Send a mid-execution update from a running worker job.
   * Called by the worker agent during job execution to report progress.
   */
  @Post('/jobs/:jobId/update')
  @UseGuards(DockerJobGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Send a mid-execution update from a running worker job',
  })
  async submitUpdate(
    @Req() req: Request,
    @Param('jobId') _jobId: string,
    @Body() body: DockerJobUpdateRequestDTO,
  ): Promise<void> {
    const claims = req.dockerWorkerClaims
    if (!claims) {
      throw new BadRequestException('Worker job claims not found')
    }
    await this.dockerWorkerHooksService.processUpdate(claims, body)
  }

  /**
   * Refresh a container token, returning a new JWT with fresh expiry.
   * Called periodically by the worker agent to keep long-lived containers authenticated.
   */
  @Post('/refresh-container-token')
  @UseGuards(DockerWorkerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh a container token',
    description:
      'Returns a new container token with fresh expiry. ' +
      'The current token must be valid (not expired).',
  })
  async refreshContainerToken(
    @Req() req: Request,
  ): Promise<{ token: string }> {
    const claims = req.dockerContainerClaims
    if (!claims) {
      throw new BadRequestException('Container claims not found')
    }
    return this.dockerWorkerHooksService.refreshContainerToken(claims)
  }

  /**
   * Route a request from an app container to an app runtime worker.
   * This has the platform lookup a pending request on a running container,
   * and forward it to the runtime worker to so the container doesn't need
   * to hold (and refresh) authentication credentials.
   */
  @Post('/relay-request')
  @UseGuards(DockerWorkerGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Route a request from an app container to an app runtime worker',
    description:
      'Routes a request from an app container to an app runtime worker. ' +
      'This has the platform lookup a pending request on a running container, ' +
      "and forward it to the runtime worker to so the container doesn't need " +
      'to hold (and refresh) authentication credentials.',
  })
  async routeAppContainerRequest(
    @Req() req: Request,
    @Body() body: DockerRouteAppContainerRequestDTO,
  ): Promise<DockerRouteAppContainerResponseDTO> {
    const claims = req.dockerContainerClaims
    if (!claims) {
      throw new BadRequestException('Container claims not found')
    }
    return this.dockerWorkerHooksService.routeAppContainerRequest(claims, body)
  }
}
