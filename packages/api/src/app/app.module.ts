import type { OnModuleInit } from '@nestjs/common'
import { forwardRef, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DockerModule } from 'src/docker/docker.module'
import { EventModule } from 'src/event/event.module'
import { FoldersModule } from 'src/folders/folders.module'
import { LogModule } from 'src/log/log.module'
import { OrmService } from 'src/orm/orm.service'
import { platformConfig } from 'src/platform/config'
import { ServerConfigurationService } from 'src/server/services/server-configuration.service'
import { SocketModule } from 'src/socket/socket.module'
import { S3Service } from 'src/storage/s3.service'
import { StorageModule } from 'src/storage/storage.module'

import { appConfig } from './config'
import { AppsController } from './controllers/apps.controller'
import { UserAppsController } from './controllers/user-apps.controller'
import { ServerlessWorkerRunnerService } from './serverless-worker-runner.service'
import { AppService } from './services/app.service'

@Module({
  imports: [
    ConfigModule.forFeature(appConfig),
    ConfigModule.forFeature(platformConfig),
    EventModule,
    forwardRef(() => LogModule),
    StorageModule,
    forwardRef(() => SocketModule),
    forwardRef(() => FoldersModule),
    forwardRef(() => DockerModule),
  ],
  controllers: [AppsController, UserAppsController],
  providers: [
    AppService,
    S3Service,
    ServerConfigurationService,
    ServerlessWorkerRunnerService,
  ],
  exports: [AppService, ServerlessWorkerRunnerService],
})
export class AppModule implements OnModuleInit {
  constructor(
    private readonly serverlessWorkerRunnerService: ServerlessWorkerRunnerService,
    private readonly ormService: OrmService,
  ) {}
  async onModuleInit() {
    await this.ormService
      .waitForInit()
      .then(() =>
        this.serverlessWorkerRunnerService.startServerlessWorkerRunnerThread(),
      )

    // init app roles
    await this.ormService.initAppRolesForAllApps()
  }
}
