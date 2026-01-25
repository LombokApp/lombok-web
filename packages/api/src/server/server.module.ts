import { forwardRef, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppModule } from 'src/app/app.module'
import { coreConfig } from 'src/core/config'
import { DockerModule } from 'src/docker/docker.module'
import { LogModule } from 'src/log/log.module'

import { PublicController } from './controllers/public.controller'
import { ServerController } from './controllers/server.controller'
import { ServerDockerHostsController } from './controllers/server-docker-hosts.controller'
import { ServerStorageController } from './controllers/server-storage.controller'
import { StorageProvisionsController } from './controllers/storage-provisions.controller'
import { ServerConfigurationService } from './services/server-configuration.service'
import { ServerMetricsService } from './services/server-metrics.service'

@Module({
  imports: [
    ConfigModule.forFeature(coreConfig),
    forwardRef(() => AppModule),
    forwardRef(() => LogModule),
    forwardRef(() => DockerModule),
  ],
  controllers: [
    PublicController,
    ServerController,
    StorageProvisionsController,
    ServerStorageController,
    ServerDockerHostsController,
  ],
  providers: [ServerConfigurationService, ServerMetricsService],
  exports: [ServerConfigurationService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class ServerModule {}
