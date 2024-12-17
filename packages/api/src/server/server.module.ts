import { Module } from '@nestjs/common'

import { ServerController } from './controllers/server.controller'
import { UserStorageProvisionsController } from './controllers/user-storage-provisions.controller'
import { ServerConfigurationService } from './services/server-configuration.service'
import { ServerStorageLocationController } from './controllers/server-storage-location.controller'

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
