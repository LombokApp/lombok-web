import { Module } from '@nestjs/common'

import { ServerController } from './controllers/server.controller'
import { ServerConfigurationService } from './services/server-configuration.service'

@Module({
  controllers: [ServerController],
  providers: [ServerConfigurationService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ServerModule {}
