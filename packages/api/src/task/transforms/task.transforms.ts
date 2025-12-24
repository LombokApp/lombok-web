import type { TaskDTO, TaskWithTargetLocationContextDTO } from '../dto/task.dto'
import type { Task } from '../entities/task.entity'

// Overload for when folder is present
export function transformTaskToDTO(
  task: Task & { folder: { name: string; ownerId: string } },
): TaskWithTargetLocationContextDTO

// Overload for when folder is not present
export function transformTaskToDTO(task: Task): TaskDTO

// Implementation
export function transformTaskToDTO(
  task: Task & { folder?: { name: string; ownerId: string } },
): TaskDTO | TaskWithTargetLocationContextDTO {
  const baseDTO: TaskDTO = {
    id: task.id,
    ownerIdentifier: task.ownerIdentifier,
    trigger: task.trigger,
    systemLog: task.systemLog.map((log) => ({
      at: log.at.toISOString(),
      payload: log.payload,
    })),
    taskLog: task.taskLog.map((log) => ({
      at: log.at.toISOString(),
      message: log.message,
      payload: log.payload,
    })),
    handlerIdentifier: task.handlerIdentifier ?? undefined,
    data: task.data,
    targetLocation: task.targetLocation ?? undefined,
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
  if (task.targetLocation?.folderId && task.folder) {
    return {
      ...baseDTO,
      targetLocationContext: {
        folderId: task.targetLocation.folderId,
        objectKey: task.targetLocation.objectKey ?? undefined,
        folderName: task.folder.name,
        folderOwnerId: task.folder.ownerId,
      },
    }
  }

  // Otherwise return base TaskDTO
  return baseDTO
}
