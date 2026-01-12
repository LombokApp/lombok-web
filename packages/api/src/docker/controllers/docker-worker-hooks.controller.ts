import { ZodValidationPipe } from '@anatine/zod-nestjs'
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
import { ApiStandardErrorResponses } from 'src/shared/decorators/api-standard-error-responses.decorator'

import {
  DiscriminatedDockerJobCompleteRequestDTO,
  DockerJobCompleteRequestDTO,
} from '../dto/docker-job-complete-request.dto'
import { DockerJobPresignedUrlsRequestDTO } from '../dto/docker-job-presigned-urls-request.dto'
import { DockerJobPresignedUrlsResponseDTO } from '../dto/docker-job-presigned-urls-response.dto'
import { DockerJobGuard } from '../guards/docker-job.guard'
import { DockerWorkerHookService } from '../services/docker-worker-hook.service'

@Controller('/api/v1/docker/jobs')
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
  @Post('/:jobId/request-presigned-urls')
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
  @Post('/:jobId/start')
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
  @Post('/:jobId/complete')
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
            outputFiles: body.outputFiles,
          },
    )
  }
}
