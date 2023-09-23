import {
  Body,
  Controller,
  Get,
  OperationId,
  Path,
  Post,
  Request,
  Response,
  Route,
  Security,
  Tags,
} from 'tsoa'
import { Lifecycle, scoped } from 'tsyringe'

import { AuthScheme } from '../domains/auth/constants/scheme.constants'
import { S3ConnectionService } from '../domains/folder/services/s3-connection.service'
import type { ErrorResponse } from '../transfer-objects/error-response.dto'

@scoped(Lifecycle.ContainerScoped)
@Route('s3-connections')
@Tags('S3Connections')
export class S3ConnectionsController extends Controller {
  constructor(private readonly s3ConnectionService: S3ConnectionService) {
    super()
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('getS3Connection')
  @Get('/:s3ConnectionId')
  async getS3Connection(@Path() s3ConnectionId: string) {
    const result = await this.s3ConnectionService.getS3Connection({
      s3ConnectionId,
    })
    return result.toS3ConnectionData()
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('listS3Connections')
  @Get('/')
  async listS3Connections(@Request() req: Express.Request) {
    const result = await this.s3ConnectionService.listS3Connections({
      userId: req.viewer.user.id,
    })
    return {
      meta: result.meta,
      result: result.result.map((f) => f.toS3ConnectionData()),
    }
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('createS3Connection')
  @Post()
  async createS3Connection(
    @Request() req: Express.Request,
    @Body()
    body: {
      name: string
      accessKeyId: string
      secretAccessKey: string
      endpoint: string
      region: string
    },
  ) {
    const s3Connection = await this.s3ConnectionService.createS3Connection({
      userId: req.viewer.user.id,
      body,
    })
    return s3Connection.toS3ConnectionData()
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('testS3Connection')
  @Post('test')
  async testS3Connection(
    @Request() req: Express.Request,
    @Body()
    body: {
      name: string
      accessKeyId: string
      secretAccessKey: string
      endpoint: string
      region: string
    },
  ) {
    const success = await this.s3ConnectionService.testS3Connection({
      userId: req.viewer.user.id,
      body,
    })
    return { success }
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('deleteS3Connection')
  @Post('/:s3ConnectionId')
  async deleteS3Connection(
    @Request() req: Express.Request,
    @Path()
    s3ConnectionId: string,
  ) {
    await this.s3ConnectionService.deleteS3Connection({
      userId: req.viewer.user.id,
      s3ConnectionId,
    })
    return { success: true }
  }
}
