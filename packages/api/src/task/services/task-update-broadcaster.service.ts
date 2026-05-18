import {
  CORE_IDENTIFIER,
  ReceivedTaskProgressReport,
  TaskProgressDetails,
  TaskProgressMessage,
  TaskProgressMessageLevel,
  TaskUpdateAudience,
  TaskUpdateType,
} from '@lombokapp/types'
import { Injectable, Logger } from '@nestjs/common'
import { Task } from 'src/task/entities/task.entity'

import { AppUserSocketService } from '../../socket/app-user/app-user-socket.service'
import { UserSocketService } from '../../socket/user/user-socket.service'

export function taskUpdateDescriptionForType(
  updateType: TaskUpdateType,
  task: Task,
): string {
  switch (updateType) {
    case TaskUpdateType.task_started:
      return `Task started: ${task.taskIdentifier}`
    case TaskUpdateType.task_progress:
      return `Task progress: ${task.taskIdentifier}`
    case TaskUpdateType.task_completed:
      return `Task completed: ${task.taskIdentifier}`
    case TaskUpdateType.task_failed:
      return `Task failed: ${task.taskIdentifier}`
    case TaskUpdateType.task_requeued:
      return `Task requeued: ${task.taskIdentifier}`
  }
}

export const UPDATE_CODE_PREFIX = 'platform:tasks:'

export const TASK_UPDATE_AUDIENCES_MAP = {
  [TaskUpdateType.task_started]: TaskUpdateAudience.system,
  [TaskUpdateType.task_completed]: TaskUpdateAudience.user,
  [TaskUpdateType.task_failed]: TaskUpdateAudience.user,
  [TaskUpdateType.task_progress]: TaskUpdateAudience.user,
  [TaskUpdateType.task_requeued]: TaskUpdateAudience.system,
}

@Injectable()
export class TaskUpdateBroadcasterService {
  private readonly logger = new Logger(TaskUpdateBroadcasterService.name)

  constructor(
    private readonly userSocketService: UserSocketService,
    private readonly appUserSocketService: AppUserSocketService,
  ) {}

  handleTaskUpdate(
    task: Task,
    updateType: TaskUpdateType,
    _ts?: Date,
    progressReport?: ReceivedTaskProgressReport,
  ): void {
    const ts = _ts ?? new Date()
    const reportMessage: TaskProgressMessage | undefined =
      progressReport?.message
    const message = reportMessage ?? {
      level:
        updateType === TaskUpdateType.task_failed
          ? TaskProgressMessageLevel.error
          : TaskProgressMessageLevel.info,
      text: taskUpdateDescriptionForType(updateType, task),
      audience: TASK_UPDATE_AUDIENCES_MAP[updateType],
    }
    // Synthesize percent: 100 on task_completed so UIs can finalize bars.
    const progress: TaskProgressDetails | undefined =
      progressReport?.details ??
      (updateType === TaskUpdateType.task_completed
        ? { percent: 100 }
        : undefined)
    const update = {
      message,
      data: {
        taskId: task.id,
        correlationKey: task.correlationKey ?? null,
      },
      ...(progress ? { progress } : {}),
      receivedAt: ts.toISOString(),
    }

    if (task.targetUserId) {
      const taskUpdateMessage = {
        code: `${UPDATE_CODE_PREFIX}${updateType}`,
        data: update,
      }
      this.userSocketService.emitUpdate({
        update: taskUpdateMessage,
        scope: {
          targetUserId: task.targetUserId,
          targetLocationFolderId: task.targetLocationFolderId,
        },
      })
      if (task.ownerId !== CORE_IDENTIFIER) {
        this.appUserSocketService.emitUpdate({
          update: taskUpdateMessage,
          scope: {
            targetUserId: task.targetUserId,
            targetLocationFolderId: task.targetLocationFolderId,
            targetAppIdentifier: task.ownerId,
          },
        })
      }
    }
  }
}
