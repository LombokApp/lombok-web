import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Put,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { ZodValidationPipe } from 'nestjs-zod'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import {
  AllowedActor,
  AuthGuardConfig,
} from 'src/auth/guards/auth.guard-config'
import { MAX_IMAGE_UPLOAD_BYTES } from 'src/shared/utils'

import type { ViewerGetResponse } from '../dto/responses/viewer-get-response.dto'
import { transformUserToDTO } from '../dto/transforms/user.transforms'
import type { UserDTO } from '../dto/user.dto'
import { ViewerUpdateInputDTO } from '../dto/viewer-update-input.dto'
import { UserAvatarService } from '../services/user-avatar.service'
import { UserService } from '../services/users.service'

@Controller('/api/v1/viewer')
@ApiTags('Viewer')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@UsePipes(ZodValidationPipe)
@AuthGuardConfig({
  allowedActors: [AllowedActor.USER],
})
export class ViewerController {
  constructor(
    private readonly userService: UserService,
    private readonly userAvatarService: UserAvatarService,
  ) {}

  @Get()
  @AuthGuardConfig({
    allowedActors: [AllowedActor.USER, AllowedActor.APP_USER],
  })
  async getViewer(@Req() req: express.Request): Promise<ViewerGetResponse> {
    const user = await this.userService.getUserById({ id: req.user?.id ?? '' })
    return {
      user: transformUserToDTO(user),
    }
  }

  @Put()
  async updateViewer(
    @Req() req: express.Request,
    @Body() viewerUpdateInput: ViewerUpdateInputDTO,
  ): Promise<ViewerGetResponse> {
    const _updatedViewer = await this.userService.updateViewer(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      req.user!,
      viewerUpdateInput,
    )

    const res: { user: UserDTO } = {
      user: transformUserToDTO(_updatedViewer),
    }
    return res
  }

  @Post('/avatar')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMAGE_UPLOAD_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  async setViewerAvatar(
    @Req() req: express.Request,
    @UploadedFile()
    file: { buffer?: Buffer; mimetype: string; size: number } | undefined,
  ): Promise<ViewerGetResponse> {
    if (!file?.buffer) {
      throw new BadRequestException({
        code: 'image_upload_empty',
        message: 'No file was uploaded',
      })
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const actor = req.user!
    await this.userAvatarService.setAvatar(actor.id, {
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer,
    })
    const user = await this.userService.getUserById({ id: actor.id })
    return { user: transformUserToDTO(user) }
  }

  @Delete('/avatar')
  @HttpCode(204)
  async deleteViewerAvatar(@Req() req: express.Request): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await this.userAvatarService.deleteAvatar(req.user!.id)
  }
}
