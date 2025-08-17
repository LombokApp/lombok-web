import { ZodValidationPipe } from '@anatine/zod-nestjs'
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { ApiBearerAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger'
import { FolderPermissionEnum } from '@stellariscloud/types'
import express from 'express'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import {
  AllowedActor,
  AuthGuardConfig,
} from 'src/auth/guards/auth.guard-config'
import { normalizeSortParam } from 'src/platform/utils/sort.util'

import {
  ContentMetadataEntryDTO,
  ExternalMetadataEntryDTO,
  InlineMetadataEntryDTO,
} from '../dto/content-metadata.dto'
import { FolderCreateInputDTO } from '../dto/folder-create-input.dto'
import { FolderCreateSignedUrlInputDTO } from '../dto/folder-create-signed-url-input.dto'
import { FolderObjectsListQueryParamsDTO } from '../dto/folder-objects-list-query-params.dto'
import { FolderShareCreateInputDTO } from '../dto/folder-share-create-input.dto'
import { FolderShareUsersListQueryParamsDTO } from '../dto/folder-shares-list-query-params.dto'
import { FolderUpdateInputDTO } from '../dto/folder-update-input.dto'
import { FoldersListQueryParamsDTO } from '../dto/folders-list-query-params.dto'
import type { FolderCreateResponse } from '../dto/responses/folder-create-response.dto'
import type { FolderCreateSignedUrlsResponse } from '../dto/responses/folder-create-signed-urls-response.dto'
import type { FolderGetMetadataResponse } from '../dto/responses/folder-get-metadata-response.dto'
import type { FolderGetResponse } from '../dto/responses/folder-get-response.dto'
import type { FolderListResponse } from '../dto/responses/folder-list-response.dto'
import type { FolderObjectGetResponse } from '../dto/responses/folder-object-get-response.dto'
import type { FolderObjectListResponse } from '../dto/responses/folder-object-list-response.dto'
import { FolderShareGetResponse } from '../dto/responses/folder-share-get-response.dto'
import { FolderShareListResponse } from '../dto/responses/folder-share-list-response.dto'
import { FolderShareUserListResponse } from '../dto/responses/folder-share-user-list-response.dto'
import type { FolderUpdateResponseDTO } from '../dto/responses/folder-update-response.dto'
import { transformFolderToDTO } from '../dto/transforms/folder.transforms'
import { transformFolderObjectToDTO } from '../dto/transforms/folder-object.transforms'
import { TriggerAppTaskInputDTO } from '../dto/trigger-app-task-input.dto'
import { FolderPermissionUnauthorizedException } from '../exceptions/folder-permission-unauthorized.exception'
import { FolderService } from '../services/folder.service'

@Controller('/api/v1/folders')
@ApiTags('Folders')
@UseGuards(AuthGuard)
@UsePipes(ZodValidationPipe)
@ApiBearerAuth()
@ApiExtraModels(
  InlineMetadataEntryDTO,
  ExternalMetadataEntryDTO,
  ContentMetadataEntryDTO,
)
export class FoldersController {
  constructor(private readonly folderService: FolderService) {}

  /**
   * Get a folder by id.
   */
  @Get('/:folderId')
  async getFolder(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
  ): Promise<FolderGetResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }

    const result = await this.folderService.getFolderAsUser(req.user, folderId)
    return {
      folder: transformFolderToDTO(result.folder),
      permissions: result.permissions,
    }
  }

  /**
   * Check S3 access and update folder accessError
   */
  @Post('/:folderId/check-access')
  async checkFolderAccess(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
  ): Promise<{ ok: boolean }> {
    if (!req.user) {
      throw new UnauthorizedException()
    }

    const { permissions } = await this.folderService.getFolderAsUser(
      req.user,
      folderId,
    )
    if (!permissions.includes(FolderPermissionEnum.FOLDER_EDIT)) {
      throw new UnauthorizedException()
    }
    await this.folderService.checkAndUpdateFolderAccessError(folderId)
    return { ok: true }
  }

  /**
   * Get the metadata for a folder by id.
   */
  @Get('/:folderId/metadata')
  async getFolderMetadata(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
  ): Promise<FolderGetMetadataResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const result = await this.folderService.getFolderMetadata(
      req.user,
      folderId,
    )
    return result
  }

  /**
   * List folders.
   */
  @Get()
  async listFolders(
    @Req() req: express.Request,
    @Query() queryParams: FoldersListQueryParamsDTO,
  ): Promise<FolderListResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const { result, meta } = await this.folderService.listFoldersAsUser(
      req.user,
      {
        ...queryParams,
        sort: normalizeSortParam(queryParams.sort),
      },
    )
    return {
      result: result.map(({ folder, permissions }) => ({
        permissions,
        folder: transformFolderToDTO(folder),
      })),
      meta,
    }
  }

  /**
   * Create a folder.
   */
  @Post()
  async createFolder(
    @Req() req: express.Request,
    @Body() body: FolderCreateInputDTO,
  ): Promise<FolderCreateResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const folder = await this.folderService.createFolder({
      userId: req.user.id,
      body,
    })

    return {
      folder: transformFolderToDTO(folder),
    }
  }

  /**
   * Delete a folder by id.
   */
  @Delete('/:folderId')
  async deleteFolder(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
  ): Promise<void> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    await this.folderService.deleteFolderAsUser(req.user, folderId)
  }

  /**
   * Scan the underlying S3 location and update our local representation of it.
   */
  @Post('/:folderId/reindex')
  async reindexFolder(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
  ): Promise<void> {
    if (!req.user) {
      throw new UnauthorizedException()
    }

    const result = await this.folderService.getFolderAsUser(req.user, folderId)

    if (result.permissions.includes(FolderPermissionEnum.FOLDER_REINDEX)) {
      await this.folderService.queueReindexFolder(result.folder.id, req.user.id)
    } else {
      throw new FolderPermissionUnauthorizedException()
    }
  }

  /**
   * List folder objects by folderId.
   */
  @Get('/:folderId/objects')
  async listFolderObjects(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Query() queryParams: FolderObjectsListQueryParamsDTO,
  ): Promise<FolderObjectListResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }

    const { result, meta } = await this.folderService.listFolderObjectsAsUser(
      req.user,
      {
        folderId,
        ...queryParams,
        sort: normalizeSortParam(queryParams.sort),
      },
    )
    return {
      meta,
      result: result.map((o) => transformFolderObjectToDTO(o)),
    }
  }

  /**
   * Get a folder object by folderId and objectKey.
   */
  @Get('/:folderId/objects/:objectKey')
  async getFolderObject(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Param('objectKey') objectKey: string,
  ): Promise<FolderObjectGetResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const result = await this.folderService.getFolderObjectAsUser(req.user, {
      folderId,
      objectKey,
    })
    return {
      folderObject: transformFolderObjectToDTO(result),
    }
  }

  /**
   * Delete a folder object by folderId and objectKey.
   */
  @Delete('/:folderId/objects/:objectKey')
  async deleteFolderObject(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Param('objectKey') objectKey: string,
  ): Promise<void> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    await this.folderService.deleteFolderObjectAsUser(req.user, {
      folderId,
      objectKey,
    })
  }

  /**
   * Create presigned urls for objects in a folder.
   */
  @Post('/:folderId/presigned-urls')
  async createPresignedUrls(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Body() body: FolderCreateSignedUrlInputDTO,
  ): Promise<FolderCreateSignedUrlsResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const urls = await this.folderService.createPresignedUrlsAsUser(req.user, {
      folderId,
      urls: body,
    })
    return { urls }
  }

  /**
   * Scan the object again in the underlying storage, and update its state in our db.
   */
  @Post('/:folderId/objects/:objectKey')
  @AuthGuardConfig({
    allowedActors: [AllowedActor.USER, AllowedActor.APP_USER],
  })
  async refreshFolderObjectS3Metadata(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Param('objectKey') objectKey: string,
  ): Promise<FolderObjectGetResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const folderObject =
      await this.folderService.refreshFolderObjectS3MetadataAsUser(req.user, {
        folderId,
        objectKey,
      })

    return {
      folderObject: transformFolderObjectToDTO(folderObject),
    }
  }

  /**
   * Handle app task trigger
   */
  @Post('/:folderId/apps/:appIdentifier/trigger/:taskIdentifier')
  async handleAppTaskTrigger(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Param('appIdentifier') appIdentifier: string,
    @Param('taskIdentifier') taskIdentifier: string,
    @Body() body: TriggerAppTaskInputDTO,
  ): Promise<void> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    await this.folderService.handleAppTaskTrigger(req.user, {
      folderId,
      taskIdentifier,
      inputParams: body.inputParams,
      appIdentifier,
      objectKey: body.objectKey,
    })
  }
  /**
   * Get folder share for a user
   */
  @Get('/:folderId/shares/:userId')
  async getFolderShares(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<FolderShareGetResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const share = await this.folderService.getFolderShare(
      req.user,
      folderId,
      userId,
    )
    return { share }
  }

  /**
   * List folder shares
   */
  @Get('/:folderId/shares')
  async listFolderShares(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
  ): Promise<FolderShareListResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const shares = await this.folderService.listFolderShares(req.user, folderId)

    return shares
  }

  /**
   * List prospective folder share users
   */
  @Get('/:folderId/user-share-options')
  async listFolderShareUsers(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Query() queryParams: FolderShareUsersListQueryParamsDTO,
  ): Promise<FolderShareUserListResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const shares = await this.folderService.listFolderShareUsersAsUser(
      req.user,
      folderId,
      queryParams,
    )
    return shares
  }

  /**
   * Add or update a folder share
   */
  @Post('/:folderId/shares/:userId')
  async upsertFolderShare(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() body: FolderShareCreateInputDTO,
  ): Promise<FolderShareGetResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    return {
      share: await this.folderService.upsertFolderShare(
        req.user,
        folderId,
        userId,
        body.permissions,
      ),
    }
  }

  /**
   * Remove a folder share
   */
  @Delete('/:folderId/shares/:userId')
  async removeFolderShare(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    await this.folderService.removeFolderShare(req.user, folderId, userId)
  }

  /**
   * Update a folder by id.
   */
  @Put('/:folderId')
  async updateFolder(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Body() body: FolderUpdateInputDTO,
  ): Promise<FolderUpdateResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const folder = await this.folderService.updateFolderAsUser(
      req.user,
      folderId,
      body,
    )
    return {
      folder: transformFolderToDTO(folder),
    }
  }
}
