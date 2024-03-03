import { Body, Controller, Get, Put } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import type { User } from 'src/users/entities/user.entity'

import { UserService } from '../services/users.service'
import { UpdateViewerInputDTO } from './dto/update-viewer-input.dto'
import type { UserDTO } from './dto/user.dto'
import type { ViewerGetResponse } from './responses/viewer-get.response'

@Controller('/viewer')
@ApiTags('Viewer')
export class ViewerController {
  constructor(private readonly userService: UserService) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  @Get()
  async getViewer(): Promise<ViewerGetResponse> {
    // if (!req.user) {
    //   throw new UnauthorizedError()
    // }

    // const user = this.userService.getById({ id: '' })
    return { user: {} as UserDTO }
    // return {} as UserDTO
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
