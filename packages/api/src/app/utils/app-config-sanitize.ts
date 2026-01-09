import { appConfigSchema } from '@lombokapp/types'
import { findIllegalJsonChars } from 'src/orm/util/json-sanitize'
import z from 'zod'

export const appConfigSanitize = appConfigSchema.superRefine((value, ctx) => {
  // Convert JSONPath (e.g., "$.a[0].b") to zod path array (e.g., ["a", 0, "b"])
  const jsonPathToZodPath = (jsonPath: string): (string | number)[] => {
    if (jsonPath === '$') {
      return []
    }
    // Remove leading "$." or "$"
    let path = jsonPath.replace(/^\$\.?/, '')
    if (!path) {
      return []
    }

    const result: (string | number)[] = []

    // Handle paths that start with a property name (no leading dot)
    // e.g., "label" or "label.nested" or "items[0]"
    while (path.length > 0) {
      // Match property name (may start at beginning or after dot)
      const propMatch = path.match(/^\.?([^.[]+)/)
      if (propMatch?.[1]) {
        result.push(propMatch[1])
        path = path.slice(propMatch[0].length)
      } else {
        // Match array index
        const arrayMatch = path.match(/^\[(\d+)\]/)
        if (arrayMatch?.[1]) {
          result.push(Number.parseInt(arrayMatch[1], 10))
          path = path.slice(arrayMatch[0].length)
        } else {
          // No match, break to avoid infinite loop
          break
        }
      }
    }

    return result
  }

  // Check for illegal JSON characters and report as zod issues
  const finding = findIllegalJsonChars(value, {
    disallowBinary: true,
  })
  if (finding) {
    const zodPath = jsonPathToZodPath(finding.path)
    let message = ''
    switch (finding.reason) {
      case 'nul_in_string':
        message = 'NUL character not allowed in string'
        break
      case 'control_char_in_string':
        message = `Control character ${finding.detail ?? ''} not allowed in string`
        break
      case 'binary_not_allowed':
        message = 'Binary data not allowed'
        break
      case 'non_finite_number':
        message = 'Non-finite number (Infinity or NaN) not allowed'
        break
      case 'circular_reference':
        message = 'Circular reference not allowed'
        break
      case 'unsupported_type':
        message = `Unsupported type "${finding.detail ?? 'unknown'}" not allowed`
        break
    }
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message,
      path: zodPath,
    })
  }

  return value
})
