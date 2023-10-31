import type { FolderOperationName } from '@stellariscloud/workers'
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
import { FolderPermissionMissingError } from '../domains/folder/errors/folder.error'
import type { SignedURLsRequest } from '../domains/folder/services/folder.service'
import {
  FolderPermissionName,
  FolderService,
} from '../domains/folder/services/folder.service'
import type { FolderData } from '../domains/folder/transfer-objects/folder.dto'
import type { FolderObjectData } from '../domains/folder/transfer-objects/folder-object.dto'
import { transformFolderToFolderDTO } from '../domains/folder/transforms/folder-dto.transform'
import { transformFolderObjectToFolderObjectDTO } from '../domains/folder/transforms/folder-object-dto.transform'
import {
  FolderOperationSort,
  FolderOperationStatus,
} from '../domains/folder-operation/constants/folder-operation.constants'
import { FolderOperationService } from '../domains/folder-operation/services/folder-operation.service'
import type { FolderOperationData } from '../domains/folder-operation/transfer-objects/folder-operation.dto'
import { transformFolderOperationToFolderOperationDTO } from '../domains/folder-operation/transforms/folder-operation-dto.transform'
import type { UserLocationInputData } from '../domains/storage-location/transfer-objects/s3-location.dto'
import { UnauthorizedError } from '../errors/auth.error'
import type { ErrorResponse } from '../transfer-objects/error-response.dto'
import type { ListResponseMeta } from '../transfer-objects/list-response.dto'

export interface FolderAndPermission {
  folder: FolderData
  permissions: string[]
}

export interface FolderOperationsResponse {
  meta: { totalCount: number }
  result: FolderOperationData[]
}

export interface ListFoldersResponse {
  meta: { totalCount: number }
  result: FolderAndPermission[]
}

export interface FolderOperationRequestPayload {
  operationName: FolderOperationName
  operationData: { [key: string]: any }
}

