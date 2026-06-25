import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Put,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { ZodValidationPipe } from 'nestjs-zod'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import {
  AllowedActor,
  AuthGuardConfig,
} from 'src/auth/guards/auth.guard-config'
import { StagingKeyInputDTO } from 'src/storage/dto/staging-upload.dto'
import { StagingUploadService } from 'src/storage/staging-upload.service'

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
    private readonly stagingUploadService: StagingUploadService,
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
  async setViewerAvatar(
    @Req() req: express.Request,
    @Body() body: StagingKeyInputDTO,
  ): Promise<ViewerGetResponse> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const actor = req.user!
    const file = await this.stagingUploadService.fetchStagedUpload(
      actor.id,
      body.stagingKey,
      'user-avatar',
    )
    await this.userAvatarService.setAvatar(actor.id, file)
    await this.stagingUploadService.deleteStagedUpload(
      actor.id,
      body.stagingKey,
      'user-avatar',
    )
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
