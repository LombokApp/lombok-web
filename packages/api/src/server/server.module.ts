import {
  forwardRef,
  Logger,
  Module,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { CronJob } from 'cron'
import { AppModule } from 'src/app/app.module'
import { coreConfig } from 'src/core/config'
import { DockerModule } from 'src/docker/docker.module'
import { LogModule } from 'src/log/log.module'
import { S3Service } from 'src/storage/s3.service'

import { PublicController } from './controllers/public.controller'
import { ServerController } from './controllers/server.controller'
import { ServerDockerHostsController } from './controllers/server-docker-hosts.controller'
import { ServerIconController } from './controllers/server-icon.controller'
import { ServerStorageController } from './controllers/server-storage.controller'
import { StorageProvisionsController } from './controllers/storage-provisions.controller'
import { ActivityMetricsService } from './services/activity-metrics.service'
import { ServerConfigurationService } from './services/server-configuration.service'
import { ServerIconService } from './services/server-icon.service'
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
    ServerIconController,
    StorageProvisionsController,
    ServerStorageController,
    ServerDockerHostsController,
  ],
  providers: [
    ServerConfigurationService,
    ServerIconService,
    ServerMetricsService,
    ActivityMetricsService,
    S3Service,
  ],
  exports: [ServerConfigurationService, ServerIconService],
})
export class ServerModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ServerModule.name)
  private jobs: CronJob[] | undefined

  constructor(
    private readonly activityMetricsService: ActivityMetricsService,
  ) {}

  onModuleInit() {
    // Prune synthetic task telemetry daily at 03:00 so the events table stays
    // bounded under the added task-activity volume.
    const retentionJob = new CronJob('0 3 * * *', () => {
      void this.activityMetricsService
        .pruneTaskTelemetry()
        .then((deleted) => {
          if (deleted > 0) {
            this.logger.log(`Pruned ${deleted} task telemetry events`)
          }
        })
        .catch((error: unknown) => {
          this.logger.error('Failed to prune task telemetry events', error)
        })
    })
    retentionJob.start()
    this.jobs = [retentionJob]
  }

  async onModuleDestroy() {
    await Promise.all(
      this.jobs?.map((job) => job.stop()).filter((p) => p !== undefined) ?? [],
    )
  }
}
