import type { AppLogEntry } from 'src/app/entities/app-log-entry.entity'

import type { LogEntryDTO } from '../dto/log-entry.dto'

export function transformLogEntryToDTO(logEntry: AppLogEntry): LogEntryDTO {
  return {
    id: logEntry.id,
    createdAt: logEntry.createdAt,
    updatedAt: logEntry.updatedAt,
  }
}
