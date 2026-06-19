import type { LogEntryLevel } from './core.types'
import type { JsonSerializableObject } from './json.types'

export interface AppLogEntry {
  level: LogEntryLevel
  message: string
  data: JsonSerializableObject
}
