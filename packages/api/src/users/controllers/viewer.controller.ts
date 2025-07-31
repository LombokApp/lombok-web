import { ZodValidationPipe } from '@anatine/zod-nestjs'
import {
  Body,
  Controller,
  Get,
  Put,
  Req,
  UseGuards,
  UsePipes,
} from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import express from 'express'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import {
  AllowedActor,
  AuthGuardConfig,
} from 'src/auth/guards/auth.guard-config'

import type { ViewerGetResponse } from '../dto/responses/viewer-get-response.dto'
import { transformUserToDTO } from '../dto/transforms/user.transforms'
import type { UserDTO } from '../dto/user.dto'
import { ViewerUpdateInputDTO } from '../dto/viewer-update-input.dto'
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
  constructor(private readonly userService: UserService) {}

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
}
