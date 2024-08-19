import type {
  MiddlewareConsumer,
  NestModule,
  OnModuleInit,
} from '@nestjs/common'
import { forwardRef, Inject, Module, RequestMethod } from '@nestjs/common'
import nestJSConfig, { ConfigModule } from '@nestjs/config'
import { coreConfig } from 'src/core/config'
import { EventModule } from 'src/event/event.module'
import { FoldersModule } from 'src/folders/folders.module'
import { S3Service } from 'src/storage/s3.service'
import { StorageModule } from 'src/storage/storage.module'

import { AppAssetsMiddleware } from './app-assets.middleware'
import { appConfig } from './config'
import { AppsController } from './controllers/apps.controller'
import { CoreAppService } from './core-app.service'
import { AppService } from './services/app.service'

@Module({
  imports: [
    ConfigModule.forFeature(appConfig),
    ConfigModule.forFeature(coreConfig),
    EventModule,
    StorageModule,
    forwardRef(() => FoldersModule),
  ],
  controllers: [AppsController],
  providers: [AppService, CoreAppService, S3Service],
  exports: [AppService],
})
export class AppModule implements OnModuleInit, NestModule {
  constructor(
    private readonly coreAppService: CoreAppService,
    private readonly appService: AppService,
    @Inject(appConfig.KEY)
    private readonly _appConfig: nestJSConfig.ConfigType<typeof appConfig>,
  ) {}
  async onModuleInit() {
    await this.appService.updateAppsFromDisk(this._appConfig.appsLocalPath)
    this.coreAppService.startCoreModuleThread('embedded_worker_1')
  }

  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AppAssetsMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.GET })
  }
}
