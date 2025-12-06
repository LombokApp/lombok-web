import type { TaskDTO, TaskWithFolderSubjectContextDTO } from '../dto/task.dto'
import type { Task } from '../entities/task.entity'

// Overload for when folder is present
export function transformTaskToDTO(
  task: Task & { folder: { name: string; ownerId: string } },
): TaskWithFolderSubjectContextDTO

// Overload for when folder is not present
export function transformTaskToDTO(task: Task): TaskDTO

// Implementation
export function transformTaskToDTO(
  task: Task & { folder?: { name: string; ownerId: string } },
): TaskDTO | TaskWithFolderSubjectContextDTO {
  const baseDTO: TaskDTO = {
    id: task.id,
    ownerIdentifier: task.ownerIdentifier,
    eventId: task.eventId,
    systemLog: task.systemLog,
    taskLog: task.taskLog,
    handlerIdentifier: task.handlerIdentifier ?? undefined,
    inputData: task.inputData,
    subjectFolderId: task.subjectFolderId ?? undefined,
    subjectObjectKey: task.subjectObjectKey ?? undefined,
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
  if (task.subjectFolderId && task.folder) {
    return {
      ...baseDTO,
      subjectContext: {
        folderId: task.subjectFolderId,
        objectKey: task.subjectObjectKey ?? undefined,
        folderName: task.folder.name,
        folderOwnerId: task.folder.ownerId,
      },
    }
  }

  // Otherwise return base TaskDTO
  return baseDTO
}
