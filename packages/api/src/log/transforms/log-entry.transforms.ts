import type { LogEntryDTO } from '../dto/log-entry.dto'
import type { LogEntry } from '../entities/log-entry.entity'

export function transformLogEntryToDTO(
  logEntry: LogEntry & { folder?: { name: string; ownerId: string } },
): LogEntryDTO {
  return {
    id: logEntry.id,
    emitterIdentifier: logEntry.emitterIdentifier,
    message: logEntry.message,
    level: logEntry.level,
    subjectContext:
      logEntry.subjectFolderId && logEntry.folder
        ? {
            folderId: logEntry.subjectFolderId,
            objectKey: logEntry.subjectObjectKey ?? undefined,
            folderName: logEntry.folder.name,
            folderOwnerId: logEntry.folder.ownerId,
          }
        : undefined,
    data: logEntry.data,
    createdAt: logEntry.createdAt,
  }
}
