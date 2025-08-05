import type { LogEntryDTO } from '../dto/log-entry.dto'
import type { LogEntry } from '../entities/log-entry.entity'

export function transformLogEntryToDTO(logEntry: LogEntry): LogEntryDTO {
  return {
    id: logEntry.id,
    emitterIdentifier: logEntry.emitterIdentifier,
    message: logEntry.message,
    level: logEntry.level,
    locationContext: logEntry.folderId
      ? {
          folderId: logEntry.folderId,
          objectKey: logEntry.objectKey ? logEntry.objectKey : undefined,
        }
      : undefined,
    data: logEntry.data,
    createdAt: logEntry.createdAt,
  }
}
