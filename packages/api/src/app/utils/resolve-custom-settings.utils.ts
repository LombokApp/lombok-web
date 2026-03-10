import type { JsonSchema07Object } from '@lombokapp/types'

import { extractSchemaDefaults } from './json-schema-to-zod.util'

export type SettingSource = 'folder' | 'user' | 'default'

export interface ResolvedCustomSettings {
  values: Record<string, unknown>
  sources: Record<string, SettingSource>
}

/**
 * Check whether a key matches any pattern in the schema's patternProperties.
 */
function matchesPatternProperty(
  schema: JsonSchema07Object,
  key: string,
): boolean {
  if (!schema.patternProperties) {
    return false
  }
  const patterns = schema.patternProperties as Record<string, unknown>
  return Object.keys(patterns).some((pattern) => new RegExp(pattern).test(key))
}

/**
 * Resolve custom settings using cascade: folder -> user -> schema defaults.
 * Keys not present at any level are omitted from the result.
 *
 * For keys defined in `properties`, the cascade is: folder -> user -> default.
 * For keys matching `patternProperties`, stored values from folder/user are
 * included directly (patterns have no defaults).
 */
export function resolveCustomSettings(
  schema: JsonSchema07Object,
  userValues: Record<string, unknown> | undefined,
  folderValues: Record<string, unknown> | undefined,
): ResolvedCustomSettings {
  const defaults = extractSchemaDefaults(schema)
  const values: Record<string, unknown> = {}
  const sources: Record<string, SettingSource> = {}
  const knownKeys = new Set(Object.keys(schema.properties))

  // 1. Resolve known property keys via cascade
  for (const key of knownKeys) {
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
  }

  // 2. Include pattern-matched keys from stored values (folder overrides user)
  if (schema.patternProperties) {
    const seenPatternKeys = new Set<string>()

    if (folderValues) {
      for (const key of Object.keys(folderValues)) {
        if (!knownKeys.has(key) && matchesPatternProperty(schema, key)) {
          values[key] = folderValues[key]
          sources[key] = 'folder'
          seenPatternKeys.add(key)
        }
      }
    }

    if (userValues) {
      for (const key of Object.keys(userValues)) {
        if (
          !knownKeys.has(key) &&
          !seenPatternKeys.has(key) &&
          matchesPatternProperty(schema, key)
        ) {
          values[key] = userValues[key]
          sources[key] = 'user'
        }
      }
    }
  }

  return { values, sources }
}
