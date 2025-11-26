import { Inject, Injectable } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { Task } from 'src/task/entities/task.entity'

import { platformConfig } from '../config'
import { LocalDockerAdapter } from './docker/adapters/local.adapter'
import { DockerManager } from './docker/docker-manager.service'
import { DockerExecutionOptions } from './docker/docker-manager.types'
import { dockerExecutionOptionsSchema } from './docker/schemas/docker-manager-run-config.schema'
import { runDockerImageTaskInputDataSchema } from './docker/schemas/run-docker-image-task.schema'

export const USER_JWT_SUB_PREFIX = 'user:'
export const APP_USER_JWT_SUB_PREFIX = 'app_user:'
export const APP_JWT_SUB_PREFIX = 'app:'
export const APP_WORKER_JWT_SUB_PREFIX = 'app_worker:'

@Injectable()
export class DockerOrchestrationService {
  private readonly dockerManager: DockerManager
  constructor(
    @Inject(platformConfig.KEY)
    private readonly _platformConfig: nestjsConfig.ConfigType<
      typeof platformConfig
    >,
  ) {
    this.dockerManager = new DockerManager({
      ...(this._platformConfig.dockerHost && {
        local: new LocalDockerAdapter(this._platformConfig.dockerHost),
      }),
    })
  }

  async executeDockerJob(executionOptions: DockerExecutionOptions) {
    const validateResult =
      dockerExecutionOptionsSchema.safeParse(executionOptions)
    if (validateResult.success) {
      const inputData = validateResult.data
      await this.dockerManager.runImage(inputData.runConfig)
    }
  }

  async executeDockerJobASync(task: Task) {
    const validateResult = runDockerImageTaskInputDataSchema.safeParse(
      task.inputData,
    )
    if (validateResult.success) {
      const inputData = validateResult.data
      await this.dockerManager.runImage(inputData.runConfig)
    }
  }
}
