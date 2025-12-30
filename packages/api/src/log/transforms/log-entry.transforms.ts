import type {
  LogEntryDTO,
  LogEntryWithTargetLocationContextDTO,
} from '../dto/log-entry.dto'
import type { LogEntry } from '../entities/log-entry.entity'

// Overload for when folder is present
export function transformLogEntryToDTO(
  logEntry: LogEntry & { folder: { name: string; ownerId: string } },
): LogEntryWithTargetLocationContextDTO

// Overload for when folder is not present
export function transformLogEntryToDTO(logEntry: LogEntry): LogEntryDTO

export function transformLogEntryToDTO(
  logEntry: LogEntry & { folder?: { name: string; ownerId: string } },
): LogEntryDTO | LogEntryWithTargetLocationContextDTO {
  const baseDTO: LogEntryDTO = {
    id: logEntry.id,
    emitterIdentifier: logEntry.emitterIdentifier,
    message: logEntry.message,
    level: logEntry.level,
    targetLocation: logEntry.targetLocationFolderId
      ? {
          folderId: logEntry.targetLocationFolderId,
          objectKey: logEntry.targetLocationObjectKey ?? undefined,
        }
      : undefined,
    data: logEntry.data,
    createdAt: logEntry.createdAt.toISOString(),
  }

  // If folder is present, add subjectContext and return LogEntryWithFolderSubjectContextDTO
  if (logEntry.targetLocationFolderId && logEntry.folder) {
    return {
      ...baseDTO,
      targetLocationContext: {
        folderId: logEntry.targetLocationFolderId,
        objectKey: logEntry.targetLocationObjectKey ?? undefined,
        folderName: logEntry.folder.name,
        folderOwnerId: logEntry.folder.ownerId,
      },
    }
  }

  // Otherwise return base LogEntryDTO
  return baseDTO
}
