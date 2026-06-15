import { FolderPermissionEnum } from '@lombokapp/types'
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiExtraModels,
  ApiTags,
} from '@nestjs/swagger'
import express from 'express'
import { ZodValidationPipe } from 'nestjs-zod'
import { AppCustomSettingsPatchInputDTO } from 'src/app/dto/app-custom-settings-patch-input.dto'
import { AppFolderSettingsUpdateInputDTO } from 'src/app/dto/app-folder-settings-update-input.dto'
import { AppCustomSettingsGetResponseDTO } from 'src/app/dto/responses/app-custom-settings-get-response.dto'
import { AppFolderSettingsGetResponseDTO } from 'src/app/dto/responses/app-folder-settings-get-response.dto'
import { AppService } from 'src/app/services/app.service'
import { AppCustomSettingsService } from 'src/app/services/app-custom-settings.service'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import {
  AllowedActor,
  AuthGuardConfig,
} from 'src/auth/guards/auth.guard-config'
import { normalizeSortParam } from 'src/core/utils/sort.util'
import { ApiStandardErrorResponses } from 'src/shared/decorators/api-standard-error-responses.decorator'
import { MAX_IMAGE_UPLOAD_BYTES } from 'src/shared/utils'

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
import { FolderStarInputDTO } from '../dto/folder-star-input.dto'
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
import type { FolderStarResponse } from '../dto/responses/folder-star-response.dto'
import type { FolderStarredListResponse } from '../dto/responses/folder-starred-list-response.dto'
import type { FolderUpdateResponseDTO } from '../dto/responses/folder-update-response.dto'
import { transformFolderToDTO } from '../dto/transforms/folder.transforms'
import { transformFolderObjectToDTO } from '../dto/transforms/folder-object.transforms'
import { FolderOperationForbiddenException } from '../exceptions/folder-operation-forbidden.exception'
import { FolderService } from '../services/folder.service'
import { FolderIconService } from '../services/folder-icon.service'

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
@ApiStandardErrorResponses()
export class FoldersController {
  constructor(
    private readonly folderService: FolderService,
    private readonly appService: AppService,
    private readonly appCustomSettingsService: AppCustomSettingsService,
    private readonly folderIconService: FolderIconService,
  ) {}

