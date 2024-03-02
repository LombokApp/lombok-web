import { Body, Controller, Get, Put } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { User } from 'src/users/entities/user.entity'

import { UserService } from '../services/users.service'
import { UpdateViewerInputDTO } from '../transfer-objects/update-viewer-input.dto'
import type { UserDTO } from '../transfer-objects/user.dto'

@Controller('/viewer')
@ApiTags('Viewer')
export class ViewerController {
  constructor(private readonly userService: UserService) {}

  @Get()
  getViewer() {
    // if (!req.user) {
    //   throw new UnauthorizedError()
    // }

    const res: { user: UserDTO } = {
      // user: this.userService.getById({ id: '' }),
      user: {} as UserDTO,
    }
    return res
  }

  @Put()
  async updateViewer(@Body() updateViewerInput: UpdateViewerInputDTO) {
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
