import { forwardRef, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppModule } from 'src/app/app.module'
import { authConfig } from 'src/auth/config'
import { coreConfig } from 'src/core/config'
import { OrmModule } from 'src/orm/orm.module'

import { WorkerJobsController } from './controllers/worker-jobs.controller'
import { WorkerJobGuard } from './guards/worker-job.guard'
import { RunDockerWorkerTaskProcessor } from './processors/run-docker-worker.task-processor'
import { DockerAdapterProvider } from './services/client/adapters/docker-adapter.provider'
import { DockerClientService } from './services/client/docker-client.service'
import { DockerJobsService } from './services/docker-jobs.service'
import { WorkerJobService } from './services/worker-job.service'

@Module({
  imports: [
    ConfigModule.forFeature(coreConfig),
    ConfigModule.forFeature(authConfig),
    OrmModule,
    forwardRef(() => AppModule),
  ],
  controllers: [WorkerJobsController],
  providers: [
    DockerClientService,
    DockerAdapterProvider,
    DockerJobsService,
    RunDockerWorkerTaskProcessor,
    WorkerJobService,
    WorkerJobGuard,
  ],
  exports: [DockerJobsService, RunDockerWorkerTaskProcessor, WorkerJobService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class DockerModule {}
