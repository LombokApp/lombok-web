import { Module } from '@nestjs/common'

import { ServerController } from './controllers/server.controller'
import { ServerStorageLocationController } from './controllers/server-storage-location.controller'
import { UserStorageProvisionsController } from './controllers/user-storage-provisions.controller'
import { ServerConfigurationService } from './services/server-configuration.service'

@Module({
  controllers: [
    ServerController,
    UserStorageProvisionsController,
    ServerStorageLocationController,
  ],
  providers: [ServerConfigurationService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ServerModule {}
