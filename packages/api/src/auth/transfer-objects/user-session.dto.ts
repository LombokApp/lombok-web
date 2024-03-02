// import { ApiProperty } from '@nestjs/swagger'

export class UserSessionDTO {
  // @ApiProperty({ required: true })
  accessToken: string
  refreshToken: string
}
