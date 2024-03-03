import { ApiProperty } from '@nestjs/swagger'

import { UserDTO } from '../dto/user.dto'

export class ViewerGetResponse {
  @ApiProperty()
  user: UserDTO
}
