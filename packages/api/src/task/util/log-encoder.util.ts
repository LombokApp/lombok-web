import type { JsonSerializableObject } from '@lombokapp/types'

export const deserializeLogEntry = (entry: {
  at: string
  message: string
  logType: string
  payload?: string
}): {
  payload?: JsonSerializableObject
  at: Date
  message: string
  logType: string
} => {
  return {
    at: new Date(entry.at),
    message: entry.message,
    logType: entry.logType,
    ...(entry.payload
      ? {
          payload: JSON.parse(
            Buffer.from(entry.payload, 'base64').toString('utf8'),
          ) as JsonSerializableObject,
        }
      : {}),
  }
}

export const serializeLogEntry = (entry: {
  at: Date
  logType: string
  message: string
  payload?: JsonSerializableObject
}) => {
  return {
    at: entry.at.toISOString(),
    message: entry.message,
    logType: entry.logType,
    payload: entry.payload
      ? Buffer.from(JSON.stringify(entry.payload), 'utf8').toString('base64')
      : undefined,
  }
}