  // Declared before `/:folderId` so `starred` isn't captured by the UUID-parsed folder route.
  @Get('/starred')
  @AuthGuardConfig({
    allowedActors: [AllowedActor.USER, AllowedActor.APP_USER],
  })
  async listStarredFolders(
    @Req() req: express.Request,
  ): Promise<FolderStarredListResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const folders = await this.folderService.listStarredFoldersAsUser(req.user)
    return { folders }
  }

  @Get('/:folderId')
  @AuthGuardConfig({
    allowedActors: [AllowedActor.USER, AllowedActor.APP_USER],
  })
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
      starred: result.starred,
    }
  }

  @Put('/:folderId/starred')
  @AuthGuardConfig({
    allowedActors: [AllowedActor.USER, AllowedActor.APP_USER],
  })
  async setFolderStarred(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Body() body: FolderStarInputDTO,
  ): Promise<FolderStarResponse> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const starred = await this.folderService.setFolderStarredAsUser(
      req.user,
      folderId,
      body.starred,
    )
    return { starred }
  }

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

  @Get('/:folderId/metadata')
  @AuthGuardConfig({
    allowedActors: [AllowedActor.USER, AllowedActor.APP_USER],
  })
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

  @Get()
  @AuthGuardConfig({
    allowedActors: [AllowedActor.USER, AllowedActor.APP_USER],
  })
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
      result: result.map(({ folder, permissions, starred }) => ({
        permissions,
        folder: transformFolderToDTO(folder),
        starred,
      })),
      meta,
    }
  }

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
      await this.folderService.queueReindexFolderAsUser(
        req.user,
        result.folder.id,
      )
    } else {
      throw new FolderOperationForbiddenException()
    }
  }

  @Get('/:folderId/objects')
  @AuthGuardConfig({
    allowedActors: [AllowedActor.USER, AllowedActor.APP_USER],
  })
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

  @Get('/:folderId/objects/:objectKey')
  @AuthGuardConfig({
    allowedActors: [AllowedActor.USER, AllowedActor.APP_USER],
  })
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
      objectKey: decodeURIComponent(objectKey),
    })
    return {
      folderObject: transformFolderObjectToDTO(result),
    }
  }

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
      objectKey: decodeURIComponent(objectKey),
    })
  }

  @Post('/:folderId/presigned-urls')
  @AuthGuardConfig({
    allowedActors: [AllowedActor.USER, AllowedActor.APP_USER],
  })
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

  @Post('/:folderId/objects/:objectKey/refresh')
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
        objectKey: decodeURIComponent(objectKey),
      })

    return {
      folderObject: transformFolderObjectToDTO(folderObject),
    }
  }

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

  @Post('/:folderId/icon')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_UPLOAD_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  async setFolderIcon(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @UploadedFile()
    file: { buffer?: Buffer; mimetype: string; size: number } | undefined,
  ): Promise<FolderUpdateResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    if (!file?.buffer) {
      throw new BadRequestException({
        code: 'icon_upload_empty',
        message: 'No file was uploaded',
      })
    }
    await this.folderIconService.setIcon(req.user, folderId, {
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    })
    const { folder } = await this.folderService.getFolderAsUser(
      req.user,
      folderId,
    )
    return { folder: transformFolderToDTO(folder) }
  }

  @Delete('/:folderId/icon')
  @HttpCode(204)
  async deleteFolderIcon(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
  ): Promise<void> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    await this.folderIconService.deleteIcon(req.user, folderId)
  }

  @Get('/:folderId/app-settings')
  async getFolderAppSettings(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
  ): Promise<AppFolderSettingsGetResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const settings = await this.appService.getFolderAppSettingsAsUser(
      req.user,
      folderId,
    )
    return { settings }
  }

  @Patch('/:folderId/app-settings')
  async updateFolderAppSettings(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Body() body: AppFolderSettingsUpdateInputDTO,
  ): Promise<AppFolderSettingsGetResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const settings = await this.appService.updateFolderAppSettingsAsUser(
      req.user,
      folderId,
      body,
    )
    return { settings }
  }

  @Get('/:folderId/apps/:appIdentifier/custom-settings')
  async getFolderCustomSettings(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Param('appIdentifier') appIdentifier: string,
  ): Promise<AppCustomSettingsGetResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const app = await this.appCustomSettingsService.getAppOrThrow(appIdentifier)
    const result = await this.appCustomSettingsService.getFolderCustomSettings(
      req.user.id,
      folderId,
      app,
    )
    return { settings: result }
  }

  // Absent keys preserved, explicit `null` deletes; writes are per-key atomic so concurrent disjoint-key patches don't race.
  @Patch('/:folderId/apps/:appIdentifier/custom-settings')
  async patchFolderCustomSettings(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Param('appIdentifier') appIdentifier: string,
    @Body() body: AppCustomSettingsPatchInputDTO,
  ): Promise<AppCustomSettingsGetResponseDTO> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const app = await this.appCustomSettingsService.getAppOrThrow(appIdentifier)
    await this.appCustomSettingsService.patchFolderCustomSettings(
      folderId,
      app,
      body.values,
    )
    const result = await this.appCustomSettingsService.getFolderCustomSettings(
      req.user.id,
      folderId,
      app,
    )
    return { settings: result }
  }

  // Revert folder custom settings to user-level.
  @Delete('/:folderId/apps/:appIdentifier/custom-settings')
  async deleteFolderCustomSettings(
    @Req() req: express.Request,
    @Param('folderId', ParseUUIDPipe) folderId: string,
    @Param('appIdentifier') appIdentifier: string,
  ): Promise<void> {
    if (!req.user) {
      throw new UnauthorizedException()
    }
    const app = await this.appCustomSettingsService.getAppOrThrow(appIdentifier)
    await this.appCustomSettingsService.deleteFolderCustomSettings(
      folderId,
      app,
    )
  }
}
