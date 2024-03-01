import { Module } from '@nestjs/common'

import { ServerConfigurationService } from './services/server-configuration.service'

@Module({
  controllers: [],
  providers: [ServerConfigurationService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ServerModule {}
