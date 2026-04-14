import { forwardRef, Module, type OnModuleInit } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppModule } from 'src/app/app.module'
import { authConfig } from 'src/auth/config'
import { coreConfig } from 'src/core/config'
import { OrmModule } from 'src/orm/orm.module'
import { OrmService } from 'src/orm/orm.service'

import { AdminBridgeSessionController } from './controllers/admin-bridge-session.controller'
import { BridgeSessionController } from './controllers/bridge-session.controller'
import {
  DockerHostsController,
  DockerProfileAssignmentsController,
  DockerRegistryCredentialsController,
  DockerStandaloneContainersController,
} from './controllers/docker-host-management.controller'
import { DockerWorkerHooksController } from './controllers/docker-worker-hooks.controller'
import { TunnelAuthController } from './controllers/tunnel-auth.controller'
import { DockerJobGuard } from './guards/docker-job.guard'
import { DockerWorkerGuard } from './guards/docker-worker.guard'
import { RunDockerWorkerTaskProcessor } from './processors/run-docker-worker.task-processor'
import { DockerClientService } from './services/client/docker-client.service'
import { DockerBridgeService } from './services/docker-bridge.service'
import { DockerHostManagementService } from './services/docker-host-management.service'
import { DockerJobsService } from './services/docker-jobs.service'
import { DockerWorkerHookService } from './services/docker-worker-hook.service'

@Module({
  imports: [
    ConfigModule.forFeature(coreConfig),
    ConfigModule.forFeature(authConfig),
    OrmModule,
    forwardRef(() => AppModule),
  ],
  controllers: [
    AdminBridgeSessionController,
    BridgeSessionController,
    DockerWorkerHooksController,
    TunnelAuthController,
    DockerHostsController,
    DockerRegistryCredentialsController,
    DockerProfileAssignmentsController,
    DockerStandaloneContainersController,
  ],
  providers: [
    DockerBridgeService,
    DockerClientService,
    DockerJobsService,
    DockerHostManagementService,
    RunDockerWorkerTaskProcessor,
    DockerWorkerHookService,
    DockerJobGuard,
    DockerWorkerGuard,
  ],
  exports: [
    DockerBridgeService,
    DockerJobsService,
    DockerHostManagementService,
    RunDockerWorkerTaskProcessor,
    DockerWorkerHookService,
    DockerClientService,
  ],
})
export class DockerModule implements OnModuleInit {
  constructor(
    private readonly ormService: OrmService,
    private readonly dockerBridgeService: DockerBridgeService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ormService.waitForInit()
    await this.dockerBridgeService.startBridge()
  }
}
