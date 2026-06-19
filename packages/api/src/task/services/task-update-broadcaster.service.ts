import type { JsonSerializableObject } from '@lombokapp/types'
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
import { RealtimeService } from '../../socket/realtime.service'

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

// Coalesce window for high-frequency task_progress frames (per task). Terminal
// states (completed/failed) and lifecycle transitions bypass it and flush now.
const PROGRESS_THROTTLE_MS = 300

@Injectable()
export class TaskUpdateBroadcasterService {
  private readonly logger = new Logger(TaskUpdateBroadcasterService.name)
  // Per-task pending progress timers — latest frame wins within the window.
  private readonly progressTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >()

  constructor(
    private readonly realtimeService: RealtimeService,
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

    // task_progress is the chatty stream: throttle per task. Everything else
    // (started/completed/failed/requeued) flushes immediately and cancels any
    // pending throttled progress so the terminal frame can't arrive out of order.
    if (updateType === TaskUpdateType.task_progress) {
      const existing = this.progressTimers.get(task.id)
      if (existing) {
        clearTimeout(existing)
      }
      this.progressTimers.set(
        task.id,
        setTimeout(() => {
          this.progressTimers.delete(task.id)
          this.emit(task, updateType, update)
        }, PROGRESS_THROTTLE_MS),
      )
      return
    }

    const pending = this.progressTimers.get(task.id)
    if (pending) {
      clearTimeout(pending)
      this.progressTimers.delete(task.id)
    }
    this.emit(task, updateType, update)
  }

  private emit(
    task: Task,
    updateType: TaskUpdateType,
    update: JsonSerializableObject,
  ): void {
    // Admin tasks list (server room). task_progress is already throttled upstream;
    // lifecycle transitions are bounded per task.
    this.realtimeService.toServer({
      resource: 'server.task',
      action: 'updated',
      id: task.id,
      data: update,
    })
    // Folder-scoped task → folder room; user-targeted → user room. Both deliver
    // a folder.task:updated envelope keyed by the task id (idempotent on the client).
    if (task.targetLocationFolderId) {
      this.realtimeService.toFolder(task.targetLocationFolderId, {
        resource: 'folder.task',
        action: 'updated',
        id: task.id,
        data: update,
      })
    }
    if (task.targetUserId) {
      this.realtimeService.toUser(task.targetUserId, {
        resource: 'folder.task',
        action: 'updated',
        id: task.id,
        data: update,
      })
      // App-owned tasks also mirror to the app-iframe channel (unchanged).
      if (task.ownerId !== CORE_IDENTIFIER) {
        this.appUserSocketService.emitUpdate({
          update: { code: `${UPDATE_CODE_PREFIX}${updateType}`, data: update },
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
