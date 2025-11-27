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

import { WorkerJobCompleteRequestDTO } from '../dto/worker-job-complete-request.dto'
import { WorkerJobCompleteResponseDTO } from '../dto/worker-job-complete-response.dto'
import { WorkerJobUploadUrlsRequestDTO } from '../dto/worker-job-upload-urls-request.dto'
import { WorkerJobUploadUrlsResponseDTO } from '../dto/worker-job-upload-urls-response.dto'
import { WorkerJobGuard } from '../guards/worker-job.guard'
import { WorkerJobService } from '../services/worker-job.service'

@Controller('/api/v1/docker/worker-jobs')
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
  @Post('/:jobId/request-upload-urls')
  @UseGuards(WorkerJobGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request presigned URLs for file uploads',
    description:
      'Returns presigned S3 URLs for uploading job output files. ' +
      'The job token must have permissions for the requested folder/prefix combinations.',
  })
  async requestUploadUrls(
    @Req() req: Request,
    @Param('jobId') _jobId: string,
    @Body() body: WorkerJobUploadUrlsRequestDTO,
  ): Promise<WorkerJobUploadUrlsResponseDTO> {
    const claims = req.workerJobClaims
    if (!claims) {
      throw new BadRequestException('Worker job claims not found')
    }

    const uploads = await this.workerJobService.requestUploadUrls(
      claims,
      body.files,
    )

    return { uploads }
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

    await this.workerJobService.completeJob(claims, {
      success: body.success,
      result: body.result,
      error: body.error,
      uploadedFiles: body.uploadedFiles,
    })

    return { ok: true }
  }
}
