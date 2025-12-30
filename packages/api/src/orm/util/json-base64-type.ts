import type { JsonSerializableObject } from '@lombokapp/types'
import { customType } from 'drizzle-orm/pg-core'

export function jsonbBase64(name: string) {
  return customType<{ data: unknown; driverData: unknown }>({
    dataType() {
      return 'jsonb'
    },
    toDriver(value: unknown) {
      return JSON.stringify({
        base64:
          typeof value === 'undefined'
            ? ''
            : Buffer.from(JSON.stringify(value), 'utf8').toString('base64'),
      })
    },
    fromDriver(_value: unknown) {
      const { base64: value } = (
        typeof _value === 'string' ? JSON.parse(_value) : _value
      ) as { base64: string }
      return value === ''
        ? undefined
        : (JSON.parse(
            Buffer.from(value, 'base64').toString('utf8'),
          ) as JsonSerializableObject)
    },
  })(name)
}