@scoped(Lifecycle.ContainerScoped)
@Route('folders')
@Tags('Folders')
export class FoldersController extends Controller {
  constructor(
    private readonly folderService: FolderService,
    private readonly folderOperationService: FolderOperationService,
  ) {
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
      name: string
      contentLocation: UserLocationInputData
      metadataLocation?: UserLocationInputData
    },
  ): Promise<{ folder: FolderData }> {
    if (!req.user) {
      throw new UnauthorizedError()
    }
    const folder = await this.folderService.createFolder({
      userId: req.user.id,
      body,
    })
    return { folder }
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('getFolder')
  @Get('/:folderId')
  async getFolder(@Path() folderId: string, @Request() req: Express.Request) {
    if (!req.user) {
      throw new UnauthorizedError()
    }
    const result = await this.folderService.getFolderAsUser({
      folderId,
      userId: req.user.id,
    })
    return {
      folder: transformFolderToFolderDTO(result.folder),
      permissions: result.permissions,
    }
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('listFolders')
  @Get()
  async listFolders(@Request() req: Express.Request) {
    if (!req.user) {
      throw new UnauthorizedError()
    }
    const result = await this.folderService.listFoldersAsUser({
      userId: req.user.id,
    })
    return {
      meta: result.meta,
      result: result.result.map((f) => ({
        folder: transformFolderToFolderDTO(f.folder),
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
    if (!req.user) {
      throw new UnauthorizedError()
    }
    await this.folderService.deleteFolder({
      userId: req.user.id,
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
  ): Promise<{
    totalCount: number
    totalSizeBytes: number
  }> {
    if (!req.user) {
      throw new UnauthorizedError()
    }
    const result = await this.folderService.getFolderMetadata({
      userId: req.user.id,
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
  ): Promise<FolderObjectData> {
    if (!req.user) {
      throw new UnauthorizedError()
    }
    const result = await this.folderService.getFolderObjectAsUser({
      userId: req.user.id,
      folderId,
      objectKey,
    })
    return transformFolderObjectToFolderObjectDTO(result)
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('enqueueFolderOperation')
  @Post('/:folderId/operations')
  async enqueueFolderOperation(
    @Request() req: Express.Request,
    @Path() folderId: string,
    @Body() folderOperation: FolderOperationRequestPayload,
  ): Promise<FolderOperationData> {
    if (!req.user) {
      throw new UnauthorizedError()
    }
    const result = await this.folderService.enqueueFolderOperation({
      userId: req.user.id,
      folderId,
      folderOperation,
    })
    return transformFolderOperationToFolderOperationDTO(result)
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
    if (!req.user) {
      throw new UnauthorizedError()
    }
    await this.folderService.deleteFolderObjectAsUser({
      userId: req.user.id,
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
    @Query() offset?: number,
    @Query() limit?: number,
  ): Promise<{ result: FolderObjectData[]; meta: ListResponseMeta }> {
    if (!req.user) {
      throw new UnauthorizedError()
    }
    const { result, meta } = await this.folderService.listFolderObjectsAsUser(
      req.user,
      {
        folderId,
        search,
        offset,
        limit,
      },
    )
    return {
      meta,
      result: result.map((o) => transformFolderObjectToFolderObjectDTO(o)),
    }
  }

  // @Security(AuthScheme.AccessToken)
  // @Response<ErrorResponse>('4XX')
  // @OperationId('createFolderShare')
  // @Post('/:folderId/shares')
  // async createFolderShare(
  //   @Request() req: Express.Request,
  //   @Path() folderId: string,
  //   @Body() share: CreateFolderSharePayload,
  // ) {
  //   const result = await this.folderService.createFolderShareAsUser({
  //     userId: req.viewer.userId,
  //     folderId,
  //     share,
  //   })
  //   return result.toFolderShareData()
  // }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('indexAllContent')
  @Post('/:folderId/index-all')
  async indexAllContent(
    @Request() req: Express.Request,
    @Path() folderId: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedError()
    }
    await this.folderService.indexAllUnindexedContent({
      userId: req.user.id,
      folderId,
    })
    return true
  }

  // @Security(AuthScheme.AccessToken)
  // @Response<ErrorResponse>('4XX')
  // @OperationId('deleteFolderShare')
  // @Delete('/:folderId/shares/:shareId')
  // async deleteFolderShare(
  //   @Request() req: Express.Request,
  //   @Path() folderId: string,
  //   @Path() shareId: string,
  // ) {
  //   await this.folderService.deleteFolderShareAsUser({
  //     userId: req.viewer.userId,
  //     folderId,
  //     shareId,
  //   })
  //   return { success: true }
  // }

  // @Security(AuthScheme.AccessToken)
  // @Response<ErrorResponse>('4XX')
  // @OperationId('updateFolderShare')
  // @Put('/:folderId/shares/:shareId')
  // async updateFolderShare(
  //   @Request() req: Express.Request,
  //   @Path() folderId: string,
  //   @Path() shareId: string,
  //   @Body() share: UpdateFolderSharePayload,
  // ) {
  //   return this.folderService
  //     .updateFolderShareAsUser({
  //       userId: req.viewer.userId,
  //       folderId,
  //       shareId,
  //       shareConfiguration: share.shareConfiguration,
  //     })
  //     .then((result) => result.toFolderShareData())
  // }

  // @Security(AuthScheme.AccessToken)
  // @Response<ErrorResponse>('4XX')
  // @OperationId('listFolderShares')
  // @Get('/:folderId/shares')
  // async listFolderShares(
  //   @Request() req: Express.Request,
  //   @Path() folderId: string,
  // ) {
  //   const result = await this.folderService.listFolderShares({
  //     userId: req.viewer.userId,
  //     folderId,
  //   })
  //   return {
  //     ...result,
  //     result: result.result.map((f) => f.toFolderShareData()),
  //   }
  // }

  // @Security(AuthScheme.AccessToken)
  // @Response<ErrorResponse>('4XX')
  // @OperationId('listTags')
  // @Get('/:folderId/tags')
  // async listTags(@Request() req: Express.Request, @Path() folderId: string) {
  //   const result = await this.folderService.listTags({
  //     userId: req.viewer.userId,
  //     folderId,
  //   })
  //   return {
  //     ...result,
  //     result: result.result.map((f) => f.toObjectTagData()),
  //   }
  // }

  // @Security(AuthScheme.AccessToken)
  // @Response<ErrorResponse>('4XX')
  // @OperationId('createTag')
  // @Post('/:folderId/tags')
  // async createTag(
  //   @Request() req: Express.Request,
  //   @Path() folderId: string,
  //   @Body() body: { name: string },
  // ) {
  //   const objectTag = await this.folderService.createTag({
  //     userId: req.viewer.userId,
  //     folderId,
  //     body,
  //   })
  //   return objectTag.toObjectTagData()
  // }

  // @Security(AuthScheme.AccessToken)
  // @Response<ErrorResponse>('4XX')
  // @OperationId('updateTag')
  // @Post('/:folderId/tags/:tagId')
  // async updateTag(
  //   @Request() req: Express.Request,
  //   @Path() folderId: string,
  //   @Path() tagId: string,
  //   @Body() body: { name: string },
  // ) {
  //   const objectTag = await this.folderService.updateTag({
  //     userId: req.viewer.userId,
  //     tagId,
  //     folderId,
  //     body,
  //   })
  //   return objectTag.toObjectTagData()
  // }

  // @Security(AuthScheme.AccessToken)
  // @Response<ErrorResponse>('4XX')
  // @OperationId('deleteTag')
  // @Delete('/:folderId/tags/:tagId')
  // async deleteTag(
  //   @Request() req: Express.Request,
  //   @Path() folderId: string,
  //   @Path() tagId: string,
  // ) {
  //   await this.folderService.deleteTag({
  //     userId: req.viewer.userId,
  //     folderId,
  //     tagId,
  //   })
  //   return { success: true }
  // }

  // @Security(AuthScheme.AccessToken)
  // @Response<ErrorResponse>('4XX')
  // @OperationId('tagObject')
  // @Post('/:folderId/objects/:objectKey/:tagId')
  // async tagObjectAsUser(
  //   @Request() req: Express.Request,
  //   @Path() folderId: string,
  //   @Path() objectKey: string,
  //   @Path() tagId: string,
  // ) {
  //   await this.folderService.tagObject({
  //     userId: req.viewer.userId,
  //     folderId,
  //     objectKey,
  //     tagId,
  //   })
  //   return { success: true }
  // }

  // @Security(AuthScheme.AccessToken)
  // @Response<ErrorResponse>('4XX')
  // @OperationId('untagObject')
  // @Delete('/:folderId/objects/:objectKey/:tagId')
  // async untagObjectAsUser(
  //   @Request() req: Express.Request,
  //   @Path() folderId: string,
  //   @Path() objectKey: string,
  //   @Path() tagId: string,
  // ) {
  //   await this.folderService.untagObject({
  //     userId: req.viewer.userId,
  //     folderId,
  //     objectKey,
  //     tagId,
  //   })
  //   return { success: true }
  // }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('refreshFolderObjectS3Metadata')
  @Put('/:folderId/objects/:objectKey')
  async refreshFolderObjectS3Metadata(
    @Request() req: Express.Request,
    @Path() folderId: string,
    @Path() objectKey: string,
    @Body() body: { eTag?: string },
  ): Promise<FolderObjectData> {
    if (!req.user) {
      throw new UnauthorizedError()
    }
    return this.folderService.refreshFolderObjectS3MetadataAsUser(
      req.user.id,
      folderId,
      objectKey,
      body.eTag,
    )
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('refreshFolder')
  @Post('/:folderId/refresh')
  async refreshFolder(
    @Request() req: Express.Request,
    @Path() folderId: string,
  ): Promise<true> {
    if (!req.user) {
      throw new UnauthorizedError()
    }
    const result = await this.folderService.getFolderAsUser({
      folderId,
      userId: req.user.id,
    })
    if (result.permissions.includes(FolderPermissionName.FOLDER_REFRESH)) {
      await this.folderService.queueRefreshFolder(result.folder.id, req.user.id)
    } else {
      throw new FolderPermissionMissingError()
    }
    return true
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('createPresignedUrls')
  @Post('/:folderId/presigned-urls')
  createPresignedUrls(
    @Request() req: Express.Request,
    @Path() folderId: string,
    @Body() body: SignedURLsRequest[],
  ): Promise<string[]> {
    if (!req.user) {
      throw new UnauthorizedError()
    }
    return this.folderService.createPresignedUrlsAsUser(
      req.user.id,
      folderId,
      body,
    )
  }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('createSocketAuthentication')
  @Post('/:folderId/socket-auth')
  createSocketAuthentication(
    @Request() req: Express.Request,
    @Path() folderId: string,
  ) {
    if (!req.user) {
      throw new UnauthorizedError()
    }
    return this.folderService.createSocketAuthenticationAsUser(
      req.user.id,
      folderId,
    )
  }

  // @Security(AuthScheme.AccessToken)
  // @Response<ErrorResponse>('4XX')
  // @OperationId('getFolderOperation')
  // @Get('/:folderId/:folderOperationId')
  // async getFolderOperation(
  //   @Path() folderId: string,
  //   @Path() folderOperationId: string,
  //   @Request() req: Express.Request,
  // ) {
  //   const _folder = await this.folderService.getFolderAsUser({
  //     userId: req.viewer.id,
  //     folderId,
  //   })
  //   const result = await this.folderOperationService.getFolderOperationAsUser({
  //     folderId,
  //     folderOperationId,
  //   })
  //   return result.toFolderOperationData()
  // }

  @Security(AuthScheme.AccessToken)
  @Response<ErrorResponse>('4XX')
  @OperationId('listFolderOperations')
  @Get('/:folderId/operations')
  async listFolderOperations(
    @Request() req: Express.Request,
    @Path() folderId: string,
    @Query() sort?: FolderOperationSort,
    @Query() status?: FolderOperationStatus,
    @Query() limit?: number,
    @Query() offset?: number,
  ): Promise<FolderOperationsResponse> {
    if (!req.user) {
      throw new UnauthorizedError()
    }
    const result = await this.folderOperationService.listFolderOperationsAsUser(
      req.user,
      {
        folderId,
        sort,
        status,
        limit,
        offset,
      },
    )
    return {
      meta: result.meta,
      result: result.result.map((folderOperation) =>
        transformFolderOperationToFolderOperationDTO(folderOperation),
      ),
    }
  }
}
