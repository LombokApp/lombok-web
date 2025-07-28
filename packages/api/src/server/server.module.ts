import { forwardRef, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppModule } from 'src/app/app.module'
import { appConfig } from 'src/app/config'
import { AppService } from 'src/app/services/app.service'
import { FoldersModule } from 'src/folders/folders.module'
import { StorageModule } from 'src/storage/storage.module'

import { ServerController } from './controllers/server.controller'
import { ServerStorageLocationController } from './controllers/server-storage-location.controller'
import { UserStorageProvisionsController } from './controllers/user-storage-provisions.controller'
import { ServerConfigurationService } from './services/server-configuration.service'

@Module({
  imports: [
    ConfigModule.forFeature(appConfig),
    StorageModule,
    forwardRef(() => FoldersModule),
    forwardRef(() => AppModule),
  ],
  controllers: [
    ServerController,
    UserStorageProvisionsController,
    ServerStorageLocationController,
  ],
  providers: [ServerConfigurationService, AppService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ServerModule {}
