import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { Request } from 'express'
import { AuthGuard } from 'src/auth/guards/auth.guard'
import {
  AllowedActor,
  AuthGuardConfig,
} from 'src/auth/guards/auth.guard-config'
import type { User } from 'src/users/entities/user.entity'

import type { ViewerGetResponse } from '../dto/responses/viewer-get-response.dto'
import { UpdateViewerInputDTO } from '../dto/update-viewer-input.dto'
import type { UserDTO } from '../dto/user.dto'
import { UserService } from '../services/users.service'

export type SCRequest = Request & {
  user: User
}

@Controller('/viewer')
@ApiTags('Viewer')
@UseGuards(AuthGuard)
export class ViewerController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getViewer(@Req() req: SCRequest): Promise<ViewerGetResponse> {
    const user = await this.userService.getById({ id: req.user.id })
    return {
      user,
    }
  }

  @Put()
  @AuthGuardConfig({ allowedActors: [AllowedActor.USER] })
  async updateViewer(
    @Body() updateViewerInput: UpdateViewerInputDTO,
  ): Promise<ViewerGetResponse> {
    // if (!req.user) {
    //   throw new UnauthorizedError()
    // }

    const _updatedViewer = await this.userService.updateViewer(
      {} as User,
      updateViewerInput,
    )

    const res: { user: UserDTO } = {
      user: {} as UserDTO,
    }
    return res
  }
}
