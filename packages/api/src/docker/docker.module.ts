import { forwardRef, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppModule } from 'src/app/app.module'
import { authConfig } from 'src/auth/config'
import { OrmModule } from 'src/orm/orm.module'
import { platformConfig } from 'src/platform/config'

import { WorkerJobsController } from './controllers/worker-jobs.controller'
import { WorkerJobGuard } from './guards/worker-job.guard'
import { RunDockerJobProcessor } from './processors/run-docker-job.task-processor'
import { DockerOrchestrationService } from './services/docker-orchestration.service'
import { WorkerJobService } from './services/worker-job.service'

@Module({
  imports: [
    ConfigModule.forFeature(platformConfig),
    ConfigModule.forFeature(authConfig),
    OrmModule,
    forwardRef(() => AppModule),
  ],
  controllers: [WorkerJobsController],
  providers: [
    DockerOrchestrationService,
    RunDockerJobProcessor,
    WorkerJobService,
    WorkerJobGuard,
  ],
  exports: [
    DockerOrchestrationService,
    RunDockerJobProcessor,
    WorkerJobService,
  ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class DockerModule {}
