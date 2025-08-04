import type { TaskDTO } from '../dto/task.dto'
import type { Task } from '../entities/task.entity'

export function transformTaskToDTO(task: Task): TaskDTO {
  return {
    id: task.id,
    ownerIdentifier: task.ownerIdentifier,
    triggeringEventId: task.triggeringEventId,
    updates: task.updates,
    handlerId: task.handlerId ?? undefined,
    inputData: task.inputData,
    subjectFolderId: task.subjectFolderId ?? undefined,
    subjectObjectKey: task.subjectObjectKey ?? undefined,
    errorAt: task.errorAt ?? undefined,
    errorCode: task.errorCode ?? undefined,
    errorMessage: task.errorMessage ?? undefined,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    taskIdentifier: task.taskIdentifier,
    taskDescription: task.taskDescription,
    startedAt: task.startedAt ?? undefined,
    completedAt: task.completedAt ?? undefined,
  }
}
