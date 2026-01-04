import type { OnModuleInit } from '@nestjs/common'
import { forwardRef, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppModule } from 'src/app/app.module'
import { FoldersModule } from 'src/folders/folders.module'
import { OrmService } from 'src/orm/orm.service'
import { platformConfig } from 'src/platform/config'

import { SHOULD_START_CORE_WORKER_THREAD_KEY } from './core-worker.constants'
import { AnalyzeObjectProcessor } from './processors/analyze-object.task-processor'
import { RunServerlessWorkerProcessor } from './processors/run-serverless-worker.task-processor'
import { CoreWorkerService } from './core-worker.service'

@Module({
  imports: [
    ConfigModule.forFeature(platformConfig),
    forwardRef(() => AppModule),
    forwardRef(() => FoldersModule),
  ],
  providers: [
    { provide: SHOULD_START_CORE_WORKER_THREAD_KEY, useValue: true },
    CoreWorkerService,
    RunServerlessWorkerProcessor,
    AnalyzeObjectProcessor,
  ],
  exports: [CoreWorkerService],
})
export class CoreWorkerModule implements OnModuleInit {
  constructor(
    private readonly coreWorkerService: CoreWorkerService,
    private readonly ormService: OrmService,
  ) {}
  async onModuleInit() {
    await this.ormService
      .waitForInit()
      .then(() => this.coreWorkerService.startCoreWorkerThread())
  }
}
