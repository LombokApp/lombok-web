import {
  Body,
  Controller,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { ZodValidationPipe } from 'nestjs-zod'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import { ApiStandardErrorResponses } from 'src/shared/decorators/api-standard-error-responses.decorator'

import {
  StagingUploadInputDTO,
  StagingUploadResponse,
} from '../dto/staging-upload.dto'
import { StagingUploadService } from '../staging-upload.service'

@Controller('/api/v1/staging-uploads')
@ApiTags('Staging Uploads')
@ApiBearerAuth()
@UsePipes(ZodValidationPipe)
@UseGuards(AuthGuard)
@ApiStandardErrorResponses()
export class StagingUploadController {
  constructor(private readonly stagingUploadService: StagingUploadService) {}

  @Post()
  @ApiOperation({
    summary:
      'Create a presigned staging upload for a given purpose (which fixes the size tier); reference the returned stagingKey in a follow-up create/update request.',
  })
  async createStagingUpload(
    @Req() req: express.Request,
    @Body() body: StagingUploadInputDTO,
  ): Promise<StagingUploadResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    return this.stagingUploadService.createStagingUpload(
      req.user.id,
      body.purpose,
    )
  }
}
