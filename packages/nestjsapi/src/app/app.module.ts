import { Module } from '@nestjs/common'

import { AppService } from './services/app.service'

@Module({
  controllers: [],
  providers: [AppService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppModule {}
