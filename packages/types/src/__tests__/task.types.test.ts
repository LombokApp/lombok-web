import { describe, expect, it } from 'bun:test'
import type { SafeParseReturnType } from 'zod'

import {
  storageAccessPolicySchema,
  taskConfigSchema,
  taskDataSchema,
} from '../task.types'

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
  describe('taskDataSchema', () => {
    it('accepts an empty object', () => {
      const result = taskDataSchema.safeParse({})
      expectZodSuccess(result)
    })

    it('accepts string and number values', () => {
      const valid = {
        message: 'failed',
        code: 500,
      }
      const result = taskDataSchema.safeParse(valid)
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
      const result = taskDataSchema.safeParse(valid)
      expectZodSuccess(result)
    })

    it('rejects non-object top-level values', () => {
      const result = taskDataSchema.safeParse(123)
      expectZodFailure(result)
    })
  })

  describe('storageAccessPolicySchema', () => {
    it('accepts an empty rules array', () => {
      const result = storageAccessPolicySchema.safeParse({ rules: [] })
      expectZodSuccess(result)
    })

    it('accepts a single entry with required fields', () => {
      const valid = {
        rules: [
          {
            folderId: 'folder-123',
            methods: ['GET'],
          },
        ],
      }
      const result = storageAccessPolicySchema.safeParse(valid)
      expectZodSuccess(result)
    })

    it('accepts a single entry with prefix', () => {
      const valid = {
        rules: [
          {
            folderId: 'folder-123',
            prefix: 'path/to/files',
            methods: ['GET', 'PUT'],
          },
        ],
      }
      const result = storageAccessPolicySchema.safeParse(valid)
      expectZodSuccess(result)
    })

    it('accepts a single entry with objectKey', () => {
      const valid = {
        rules: [
          {
            folderId: 'folder-123',
            objectKey: 'specific-file.json',
            methods: ['GET', 'PUT'],
          },
        ],
      }
      const result = storageAccessPolicySchema.safeParse(valid)
      expectZodSuccess(result)
    })

    it('accepts multiple entries with different rule types', () => {
      const valid = {
        rules: [
          {
            folderId: 'folder-123',
            methods: ['GET'],
          },
          {
            folderId: 'folder-456',
            prefix: 'another/path',
            methods: ['PUT', 'DELETE'],
          },
          {
            folderId: 'folder-789',
            objectKey: 'exact-file.txt',
            methods: ['GET'],
          },
        ],
      }
      const result = storageAccessPolicySchema.safeParse(valid)
      expectZodSuccess(result)
    })

    it('accepts all valid method values', () => {
      const valid = {
        rules: [
          {
            folderId: 'folder-123',
            methods: ['GET', 'PUT', 'DELETE', 'HEAD'],
          },
        ],
      }
      const result = storageAccessPolicySchema.safeParse(valid)
      expectZodSuccess(result)
    })

    it('accepts prefix without leading slash', () => {
      const valid = {
        rules: [
          {
            folderId: 'folder-123',
            prefix: 'valid/path',
            methods: ['GET'],
          },
        ],
      }
      const result = storageAccessPolicySchema.safeParse(valid)
      expectZodSuccess(result)
    })

    it('accepts empty prefix string', () => {
      const valid = {
        rules: [
          {
            folderId: 'folder-123',
            prefix: '',
            methods: ['GET'],
          },
        ],
      }
      const result = storageAccessPolicySchema.safeParse(valid)
      expectZodSuccess(result)
    })

    it('accepts outputLocation with folderId only', () => {
      const valid = {
        rules: [
          {
            folderId: 'folder-123',
            methods: ['GET'],
          },
        ],
        outputLocation: {
          folderId: 'output-folder-123',
        },
      }
      const result = storageAccessPolicySchema.safeParse(valid)
      expectZodSuccess(result)
    })

    it('accepts outputLocation with folderId and objectKey', () => {
      const valid = {
        rules: [
          {
            folderId: 'folder-123',
            methods: ['GET'],
          },
        ],
        outputLocation: {
          folderId: 'output-folder-123',
          objectKey: 'output-file.json',
        },
      }
      const result = storageAccessPolicySchema.safeParse(valid)
      expectZodSuccess(result)
    })

    it('accepts outputLocation with folderId and prefix', () => {
      const valid = {
        rules: [
          {
            folderId: 'folder-123',
            methods: ['GET'],
          },
        ],
        outputLocation: {
          folderId: 'output-folder-123',
          prefix: 'output/path',
        },
      }
      const result = storageAccessPolicySchema.safeParse(valid)
      expectZodSuccess(result)
    })

    it('rejects missing rules', () => {
      const invalid = {
        outputLocation: {
          folderId: 'output-folder-123',
        },
      }
      const result = storageAccessPolicySchema.safeParse(invalid)
      expectZodFailure(result)
    })

    it('rejects missing folderId in rule', () => {
      const invalid = {
        rules: [
          {
            methods: ['GET'],
          },
        ],
      }
      const result = storageAccessPolicySchema.safeParse(invalid)
      expectZodFailure(result)
    })

    it('rejects missing methods in rule', () => {
      const invalid = {
        rules: [
          {
            folderId: 'folder-123',
          },
        ],
      }
      const result = storageAccessPolicySchema.safeParse(invalid)
      expectZodFailure(result)
    })

    it('accepts empty methods array', () => {
      const valid = {
        rules: [
          {
            folderId: 'folder-123',
            methods: [],
          },
        ],
      }
      const result = storageAccessPolicySchema.safeParse(valid)
      expectZodSuccess(result)
    })

    it('rejects prefix starting with slash', () => {
      const invalid = {
        rules: [
          {
            folderId: 'folder-123',
            prefix: '/invalid/path',
            methods: ['GET'],
          },
        ],
      }
      const result = storageAccessPolicySchema.safeParse(invalid)
      expectZodFailure(result)
    })

    it('rejects invalid method values', () => {
      const invalid = {
        rules: [
          {
            folderId: 'folder-123',
            methods: ['INVALID_METHOD'],
          },
        ],
      }
      const result = storageAccessPolicySchema.safeParse(invalid)
      expectZodFailure(result)
    })

    it('rejects non-string folderId', () => {
      const invalid = {
        rules: [
          {
            folderId: 123,
            methods: ['GET'],
          },
        ],
      }
      const result = storageAccessPolicySchema.safeParse(invalid)
      expectZodFailure(result)
    })

    it('rejects non-array methods', () => {
      const invalid = {
        rules: [
          {
            folderId: 'folder-123',
            methods: 'GET',
          },
        ],
      }
      const result = storageAccessPolicySchema.safeParse(invalid)
      expectZodFailure(result)
    })

    it('rejects non-string prefix', () => {
      const invalid = {
        rules: [
          {
            folderId: 'folder-123',
            prefix: 123,
            methods: ['GET'],
          },
        ],
      }
      const result = storageAccessPolicySchema.safeParse(invalid)
      expectZodFailure(result)
    })

    it('rejects non-string objectKey', () => {
      const invalid = {
        rules: [
          {
            folderId: 'folder-123',
            objectKey: 123,
            methods: ['GET'],
          },
        ],
      }
      const result = storageAccessPolicySchema.safeParse(invalid)
      expectZodFailure(result)
    })

    it('rejects rule with both prefix and objectKey', () => {
      const invalid = {
        rules: [
          {
            folderId: 'folder-123',
            prefix: 'path/to/files',
            objectKey: 'specific-file.json',
            methods: ['GET'],
          },
        ],
      }
      const result = storageAccessPolicySchema.safeParse(invalid)
      expectZodFailure(result)
    })

    it('rejects non-array rules', () => {
      const invalid = {
        rules: {
          folderId: 'folder-123',
          methods: ['GET'],
        },
      }
      const result = storageAccessPolicySchema.safeParse(invalid)
      expectZodFailure(result)
    })

    it('rejects array top-level value (old format)', () => {
      const invalid = [
        {
          folderId: 'folder-123',
          methods: ['GET'],
        },
      ]
      const result = storageAccessPolicySchema.safeParse(invalid)
      expectZodFailure(result)
    })

    it('rejects outputLocation prefix starting with slash', () => {
      const invalid = {
        rules: [
          {
            folderId: 'folder-123',
            methods: ['GET'],
          },
        ],
        outputLocation: {
          folderId: 'output-folder-123',
          prefix: '/invalid/path',
        },
      }
      const result = storageAccessPolicySchema.safeParse(invalid)
      expectZodFailure(result)
    })

    it('rejects outputLocation with both prefix and objectKey', () => {
      const invalid = {
        rules: [
          {
            folderId: 'folder-123',
            methods: ['GET'],
          },
        ],
        outputLocation: {
          folderId: 'output-folder-123',
          prefix: 'path/to/files',
          objectKey: 'specific-file.json',
        },
      }
      const result = storageAccessPolicySchema.safeParse(invalid)
      expectZodFailure(result)
    })
  })

  describe('taskConfigSchema', () => {
    it('should validate minimal task config', () => {
      const validTask = {
        identifier: 'test_task',
        label: 'Test Task',
        description: 'A test task',
        handler: {
          type: 'runtime',
          identifier: 'worker-123',
        },
      }
      const result = taskConfigSchema.safeParse(validTask)
      expectZodSuccess(result)
    })

    it('should reject task without required fields', () => {
      const invalidTask = {
        identifier: 'test_task',
        // missing label and description
      }
      const result = taskConfigSchema.safeParse(invalidTask)
      expectZodFailure(result)
    })
  })
})
