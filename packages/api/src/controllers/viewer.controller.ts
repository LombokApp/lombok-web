import {
  Controller,
  Get,
  OperationId,
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
  async getUser(@Request() req: Express.Request) {
    const user = await this.userService.get({ id: req.viewer.id })

    const res: { data: UserData } = { data: user.toUserData() }
    return res
  }
}
