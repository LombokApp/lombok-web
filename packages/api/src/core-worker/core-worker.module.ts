import type { OnModuleInit } from '@nestjs/common'
import { forwardRef, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppModule } from 'src/app/app.module'
import { JWTService } from 'src/auth/services/jwt.service'
import { coreConfig } from 'src/core/config'
import { FoldersModule } from 'src/folders/folders.module'
import { NotificationModule } from 'src/notification/notification.module'
import { OrmService } from 'src/orm/orm.service'

import { CoreWorkerService } from './core-worker.service'
import { AnalyzeObjectProcessor } from './processors/analyze-object.processor'
import { RunServerlessWorkerTaskProcessor } from './processors/run-serverless-worker-task.processor'

@Module({
  imports: [
    ConfigModule.forFeature(coreConfig),
    forwardRef(() => AppModule),
    forwardRef(() => FoldersModule),
    forwardRef(() => NotificationModule),
  ],
  providers: [
    // Port the core worker calls back into our own HTTP server on (loopback).
    // Prod always listens on 3000; tests override this to their server port.
    { provide: 'INTERNAL_API_PORT', useValue: 3000 },
    CoreWorkerService,
    RunServerlessWorkerTaskProcessor,
    AnalyzeObjectProcessor,
  ],
  exports: [CoreWorkerService],
})
export class CoreWorkerModule implements OnModuleInit {
  constructor(
    private readonly coreWorkerService: CoreWorkerService,
    private readonly ormService: OrmService,
    private readonly jwtService: JWTService,
  ) {}
  async onModuleInit() {
    await this.ormService
      .waitForInit()
      .then(() => this.coreWorkerService.startCoreWorkerThread())
  }
}
