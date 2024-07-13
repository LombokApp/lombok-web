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
import { UpdateViewerInputDTO } from '../dto/update-viewer-input.dto'
import type { UserDTO } from '../dto/user.dto'
import { UserService } from '../services/users.service'

@Controller('/viewer')
@ApiTags('Viewer')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@UsePipes(ZodValidationPipe)
export class ViewerController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getViewer(@Req() req: express.Request): Promise<ViewerGetResponse> {
    const user = await this.userService.getById({ id: req.user?.id ?? '' })
    return {
      user,
    }
  }

  @Put()
  @AuthGuardConfig({ allowedActors: [AllowedActor.USER] })
  async updateViewer(
    @Req() req: express.Request,
    @Body() updateViewerInput: UpdateViewerInputDTO,
  ): Promise<ViewerGetResponse> {
    const _updatedViewer = await this.userService.updateViewer(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      req.user!,
      updateViewerInput,
    )

    const res: { user: UserDTO } = {
      user: _updatedViewer,
    }
    return res
  }
}
