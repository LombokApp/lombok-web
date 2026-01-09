import type { OnModuleInit } from '@nestjs/common'
import { forwardRef, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppModule } from 'src/app/app.module'
import { coreConfig } from 'src/core/config'
import { FoldersModule } from 'src/folders/folders.module'
import { OrmService } from 'src/orm/orm.service'

import { SHOULD_START_CORE_WORKER_THREAD_KEY } from './core-worker.constants'
import { CoreWorkerService } from './core-worker.service'
import { AnalyzeObjectProcessor } from './processors/analyze-object.processor'
import { RunServerlessWorkerTaskProcessor } from './processors/run-serverless-worker-task.processor'

@Module({
  imports: [
    ConfigModule.forFeature(coreConfig),
    forwardRef(() => AppModule),
    forwardRef(() => FoldersModule),
  ],
  providers: [
    { provide: SHOULD_START_CORE_WORKER_THREAD_KEY, useValue: true },
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
  ) {}
  async onModuleInit() {
    await this.ormService
      .waitForInit()
      .then(() => this.coreWorkerService.startCoreWorkerThread())
  }
}
