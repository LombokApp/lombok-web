import { ApiProperty } from '@nestjs/swagger'

export class InstallAppsResponse {
  @ApiProperty({
    description: 'Success message',
    example: 'Apps installation completed',
  })
  message!: string

  @ApiProperty({
    description: 'Timestamp when the installation was completed',
    example: '2024-01-01T00:00:00.000Z',
  })
  timestamp!: string
}
