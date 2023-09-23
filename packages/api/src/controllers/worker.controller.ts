import type {
  ContentAttributesType,
  ContentMetadataType,
} from '@stellariscloud/types'
import {
  Body,
  Controller,
  Get,
  OperationId,
  Path,
  Post,
  Response,
  Route,
  Security,
  Tags,
} from 'tsoa'
import { Lifecycle, scoped } from 'tsyringe'

import { AuthScheme } from '../domains/auth/constants/scheme.constants'
import { FolderOperationService } from '../domains/folder-operation/services/folder-operation.service'
import type { ErrorResponse } from '../transfer-objects/error-response.dto'

export interface OperationCompletePayload {
  error: string
  messsage: string
}

export interface MetadataUploadUrlsResponse {
  folderId: string
  objectKey: string
  urls: { [key: string]: string }
}

export interface OutputUploadUrlsResponse {
  folderId: string
  objectKey: string
  url: string
}

export interface CreateOutputUploadUrlsPayload {
  outputFiles: {
    folderId: string
    objectKey: string
  }[]
}

export interface CreateMetadataUploadUrlsPayload {
  contentHash: string
  metadataFiles: {
    folderId: string
    objectKey: string
    metadataHashes: { [key: string]: string }
  }[]
}

export interface ContentAttibutesPayload {
  folderId: string
  objectKey: string
  hash: string
  attributes: ContentAttributesType
}

export interface ContentMetadataPayload {
  folderId: string
  objectKey: string
  hash: string
  metadata: ContentMetadataType
}

@scoped(Lifecycle.ContainerScoped)
@Route('worker')
@Tags('Worker')
export class WorkerController extends Controller {
  constructor(private readonly folderOperationService: FolderOperationService) {
    super()
  }

  @Security(AuthScheme.WorkerServiceToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('startJob')
  @Get('/:operationId/start')
  async startJob(@Path() operationId: string) {
    const result = await this.folderOperationService.registerOperationStart({
      operationId,
    })
    return result
  }

  @Security(AuthScheme.WorkerServiceToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('completeJob')
  @Post('/:operationId/complete')
  async completeJob(@Path() operationId: string) {
    await this.folderOperationService.registerOperationComplete(operationId)
  }

  @Security(AuthScheme.WorkerServiceToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('createOutputUploadUrls')
  @Post('/:operationId/output-upload-urls')
  async createOutputUploadUrls(
    @Path() operationId: string,
    @Body() payload: CreateOutputUploadUrlsPayload,
  ): Promise<{
    outputUploadUrls: OutputUploadUrlsResponse[]
  }> {
    const result =
      await this.folderOperationService.createOperationOutputUploadUrls(
        operationId,
        payload,
      )
    return result
  }

  @Security(AuthScheme.WorkerServiceToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('createMetadataUploadUrls')
  @Post('/:operationId/metadata-upload-urls')
  async createMetadataUploadUrls(
    @Path() operationId: string,
    @Body() payload: CreateMetadataUploadUrlsPayload,
  ): Promise<{
    metadataUploadUrls: MetadataUploadUrlsResponse[]
  }> {
    const result =
      await this.folderOperationService.createOperationMetadataUploadUrls(
        operationId,
        payload,
      )
    return result
  }

  @Security(AuthScheme.WorkerServiceToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('updateContentAttributes')
  @Post('/content-attributes')
  async updateContentAttributes(
    @Body() payload: ContentAttibutesPayload[],
  ): Promise<void> {
    await this.folderOperationService.updateAttributes(payload)
  }

  @Security(AuthScheme.WorkerServiceToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('updateContentMetadata')
  @Post('/content-metadata')
  async updateContentMetadata(
    @Body() payload: ContentMetadataPayload[],
  ): Promise<void> {
    await this.folderOperationService.updateMetadata(payload)
  }
}
