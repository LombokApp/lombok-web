import { Module } from '@nestjs/common'
import { ServerModule } from 'src/server/server.module'

import { EmailService } from './email.service'

@Module({
  imports: [ServerModule],
  providers: [EmailService],
  exports: [EmailService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class EmailModule {}
