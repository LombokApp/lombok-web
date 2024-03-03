import { Body, Controller, Get, Put } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import type { User } from 'src/users/entities/user.entity'

import { UserService } from '../services/users.service'
import { UpdateViewerInputDTO } from './transfer-objects/update-viewer-input.dto'
import { UserDTO } from './transfer-objects/user.dto'
import { ViewerGetResponseDTO } from './transfer-objects/viewer-get-response.dto'

@Controller('/viewer')
@ApiTags('Viewer')
export class ViewerController {
  constructor(private readonly userService: UserService) {}

  @ZodSerializerDto(UserDTO) // TODO: Does this do anything?
  @Get()
  getViewer(): ViewerGetResponseDTO {
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
