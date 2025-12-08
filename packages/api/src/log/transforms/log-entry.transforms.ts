import type { LogEntryDTO } from '../dto/log-entry.dto'
import type { LogEntry } from '../entities/log-entry.entity'

export function transformLogEntryToDTO(
  logEntry: LogEntry & { folder?: { name: string; ownerId: string } },
): LogEntryDTO {
  const baseDTO: LogEntryDTO = {
    id: logEntry.id,
    emitterIdentifier: logEntry.emitterIdentifier,
    message: logEntry.message,
    level: logEntry.level,
    targetLocation: logEntry.targetLocation ?? undefined,
    data: logEntry.data,
    createdAt: logEntry.createdAt,
  }

  if (logEntry.targetLocation?.folderId && logEntry.folder) {
    return {
      ...baseDTO,
      targetLocationContext: {
        folderId: logEntry.targetLocation.folderId,
        objectKey: logEntry.targetLocation.objectKey ?? undefined,
        folderName: logEntry.folder.name,
        folderOwnerId: logEntry.folder.ownerId,
      },
    }
  }

  return baseDTO
}
