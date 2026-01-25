import { resolve } from 'path'
import type { JobResult } from './job-dispatcher'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export interface ValidationOptions {
  custom?: string // Path to custom validation function (can use Zod schemas)
}

/**
 * Note: Schema validation is handled via custom validation functions.
 * Users should create validation functions that use Zod schemas directly.
 * Example:
 * 
 * ```typescript
 * import { z } from 'zod'
 * 
 * const resultSchema = z.object({
 *   embeddings: z.array(z.object({
 *     vector: z.array(z.number()),
 *   })),
 * })
 * 
 * export default function validate(result: unknown) {
 *   const parseResult = resultSchema.safeParse(result)
 *   return {
 *     valid: parseResult.success,
 *     errors: parseResult.success ? [] : parseResult.error.errors.map(e => e.message)
 *   }
 * }
 * ```
 */

/**
 * Validate job result using custom function
 */
async function validateWithCustom(
  result: unknown,
  customPath: string,
): Promise<ValidationResult> {
  const resolvedPath = resolve(customPath)

  try {
    // Load the custom validation function
    // Note: This uses dynamic import which works in Node.js/Bun
    const module = await import(resolvedPath)

    // Look for a default export or named 'validate' export
    const validateFn =
      module.default || module.validate || module.validateJobResult

    if (typeof validateFn !== 'function') {
      return {
        valid: false,
        errors: [
          `Custom validation function not found in ${customPath}. Expected a function exported as default, 'validate', or 'validateJobResult'`,
        ],
      }
    }

    // Call the validation function
    const validationResult = await validateFn(result)

    // Handle different return types
    if (typeof validationResult === 'boolean') {
      return {
        valid: validationResult,
        errors: validationResult ? [] : ['Custom validation failed'],
      }
    }

    if (
      validationResult &&
      typeof validationResult === 'object' &&
      'valid' in validationResult
    ) {
      return {
        valid: Boolean(validationResult.valid),
        errors:
          Array.isArray(validationResult.errors)
            ? validationResult.errors.map(String)
            : validationResult.valid
              ? []
              : ['Custom validation failed'],
      }
    }

    return {
      valid: false,
      errors: ['Custom validation function returned invalid result'],
    }
  } catch (err) {
    return {
      valid: false,
      errors: [
        `Failed to load or execute custom validation function: ${err instanceof Error ? err.message : String(err)}`,
      ],
    }
  }
}

/**
 * Validate a job result
 */
export async function validateJobResult(
  result: JobResult,
  options?: ValidationOptions,
): Promise<ValidationResult> {
  if (!options) {
    // No validation specified - always pass
    return { valid: true, errors: [] }
  }

  const errors: string[] = []

  // Custom validation (can use Zod schemas)
  if (options.custom) {
    const customResult = await validateWithCustom(
      result.success ? result.result : result.error,
      options.custom,
    )

    if (!customResult.valid) {
      errors.push(...customResult.errors.map((e) => `Custom: ${e}`))
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Example custom validation function signature
 */
export type CustomValidationFunction = (
  result: unknown,
) => Promise<boolean | ValidationResult> | boolean | ValidationResult
