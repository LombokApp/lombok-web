import type { OnModuleInit } from '@nestjs/common'
import { forwardRef, Inject, Module } from '@nestjs/common'
import nestJSConfig, { ConfigModule } from '@nestjs/config'
import { AuthModule } from 'src/auth/auth.module'
import { authConfig } from 'src/auth/config'
import { coreConfig } from 'src/core/config'
import { EventModule } from 'src/event/event.module'
import { FoldersModule } from 'src/folders/folders.module'
import { OrmService } from 'src/orm/orm.service'
import { ServerModule } from 'src/server/server.module'
import { ServerConfigurationService } from 'src/server/services/server-configuration.service'
import { S3Service } from 'src/storage/s3.service'
import { StorageModule } from 'src/storage/storage.module'

import { appConfig } from './config'
import { AppsController } from './controllers/apps.controller'
import { CoreAppService } from './core-app.service'
import { AppService } from './services/app.service'

@Module({
  imports: [
    ConfigModule.forFeature(appConfig),
    ConfigModule.forFeature(coreConfig),
    ConfigModule.forFeature(authConfig),
    AuthModule,
    EventModule,
    StorageModule,
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
    @Inject(coreConfig.KEY)
    private readonly _coreConfig: nestJSConfig.ConfigType<typeof coreConfig>,
  ) {}
  async onModuleInit() {
    await this.ormService
      .waitForInit()
      .then(() => {
        if (this._coreConfig.installAppsOnStart) {
          return this.appService.installAllAppsFromDisk()
        }
      })
      .then(() =>
        this.coreAppService.startCoreModuleThread('embedded_worker_1'),
      )
  }
}
