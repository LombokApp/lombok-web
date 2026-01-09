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
import { ApiStandardErrorResponses } from 'src/platform/decorators/api-standard-error-responses.decorator'

import {
  DiscriminatedWorkerJobCompleteRequestDTO,
  WorkerJobCompleteRequestDTO,
} from '../dto/worker-job-complete-request.dto'
import { WorkerJobCompleteResponseDTO } from '../dto/worker-job-complete-response.dto'
import { WorkerJobUploadUrlsRequestDTO } from '../dto/worker-job-presigned-urls-request.dto'
import { WorkerJobPresignedUrlsResponseDTO } from '../dto/worker-job-presigned-urls-response.dto'
import { WorkerJobStartedResponseDTO } from '../dto/worker-job-started-response.dto'
import { WorkerJobGuard } from '../guards/worker-job.guard'
import { WorkerJobService } from '../services/worker-job.service'

@Controller('/api/v1/docker/jobs')
@ApiTags('WorkerJobs')
@UsePipes(ZodValidationPipe)
@ApiBearerAuth()
@ApiStandardErrorResponses()
export class WorkerJobsController {
  constructor(private readonly workerJobService: WorkerJobService) {}

  /**
   * Request presigned URLs for uploading files to S3.
   * Called by the worker agent after a job produces output files.
   */
  @Post('/:jobId/request-presigned-urls')
  @UseGuards(WorkerJobGuard)
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
    @Body() body: WorkerJobUploadUrlsRequestDTO,
  ): Promise<WorkerJobPresignedUrlsResponseDTO> {
    const claims = req.workerJobClaims
    if (!claims) {
      throw new BadRequestException('Worker job claims not found')
    }

    const urls = await this.workerJobService.requestPresignedStorageUrls(
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
  @UseGuards(WorkerJobGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Signal job start',
    description:
      'Marks the associated task as started. The job token must be valid.',
  })
  async startJob(
    @Req() req: Request,
    @Param('jobId') _jobId: string,
  ): Promise<WorkerJobStartedResponseDTO> {
    const claims = req.workerJobClaims
    if (!claims) {
      throw new BadRequestException('Worker job claims not found')
    }

    await this.workerJobService.startJob(claims)

    return { ok: true }
  }

  /**
   * Signal that a worker job has completed.
   * Called by the worker agent after job execution finishes.
   */
  @Post('/:jobId/complete')
  @UseGuards(WorkerJobGuard)
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
    @Body() body: WorkerJobCompleteRequestDTO,
  ): Promise<WorkerJobCompleteResponseDTO> {
    const claims = req.workerJobClaims
    if (!claims) {
      throw new BadRequestException('Worker job claims not found')
    }

    const bodyDiscriminated = body as DiscriminatedWorkerJobCompleteRequestDTO

    await this.workerJobService.completeJob(
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

    return { ok: true }
  }
}
