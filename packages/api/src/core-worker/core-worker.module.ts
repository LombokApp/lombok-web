import type { OnModuleInit } from '@nestjs/common'
import { forwardRef, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppModule } from 'src/app/app.module'
import { OrmService } from 'src/orm/orm.service'
import { platformConfig } from 'src/platform/config'

import { SHOULD_START_CORE_WORKER_THREAD } from './core-worker.constants'
import { RunServerlessWorkerProcessor } from './processors/run-serverless-worker.task-processor'
import { ServerlessWorkerRunnerService } from './serverless-worker-runner.service'

@Module({
  imports: [
    ConfigModule.forFeature(platformConfig),
    forwardRef(() => AppModule),
  ],
  providers: [
    { provide: SHOULD_START_CORE_WORKER_THREAD, useValue: true },
    ServerlessWorkerRunnerService,
    RunServerlessWorkerProcessor,
  ],
  exports: [ServerlessWorkerRunnerService, RunServerlessWorkerProcessor],
})
export class CoreWorkerModule implements OnModuleInit {
  constructor(
    private readonly coreWorkerService: ServerlessWorkerRunnerService,
    private readonly ormService: OrmService,
  ) {}
  async onModuleInit() {
    await this.ormService
      .waitForInit()
      .then(() => this.coreWorkerService.startCoreWorkerThread())
  }
}
