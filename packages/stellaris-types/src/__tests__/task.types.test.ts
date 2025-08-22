import { describe, expect, it } from 'bun:test'
import type { SafeParseReturnType } from 'zod'

import { taskInputDataSchema, workerErrorDetailsSchema } from '../task.types'

const expectZodSuccess = (result: SafeParseReturnType<unknown, unknown>) => {
  try {
    expect(result.success).toBe(true)
  } catch (err) {
    if (!result.success) {
      const { issues } = result.error
      // eslint-disable-next-line no-console
      console.error(
        'Zod validation failed. Issues:\n' + JSON.stringify(issues, null, 2),
      )
    }
    throw err
  }
}

const expectZodFailure = (result: SafeParseReturnType<unknown, unknown>) => {
  try {
    expect(result.success).toBe(false)
  } catch (err) {
    if (result.success) {
      // eslint-disable-next-line no-console
      console.error(
        'Expected zod validation to fail, but it succeeded. Parsed value:\n' +
          JSON.stringify(result.data, null, 2),
      )
    } else {
      const { issues } = result.error
      // eslint-disable-next-line no-console
      console.error(
        'Zod validation failed as expected. Issues:\n' +
          JSON.stringify(issues, null, 2),
      )
    }
    throw err
  }
}

describe('task.types', () => {
  describe('taskInputDataSchema', () => {
    it('accepts an empty object', () => {
      const result = taskInputDataSchema.safeParse({})
      expectZodSuccess(result)
    })

    it('accepts string and number values', () => {
      const valid = {
        name: 'alpha',
        count: 42,
      }
      const result = taskInputDataSchema.safeParse(valid)
      expectZodSuccess(result)
    })

    it('accepts nested objects recursively', () => {
      const valid = {
        level1: {
          key: 'value',
          num: 1,
          level2: {
            inner: 'ok',
            deep: {
              n: 5,
            },
          },
        },
      }
      const result = taskInputDataSchema.safeParse(valid)
      expectZodSuccess(result)
    })

    it('rejects boolean values', () => {
      const invalid = {
        flag: true,
      }
      const result = taskInputDataSchema.safeParse(invalid)
      expectZodFailure(result)
    })

    it('rejects arrays', () => {
      const invalid = {
        list: ['a', 'b'],
      }
      const result = taskInputDataSchema.safeParse(invalid)
      expectZodFailure(result)
    })

    it('rejects null values', () => {
      const invalid = {
        value: null as unknown as string,
      }
      const result = taskInputDataSchema.safeParse(invalid as unknown)
      expectZodFailure(result)
    })

    it('rejects non-object top-level values', () => {
      const result = taskInputDataSchema.safeParse('not-an-object')
      expectZodFailure(result)
    })
  })

  describe('workerErrorDetailsSchema', () => {
    it('accepts an empty object', () => {
      const result = workerErrorDetailsSchema.safeParse({})
      expectZodSuccess(result)
    })

    it('accepts string and number values', () => {
      const valid = {
        message: 'failed',
        code: 500,
      }
      const result = workerErrorDetailsSchema.safeParse(valid)
      expectZodSuccess(result)
    })

    it('accepts nested objects recursively', () => {
      const valid = {
        error: {
          type: 'NetworkError',
          details: {
            attempts: 3,
            last: {
              at: '2024-01-01T00:00:00Z',
              status: 503,
            },
          },
        },
      }
      const result = workerErrorDetailsSchema.safeParse(valid)
      expectZodSuccess(result)
    })

    it('rejects boolean values', () => {
      const invalid = {
        retryable: false,
      }
      const result = workerErrorDetailsSchema.safeParse(invalid)
      expectZodFailure(result)
    })

    it('rejects arrays', () => {
      const invalid = {
        stack: ['a', 'b'],
      }
      const result = workerErrorDetailsSchema.safeParse(invalid)
      expectZodFailure(result)
    })

    it('rejects null values', () => {
      const invalid = {
        reason: null as unknown as string,
      }
      const result = workerErrorDetailsSchema.safeParse(invalid as unknown)
      expectZodFailure(result)
    })

    it('rejects non-object top-level values', () => {
      const result = workerErrorDetailsSchema.safeParse(123)
      expectZodFailure(result)
    })
  })
})
