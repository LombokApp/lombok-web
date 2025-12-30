import type { TaskDTO, TaskWithTargetLocationContextDTO } from '../dto/task.dto'
import type {
  TaskSummaryDTO,
  TaskSummaryWithTargetLocationContextDTO,
} from '../dto/task-summary.dto'
import type { Task, TaskSummary } from '../entities/task.entity'

// Overload for when folder is present
export function transformTaskToDTO(
  task: Task & { folder: { name: string; ownerId: string } },
): TaskWithTargetLocationContextDTO

// Overload for when folder is not present
export function transformTaskToDTO(task: Task): TaskDTO

// Implementation
export function transformTaskToDTO(
  task: Task & {
    folder?: { name: string; ownerId: string }
  },
): TaskDTO | TaskWithTargetLocationContextDTO {
  const baseDTO: TaskDTO = {
    id: task.id,
    ownerIdentifier: task.ownerIdentifier,
    trigger: task.trigger,
    systemLog: task.systemLog.map((log) => ({
      at: log.at.toISOString(),
      payload: log.payload,
      logType: log.logType,
      message: log.message,
    })),
    taskLog: task.taskLog.map((log) => ({
      at: log.at.toISOString(),
      message: log.message,
      payload: log.payload,
      logType: log.logType,
    })),
    handlerIdentifier: task.handlerIdentifier ?? undefined,
    data: task.data,
    targetLocation: task.targetLocationFolderId
      ? {
          folderId: task.targetLocationFolderId,
          objectKey: task.targetLocationObjectKey ?? undefined,
        }
      : undefined,
    success: task.success ?? undefined,
    error: task.error ?? undefined,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    taskIdentifier: task.taskIdentifier,
    taskDescription: task.taskDescription,
    startedAt: task.startedAt?.toISOString() ?? undefined,
    completedAt: task.completedAt?.toISOString() ?? undefined,
  }

  // If folder is present, add subjectContext and return TaskWithFolderSubjectContextDTO
  if (task.targetLocationFolderId && task.folder) {
    return {
      ...baseDTO,
      targetLocationContext: {
        folderId: task.targetLocationFolderId,
        objectKey: task.targetLocationObjectKey ?? undefined,
        folderName: task.folder.name,
        folderOwnerId: task.folder.ownerId,
      },
    }
  }

  // Otherwise return base TaskDTO
  return baseDTO
}

export function transformTaskSummaryToDTO(
  task: TaskSummary & { folder: { name: string; ownerId: string } },
): TaskSummaryWithTargetLocationContextDTO

// Overload for when folder is not present
export function transformTaskSummaryToDTO(task: TaskSummary): TaskSummaryDTO

export function transformTaskSummaryToDTO(
  task: TaskSummary & {
    folder?: { name: string; ownerId: string }
  },
): TaskSummaryDTO | TaskSummaryWithTargetLocationContextDTO {
  const baseDTO: TaskSummaryDTO = {
    id: task.id,
    ownerIdentifier: task.ownerIdentifier,
    trigger: task.trigger,
    handlerIdentifier: task.handlerIdentifier ?? undefined,
    success: task.success ?? undefined,
    error: task.error ?? undefined,
    targetLocation: task.targetLocationFolderId
      ? {
          folderId: task.targetLocationFolderId,
          objectKey: task.targetLocationObjectKey ?? undefined,
        }
      : undefined,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    taskIdentifier: task.taskIdentifier,
    taskDescription: task.taskDescription,
    startedAt: task.startedAt?.toISOString() ?? undefined,
    completedAt: task.completedAt?.toISOString() ?? undefined,
  }

  if (task.targetLocationFolderId && task.folder) {
    return {
      ...baseDTO,
      targetLocationContext: {
        folderId: task.targetLocationFolderId,
        objectKey: task.targetLocationObjectKey ?? undefined,
        folderName: task.folder.name,
        folderOwnerId: task.folder.ownerId,
      },
    }
  }
  return baseDTO
}
