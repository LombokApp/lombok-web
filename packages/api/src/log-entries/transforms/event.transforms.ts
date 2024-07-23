import type { LogEntry } from 'src/log-entries/entities/log-entry.entity'

import type { LogEntryDTO } from '../dto/log-entry.dto'

export function transformLogEntryToDTO(logEntry: LogEntry): LogEntryDTO {
  return {
    id: logEntry.id,
    name: logEntry.name,
    message: logEntry.message,
    appIdentifier: logEntry.appIdentifier,
    level: logEntry.level,
    data: logEntry.data,
    createdAt: logEntry.createdAt,
  }
}
