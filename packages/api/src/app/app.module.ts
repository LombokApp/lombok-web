import type { OnModuleInit } from '@nestjs/common'
import { forwardRef, Inject, Module } from '@nestjs/common'
import nestJSConfig, { ConfigModule } from '@nestjs/config'
import { AuthModule } from 'src/auth/auth.module'
import { authConfig } from 'src/auth/config'
import { EventModule } from 'src/event/event.module'
import { FoldersModule } from 'src/folders/folders.module'
import { LogModule } from 'src/log/log.module'
import { OrmService } from 'src/orm/orm.service'
import { platformConfig } from 'src/platform/config'
import { ServerModule } from 'src/server/server.module'
import { ServerConfigurationService } from 'src/server/services/server-configuration.service'
import { SocketModule } from 'src/socket/socket.module'
import { S3Service } from 'src/storage/s3.service'
import { StorageModule } from 'src/storage/storage.module'

import { appConfig } from './config'
import { AppsController } from './controllers/apps.controller'
import { CoreAppService } from './core-app.service'
import { AppService } from './services/app.service'

@Module({
  imports: [
    ConfigModule.forFeature(appConfig),
    ConfigModule.forFeature(platformConfig),
    ConfigModule.forFeature(authConfig),
    AuthModule,
    EventModule,
    forwardRef(() => LogModule),
    StorageModule,
    forwardRef(() => SocketModule),
    forwardRef(() => ServerModule),
    forwardRef(() => FoldersModule),
  ],
  controllers: [AppsController],
  providers: [
    AppService,
    CoreAppService,
    S3Service,
    ServerConfigurationService,
  ],
  exports: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(
    private readonly coreAppService: CoreAppService,
    private readonly ormService: OrmService,
    private readonly appService: AppService,
    @Inject(platformConfig.KEY)
    private readonly _platformConfig: nestJSConfig.ConfigType<
      typeof platformConfig
    >,
  ) {}
  async onModuleInit() {
    await this.ormService
      .waitForInit()
      .then(() => {
        if (this._platformConfig.installAppsOnStart) {
          return this.appService.installAllAppsFromDisk()
        }
      })
      .then(() => this.coreAppService.startCoreAppThread())
  }
}
