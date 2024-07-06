import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import express from 'express'
import { AuthGuard } from 'src/auth/guards/auth.guard'

import { FolderCreateInputDTO } from '../dto/folder-create-input.dto'
import type { FolderCreateResponse } from '../dto/responses/folder-create-response.dto'
import type { FolderGetResponse } from '../dto/responses/folder-get-response.dto'
import type { FolderObjectsListResponse } from '../dto/responses/folder-objects-list-response.dto'
import { transformFolderToDTO } from '../dto/transforms/folder.transforms'
import { transformFolderObjectToDTO } from '../dto/transforms/folder-object.transforms'
import { FolderPermissionUnauthorizedException } from '../exceptions/folder-permission-unauthorized.exception'
import { FolderPermissionName, FolderService } from '../services/folder.service'

@Controller('/folders')
@ApiTags('Folders')
@UseGuards(AuthGuard)
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
    const result = await this.folderService.getFolderAsUser({
      folderId,
      userId: req.user?.id ?? '',
    })
    return {
      folder: transformFolderToDTO(result.folder),
      permissions: result.permissions,
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

    const result = await this.folderService.getFolderAsUser({
      folderId,
      userId: req.user.id,
    })

    if (result.permissions.includes(FolderPermissionName.FOLDER_RESCAN)) {
      await this.folderService.queueRescanFolder(result.folder.id, req.user.id)
    } else {
      throw new FolderPermissionUnauthorizedException()
    }

    await this.folderService.queueRescanFolder(folderId, req.user.id)
  }

  /**
   * List folder objects.
   */
  @Get('/:folderId/objects')
  async listFolderObjects(
    @Req() req: express.Request,
    @Param('folderId') folderId: string,
    @Query('search') search?: string,
    @Query('offset') offset?: number,
    @Query('limit') limit?: number,
  ): Promise<FolderObjectsListResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
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
      result: result.map((o) => transformFolderObjectToDTO(o)),
    }
  }
}
