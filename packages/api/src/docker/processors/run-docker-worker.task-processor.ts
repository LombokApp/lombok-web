import { TaskCompletion } from '@lombokapp/types'
import { AsyncWorkError, buildUnexpectedError } from '@lombokapp/worker-utils'
import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { AppService } from 'src/app/services/app.service'
import { OrmService } from 'src/orm/orm.service'
import { BaseCoreTaskProcessor } from 'src/task/base.processor'
import { tasksTable } from 'src/task/entities/task.entity'
import { TaskService } from 'src/task/services/task.service'
import { CoreTaskName } from 'src/task/task.constants'

import { DockerJobsService } from '../services/docker-jobs.service'

@Injectable()
export class RunDockerWorkerTaskProcessor extends BaseCoreTaskProcessor<CoreTaskName.RunDockerWorker> {
  private readonly appService: AppService

  constructor(
    private readonly ormService: OrmService,
    private readonly dockerJobsService: DockerJobsService,
    private readonly taskService: TaskService,
    @Inject(forwardRef(() => AppService))
    _appService,
  ) {
    super(CoreTaskName.RunDockerWorker, async (task) => {
      if (task.invocation.kind !== 'event') {
        throw new NotFoundException(
          'RunDockerJobProcessor requires event trigger',
        )
      }

      const innerTask = await this.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.id, task.data.innerTaskId),
      })

      if (!innerTask) {
        throw new NotFoundException(
          `Inner task not found: ${task.data.innerTaskId} for docker job task ${task.id}`,
        )
      }

      const profileSpec = await this.dockerJobsService.getProfileSpec(
        task.data.appIdentifier,
        task.data.profileIdentifier,
      )

      await this.taskService.registerTaskStarted({
        taskId: innerTask.id,
        startContext: {
          __executor: {
            profileHash: this.dockerJobsService.hashProfileSpec(profileSpec),
            profileKey: `${task.data.appIdentifier}:${task.data.profileIdentifier}`,
            jobIdentifier: task.data.jobClassIdentifier,
          },
        },
      })

      try {
        // Have the executor tell us if it accepted the job
        const execResult = await this.appService.executeAppDockerJob({
          appIdentifier: task.data.appIdentifier,
          jobData: innerTask.data,
          profileIdentifier: task.data.profileIdentifier,
          jobIdentifier: task.data.jobClassIdentifier,
          asyncTaskId: task.id,
          storageAccessPolicy: innerTask.storageAccessPolicy ?? undefined,
        })

        this.logger.debug(`Docker job processor exec complete [${task.id}]:`, {
          execResult,
        })
      } catch (error) {
        const normalizedError =
          error instanceof AsyncWorkError
            ? error
            : buildUnexpectedError({
                code: 'UNEXPECTED_DOCKER_EXECUTION_ERROR',
                message:
                  'Unexpected error during in run serverless worker core task processor (run-docker-worker-task.processor.ts)',

                error,
              })
        const highestLevelAppError =
          normalizedError.resolveHighestLevelAppError()
        const runnerSuccess = !!highestLevelAppError

        const innerTaskCompletion = {
          success: false,
          requeueDelayMs: highestLevelAppError?.requeueDelayMs,
          error: {
            code: highestLevelAppError?.code ?? 'EXECUTION_ERROR',
            name: highestLevelAppError?.name ?? 'ExecutionError',
            message:
              highestLevelAppError?.message ??
              `There was an error executing the task (${typeof highestLevelAppError?.requeueDelayMs !== 'undefined' ? 'requeued' : 'see admin logs for details'})`,
            ...(highestLevelAppError
              ? {
                  name: highestLevelAppError.name,
                  message: highestLevelAppError.message,
                  stack: highestLevelAppError.stack,
                  details: highestLevelAppError.toEnvelope(),
                }
              : {}), // TODO: add some details for an internal (non-app) error
          },
        }

        const runnerTaskCompletion = {
          success: runnerSuccess,
          ...(!runnerSuccess
            ? {
                error: {
                  code: normalizedError.code,
                  name: normalizedError.name,
                  message: normalizedError.message,
                  details: normalizedError.toEnvelope(),
                },
              }
            : undefined),
        } as TaskCompletion

        await this.ormService.db.transaction(async (tx) => {
          await this.taskService.registerTaskCompleted(
            innerTask.id,
            innerTaskCompletion,
            { tx },
          )

          await this.taskService.registerTaskCompleted(
            task.id,
            runnerTaskCompletion,
            { tx },
          )
        })
      }
    })
    this.appService = _appService as AppService
  }

  shouldRegisterComplete(): boolean {
    return false
  }
}
