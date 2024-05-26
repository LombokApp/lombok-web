import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
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

@Controller('/viewer')
@ApiTags('Viewer')
@UseGuards(AuthGuard)
export class ViewerController {
  constructor(private readonly userService: UserService) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  @Get()
  async getViewer(): Promise<ViewerGetResponse> {
    // if (!req.user) {
    //   throw new UnauthorizedError()
    // }

    // const user = this.userService.getById({ id: '' })
    return {
      user: {
        emailVerified: true,
        isAdmin: true,
        permissions: [],
        username: 'wfsdfs',
        email: 'steven@poop.com',
        name: '',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }
    // return {} as UserDTO
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
