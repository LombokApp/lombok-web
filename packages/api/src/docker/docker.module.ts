import { forwardRef, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppModule } from 'src/app/app.module'
import { OrmModule } from 'src/orm/orm.module'
import { platformConfig } from 'src/platform/config'

import { RunDockerJobProcessor } from './processors/run-docker-job.task-processor'
import { DockerOrchestrationService } from './services/docker-orchestration.service'

@Module({
  imports: [
    ConfigModule.forFeature(platformConfig),
    OrmModule,
    forwardRef(() => AppModule),
  ],
  providers: [DockerOrchestrationService, RunDockerJobProcessor],
  exports: [DockerOrchestrationService, RunDockerJobProcessor],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class DockerModule {}
