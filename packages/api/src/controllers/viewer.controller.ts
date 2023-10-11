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
  async getViewer(@Request() req: Express.Request) {
    const user = await this.userService.getById({ id: req.viewer.id })

    const res: { data: UserData } = { data: user.toUserData() }
    return res
  }

  @Security(AuthScheme.AccessToken, [AuthScope.UpdateViewer])
  @OperationId('updateViewer')
  @Put()
  async updateViewer(
    @Request() req: Express.Request,
    @Body() viewerUpdatePayload: ViewerUpdatePayload,
  ) {
    const user = await this.userService.updateViewer(
      req.viewer,
      viewerUpdatePayload,
    )

    const res: { data: UserData } = { data: user.toUserData() }
    return res
  }
}
