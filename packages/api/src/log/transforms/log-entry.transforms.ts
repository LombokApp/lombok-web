import type { LogEntryDTO } from '../dto/log-entry.dto'
import type { LogEntry } from '../entities/log-entry.entity'

export function transformLogEntryToDTO(logEntry: LogEntry): LogEntryDTO {
  return {
    id: logEntry.id,
    emitterIdentifier: logEntry.emitterIdentifier,
    message: logEntry.message,
    level: logEntry.level,
    subjectContext: logEntry.subjectFolderId
      ? {
          folderId: logEntry.subjectFolderId,
          objectKey: logEntry.subjectObjectKey ?? undefined,
        }
      : undefined,
    data: logEntry.data,
    createdAt: logEntry.createdAt,
  }
}
