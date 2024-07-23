import { ZodValidationPipe } from '@anatine/zod-nestjs'
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
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

import { FolderDTO } from '../dto/folder.dto'
import { FolderCreateInputDTO } from '../dto/folder-create-input.dto'
import { FolderCreateSignedUrlInputDTO } from '../dto/folder-create-signed-url-input.dto'
import { FolderObjectDTO } from '../dto/folder-object.dto'
import { FolderObjectContentAttributesDTO } from '../dto/folder-object-content-attributes.dto'
import { FolderObjectContentMetadataDTO } from '../dto/folder-object-content-metadata.dto'
import { FolderObjectsListQueryParamsDTO } from '../dto/folder-objects-list-query-params.dto'
import { FoldersListQueryParamsDTO } from '../dto/folders-list-query-params.dto'
import type { FolderCreateResponse } from '../dto/responses/folder-create-response.dto'
import type { FolderCreateSignedUrlsResponse } from '../dto/responses/folder-create-signed-urls-response.dto'
import type { FolderGetMetadataResponse } from '../dto/responses/folder-get-metadata-response.dto'
import type { FolderGetResponse } from '../dto/responses/folder-get-response.dto'
import type { FolderListResponse } from '../dto/responses/folder-list-response.dto'
import type { FolderObjectGetResponse } from '../dto/responses/folder-object-get-response.dto'
import type { FolderObjectListResponse } from '../dto/responses/folder-object-list-response.dto'
import { transformFolderToDTO } from '../dto/transforms/folder.transforms'
import { transformFolderObjectToDTO } from '../dto/transforms/folder-object.transforms'
import { FolderPermissionUnauthorizedException } from '../exceptions/folder-permission-unauthorized.exception'
import { FolderService } from '../services/folder.service'

@Controller('/api/v1/folders')
@ApiTags('Folders')
@UseGuards(AuthGuard)
@UsePipes(ZodValidationPipe)
@ApiBearerAuth()
@ApiExtraModels(
  FolderDTO,
  FolderObjectDTO,
  FolderObjectContentMetadataDTO,
  FolderObjectContentAttributesDTO,
)
export class FoldersController {
  constructor(private readonly folderService: FolderService) {}

  /**
   * Get a folder by id.
   */
  @Get('/:folderId')
  async getFolder(
    @Req() req: express.Request,
    @Param('folderId') folderId: string,
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
   * Get the metadata for a folder by id.
   */
  @Get('/:folderId/metadata')
  async getFolderMetadata(
    @Req() req: express.Request,
    @Param('folderId') folderId: string,
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
    const result = await this.folderService.listFoldersAsUser(req.user, {
      ...queryParams,
    })
    return {
      result: result.result.map(({ folder, permissions }) => ({
        permissions,
        folder: transformFolderToDTO(folder),
      })),
      meta: result.meta,
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
    @Param('folderId') folderId: string,
  ): Promise<void> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    await this.folderService.deleteFolderAsUser(req.user, folderId)
  }

  /**
   * Scan the underlying S3 location and update our local representation of it.
   */
  @Post('/:folderId/rescan')
  async rescanFolder(
    @Req() req: express.Request,
    @Param('folderId') folderId: string,
  ): Promise<void> {
    if (!req.user) {
      throw new UnauthorizedException()
    }

    const result = await this.folderService.getFolderAsUser(req.user, folderId)

    if (result.permissions.includes(FolderPermissionEnum.FOLDER_RESCAN)) {
      await this.folderService.queueRescanFolder(result.folder.id, req.user.id)
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
    @Param('folderId') folderId: string,
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
    @Param('folderId') folderId: string,
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
    @Param('folderId') folderId: string,
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
    @Param('folderId') folderId: string,
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
  async refreshFolderObjectS3Metadata(
    @Req() req: express.Request,
    @Param('folderId') folderId: string,
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
      folderObject,
    }
  }
}
