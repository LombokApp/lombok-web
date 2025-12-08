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
    systemLog: task.systemLog,
    taskLog: task.taskLog,
    handlerIdentifier: task.handlerIdentifier ?? undefined,
    data: task.data,
    targetLocation: task.targetLocation ?? undefined,
    success: task.success ?? undefined,
    error: task.error ?? undefined,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    taskIdentifier: task.taskIdentifier,
    taskDescription: task.taskDescription,
    startedAt: task.startedAt ?? undefined,
    completedAt: task.completedAt ?? undefined,
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
