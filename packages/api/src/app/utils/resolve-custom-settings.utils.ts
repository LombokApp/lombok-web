import type { JsonSchema07Object } from '@lombokapp/types'

import { extractSchemaDefaults } from './json-schema-to-zod.util'

export type SettingSource = 'folder' | 'user' | 'default'

export interface ResolvedCustomSettings {
  values: Record<string, unknown>
  sources: Record<string, SettingSource>
}

/**
 * Resolve custom settings using cascade: folder -> user -> schema defaults.
 * Keys not present at any level are omitted from the result.
 */
export function resolveCustomSettings(
  schema: JsonSchema07Object,
  userValues: Record<string, unknown> | undefined,
  folderValues: Record<string, unknown> | undefined,
): ResolvedCustomSettings {
  const defaults = extractSchemaDefaults(schema)
  const values: Record<string, unknown> = {}
  const sources: Record<string, SettingSource> = {}

  for (const key of Object.keys(schema.properties)) {
    if (folderValues && key in folderValues) {
      values[key] = folderValues[key]
      sources[key] = 'folder'
    } else if (userValues && key in userValues) {
      values[key] = userValues[key]
      sources[key] = 'user'
    } else if (key in defaults) {
      values[key] = defaults[key]
      sources[key] = 'default'
    }
    // If none of the above, the key is omitted from the response
  }

  return { values, sources }
}
