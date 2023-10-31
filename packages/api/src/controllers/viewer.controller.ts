import {
  Body,
  Controller,
  Get,
  OperationId,
  Put,
  Request,
  Route,
  Security,
  Tags,
} from 'tsoa'
import { Lifecycle, scoped } from 'tsyringe'

import { AuthScheme } from '../domains/auth/constants/scheme.constants'
import { AuthScope } from '../domains/auth/constants/scope.constants'
import { UserService } from '../domains/user/services/user.service'
import type { UserData } from '../domains/user/transfer-objects/user.dto'
import { transformUserToUserDTO } from '../domains/user/transforms/user-dto.transform'
import { UnauthorizedError } from '../errors/auth.error'

export interface ViewerUpdatePayload {
  name: string
}

@scoped(Lifecycle.ContainerScoped)
@Route('viewer')
@Tags('Viewer')
export class ViewerController extends Controller {
  constructor(private readonly userService: UserService) {
    super()
  }

  @Security(AuthScheme.AccessToken, [AuthScope.ReadViewer])
  @OperationId('getViewer')
  @Get()
  getViewer(@Request() req: Express.Request) {
    if (!req.user) {
      throw new UnauthorizedError()
    }

    const res: { data: UserData } = { data: transformUserToUserDTO(req.user) }
    return res
  }

  @Security(AuthScheme.AccessToken, [AuthScope.UpdateViewer])
  @OperationId('updateViewer')
  @Put()
  async updateViewer(
    @Request() req: Express.Request,
    @Body() viewerUpdatePayload: ViewerUpdatePayload,
  ) {
    if (!req.user) {
      throw new UnauthorizedError()
    }

    const updatedViewer = await this.userService.updateViewer(
      req.user,
      viewerUpdatePayload,
    )

    const res: { data: UserData } = {
      data: transformUserToUserDTO(updatedViewer),
    }
    return res
  }
}
