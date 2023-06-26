import {
  Body,
  Controller,
  Delete,
  Get,
  OperationId,
  Path,
  Post,
  Put,
  Query,
  Request,
  Response,
  Route,
  Security,
  Tags,
} from 'tsoa'
import { Lifecycle, scoped } from 'tsyringe'

import { AuthScheme } from '../domains/auth/constants/scheme.constants'
import {
  FolderService,
  SignedURLsRequestPayload,
} from '../domains/folder/services/folder.service'
import type { FolderData } from '../domains/folder/transfer-objects/folder.dto'
import { FolderObjectContentMetadata } from '../domains/folder/transfer-objects/folder-object.dto'
import {
  CreateFolderSharePayload,
  UpdateFolderSharePayload,
} from '../domains/folder/transfer-objects/folder-share.dto'
import type { ErrorResponse } from '../transfer-objects/error-response.dto'

export interface CreateConversationBody {
  content: string
  importPath: string
  lineNumber: number
}

export interface CreateCommentBody {
  content: string
}

export interface FolderAndPermission {
  folder: FolderData
  permissions: string[]
}

export interface ListFoldersResponse {
  meta: { totalCount: number }
  result: FolderAndPermission[]
}

@scoped(Lifecycle.ContainerScoped)
@Route('folders')
@Tags('Folders')
export class FoldersController extends Controller {
  constructor(private readonly folderService: FolderService) {
    super()
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('createFolder')
  @Post()
  async createFolder(
    @Request() req: Express.Request,
    @Body()
    body: {
      s3ConnectionId: string
      name: string
      bucket: string
      prefix?: string
    },
  ) {
    const folder = await this.folderService.createFolder({
      userId: req.viewer.user.id,
      body,
    })
    return { folder: folder.toFolderData() }
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('getFolder')
  @Get('/:folderId')
  async getFolder(@Path() folderId: string, @Request() req: Express.Request) {
    const result = await this.folderService.getFolderAsUser({
      folderId,
      userId: req.viewer.id,
    })
    return {
      folder: result.folder.toFolderData(),
      permissions: result.permissions,
    }
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('listFolders')
  @Get()
  async listFolders(@Request() req: Express.Request) {
    const result = await this.folderService.listFoldersAsUser({
      userId: req.viewer.user.id,
    })
    return {
      meta: result.meta,
      result: result.result.map((f) => ({
        folder: f.folder.toFolderData(),
        permissions: f.permissions as string[],
      })),
    } as ListFoldersResponse
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('deleteFolder')
  @Delete('/:folderId')
  async deleteFolder(
    @Request() req: Express.Request,
    @Path()
    folderId: string,
  ) {
    await this.folderService.deleteFolder({
      userId: req.viewer.user.id,
      folderId,
    })
    return { success: true }
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('getFolderMetadata')
  @Get('/:folderId/metadata')
  async getFolderMetadata(
    @Request() req: Express.Request,
    @Path() folderId: string,
  ) {
    const result = await this.folderService.getFolderMetadata({
      userId: req.viewer.user.id,
      folderId,
    })
    return result
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('getFolderObject')
  @Get('/:folderId/objects/:objectKey')
  async getFolderObject(
    @Request() req: Express.Request,
    @Path() folderId: string,
    @Path() objectKey: string,
  ) {
    const result = await this.folderService.getFolderObject({
      userId: req.viewer.user.id,
      folderId,
      objectKey,
    })
    return result.toFolderObjectData()
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('deleteFolderObject')
  @Delete('/:folderId/objects/:objectKey')
  async deleteFolderObject(
    @Request() req: Express.Request,
    @Path() folderId: string,
    @Path() objectKey: string,
  ) {
    await this.folderService.deleteFolderObject({
      userId: req.viewer.user.id,
      folderId,
      objectKey,
    })
    return { success: true }
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('listFolderObjects')
  @Get('/:folderId/objects')
  async listFolderObjects(
    @Request() req: Express.Request,
    @Path() folderId: string,
    @Query() search?: string,
    @Query() tagId?: string,
    @Query() offset?: number,
    @Query() limit?: number,
  ) {
    const result = await this.folderService.listFolderObjects({
      userId: req.viewer.user.id,
      folderId,
      search,
      tagId,
      offset,
      limit,
    })
    return {
      ...result,
      result: result.result.map((f) => f.toFolderObjectData()),
    }
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('createFolderShare')
  @Post('/:folderId/shares')
  async createFolderShare(
    @Request() req: Express.Request,
    @Path() folderId: string,
    @Body() share: CreateFolderSharePayload,
  ) {
    const result = await this.folderService.createFolderShareAsUser({
      userId: req.viewer.user.id,
      folderId,
      share,
    })
    return result.toFolderShareData()
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('deleteFolderShare')
  @Delete('/:folderId/shares/:shareId')
  async deleteFolderShare(
    @Request() req: Express.Request,
    @Path() folderId: string,
    @Path() shareId: string,
  ) {
    await this.folderService.deleteFolderShareAsUser({
      userId: req.viewer.user.id,
      folderId,
      shareId,
    })
    return { success: true }
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('updateFolderShare')
  @Put('/:folderId/shares/:shareId')
  async updateFolderShare(
    @Request() req: Express.Request,
    @Path() folderId: string,
    @Path() shareId: string,
    @Body() share: UpdateFolderSharePayload,
  ) {
    return this.folderService
      .updateFolderShareAsUser({
        userId: req.viewer.user.id,
        folderId,
        shareId,
        shareConfiguration: share.shareConfiguration,
      })
      .then((result) => result.toFolderShareData())
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('listFolderShares')
  @Get('/:folderId/shares')
  async listFolderShares(
    @Request() req: Express.Request,
    @Path() folderId: string,
  ) {
    const result = await this.folderService.listFolderShares({
      userId: req.viewer.user.id,
      folderId,
    })
    return {
      ...result,
      result: result.result.map((f) => f.toFolderShareData()),
    }
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('listTags')
  @Get('/:folderId/tags')
  async listTags(@Request() req: Express.Request, @Path() folderId: string) {
    const result = await this.folderService.listTags({
      userId: req.viewer.user.id,
      folderId,
    })
    return {
      ...result,
      result: result.result.map((f) => f.toObjectTagData()),
    }
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('createTag')
  @Post('/:folderId/tags')
  async createTag(
    @Request() req: Express.Request,
    @Path() folderId: string,
    @Body() body: { name: string },
  ) {
    const objectTag = await this.folderService.createTag({
      userId: req.viewer.user.id,
      folderId,
      body,
    })
    return objectTag.toObjectTagData()
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('updateTag')
  @Post('/:folderId/tags/:tagId')
  async updateTag(
    @Request() req: Express.Request,
    @Path() folderId: string,
    @Path() tagId: string,
    @Body() body: { name: string },
  ) {
    const objectTag = await this.folderService.updateTag({
      userId: req.viewer.user.id,
      tagId,
      folderId,
      body,
    })
    return objectTag.toObjectTagData()
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('deleteTag')
  @Delete('/:folderId/tags/:tagId')
  async deleteTag(
    @Request() req: Express.Request,
    @Path() folderId: string,
    @Path() tagId: string,
  ) {
    await this.folderService.deleteTag({
      userId: req.viewer.user.id,
      folderId,
      tagId,
    })
    return { success: true }
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('tagObject')
  @Post('/:folderId/objects/:objectKey/:tagId')
  async tagObjectAsUser(
    @Request() req: Express.Request,
    @Path() folderId: string,
    @Path() objectKey: string,
    @Path() tagId: string,
  ) {
    await this.folderService.tagObject({
      userId: req.viewer.user.id,
      folderId,
      objectKey,
      tagId,
    })
    return { success: true }
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('untagObject')
  @Delete('/:folderId/objects/:objectKey/:tagId')
  async untagObjectAsUser(
    @Request() req: Express.Request,
    @Path() folderId: string,
    @Path() objectKey: string,
    @Path() tagId: string,
  ) {
    await this.folderService.untagObject({
      userId: req.viewer.user.id,
      folderId,
      objectKey,
      tagId,
    })
    return { success: true }
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('updateFolderObjectContentMetadata')
  @Put('/:folderId/objects/:objectKey/content-metadata')
  async updateFolderObjectContentMetadata(
    @Request() req: Express.Request,
    @Path() folderId: string,
    @Path() objectKey: string,
    @Body() body: FolderObjectContentMetadata,
  ) {
    const folderObject =
      await this.folderService.saveUpdatedFolderObjectContentMetadataAsUser(
        req.viewer.user.id,
        folderId,
        objectKey,
        body,
      )
    return folderObject.toFolderObjectData()
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('refreshFolderObjectS3Metadata')
  @Put('/:folderId/objects/:objectKey')
  async refreshFolderObjectS3Metadata(
    @Request() req: Express.Request,
    @Path() folderId: string,
    @Path() objectKey: string,
    @Body() body: { eTag?: string },
  ) {
    const folderObject =
      await this.folderService.updateFolderObjectS3MetadataAsUser(
        req.viewer.user.id,
        folderId,
        objectKey,
        body.eTag,
      )
    return folderObject.toFolderObjectData()
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('refreshFolder')
  @Post('/:folderId/refresh')
  async refreshFolder(
    @Request() req: Express.Request,
    @Path() folderId: string,
  ) {
    await this.folderService.queueRefreshFolder(folderId, req.viewer.user.id)
    return true
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('createPresignedURLs')
  @Post('/:folderId/presigned-urls')
  async createPresignedURLs(
    @Request() req: Express.Request,
    @Path() folderId: string,
    @Body() body: SignedURLsRequestPayload,
  ) {
    return this.folderService.createPresignedURLs(
      folderId,
      req.viewer.user.id,
      body,
    )
  }
}
