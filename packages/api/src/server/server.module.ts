import { forwardRef, Module } from '@nestjs/common'
import { AppModule } from 'src/app/app.module'
import { LogModule } from 'src/log/log.module'

import { PublicController } from './controllers/public.controller'
import { ServerController } from './controllers/server.controller'
import { ServerStorageController } from './controllers/server-storage.controller'
import { StorageProvisionsController } from './controllers/storage-provisions.controller'
import { ServerConfigurationService } from './services/server-configuration.service'
import { ServerMetricsService } from './services/server-metrics.service'

@Module({
  imports: [forwardRef(() => AppModule), forwardRef(() => LogModule)],
  controllers: [
    PublicController,
    ServerController,
    StorageProvisionsController,
    ServerStorageController,
  ],
  providers: [ServerConfigurationService, ServerMetricsService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ServerModule {}
