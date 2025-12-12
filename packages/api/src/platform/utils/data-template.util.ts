import type {
  JsonSerializableObject,
  JsonSerializableValue,
} from '@lombokapp/types'

const TEMPLATE_EXPRESSION = /^\s*\{\{\s*(?<path>.+?)\s*\}\}\s*$/

function getValueAtPath(
  source: Record<string, unknown>,
  path: string,
): JsonSerializableValue | undefined {
  const segments = path
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean)

  let current: unknown = source
  for (const segment of segments) {
    if (
      current !== null &&
      typeof current === 'object' &&
      Object.prototype.hasOwnProperty.call(current, segment)
    ) {
      current = (current as Record<string, unknown>)[segment]
    } else {
      return undefined
    }
  }

  return current as JsonSerializableValue
}

export function dataFromTemplate(
  objects: Record<string, unknown>,
  data: Record<string, JsonSerializableValue>,
): JsonSerializableObject {
  const parsedData: JsonSerializableObject = {}
  for (const [key, value] of Object.entries(data)) {
    let resolvedValue: JsonSerializableValue | undefined = value
    if (typeof value === 'string') {
      const match = value.match(TEMPLATE_EXPRESSION)
      if (match?.groups?.path) {
        resolvedValue = getValueAtPath(objects, match.groups.path)
      }
    }

    const finalValue: JsonSerializableValue =
      resolvedValue === undefined ? null : resolvedValue
    parsedData[key] = finalValue
  }

  return parsedData
}
