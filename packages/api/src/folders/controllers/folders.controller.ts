import {
  Body,
  Controller,
  Get,
  Param,
  Post,
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
import { transformFolderToDTO } from '../dto/transforms/folder.transforms'
import { FolderService } from '../services/folder.service'

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
}

