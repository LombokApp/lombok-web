import { describe, expect, it } from 'bun:test'
import { PlatformObjectAddedEventTriggerIdentifier } from 'src/events.types'
import type { SafeParseReturnType } from 'zod'

import type { TaskTriggerConfig } from '../task.types'
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
    it('accepts an empty array', () => {
      const result = storageAccessPolicySchema.safeParse([])
      expectZodSuccess(result)
    })

    it('accepts a single entry with required fields', () => {
      const valid = [
        {
          folderId: 'folder-123',
          methods: ['GET'],
        },
      ]
      const result = storageAccessPolicySchema.safeParse(valid)
      expectZodSuccess(result)
    })

    it('accepts a single entry with all fields including prefix', () => {
      const valid = [
        {
          folderId: 'folder-123',
          prefix: 'path/to/files',
          methods: ['GET', 'PUT'],
        },
      ]
      const result = storageAccessPolicySchema.safeParse(valid)
      expectZodSuccess(result)
    })

    it('accepts multiple entries', () => {
      const valid = [
        {
          folderId: 'folder-123',
          methods: ['GET'],
        },
        {
          folderId: 'folder-456',
          prefix: 'another/path',
          methods: ['PUT', 'DELETE'],
        },
      ]
      const result = storageAccessPolicySchema.safeParse(valid)
      expectZodSuccess(result)
    })

    it('accepts all valid method values', () => {
      const valid = [
        {
          folderId: 'folder-123',
          methods: ['GET', 'PUT', 'DELETE', 'HEAD'],
        },
      ]
      const result = storageAccessPolicySchema.safeParse(valid)
      expectZodSuccess(result)
    })

    it('accepts prefix without leading slash', () => {
      const valid = [
        {
          folderId: 'folder-123',
          prefix: 'valid/path',
          methods: ['GET'],
        },
      ]
      const result = storageAccessPolicySchema.safeParse(valid)
      expectZodSuccess(result)
    })

    it('accepts empty prefix string', () => {
      const valid = [
        {
          folderId: 'folder-123',
          prefix: '',
          methods: ['GET'],
        },
      ]
      const result = storageAccessPolicySchema.safeParse(valid)
      expectZodSuccess(result)
    })

    it('rejects missing folderId', () => {
      const invalid = [
        {
          methods: ['GET'],
        },
      ]
      const result = storageAccessPolicySchema.safeParse(invalid)
      expectZodFailure(result)
    })

    it('rejects missing methods', () => {
      const invalid = [
        {
          folderId: 'folder-123',
        },
      ]
      const result = storageAccessPolicySchema.safeParse(invalid)
      expectZodFailure(result)
    })

    it('accepts empty methods array', () => {
      const valid = [
        {
          folderId: 'folder-123',
          methods: [],
        },
      ]
      const result = storageAccessPolicySchema.safeParse(valid)
      expectZodSuccess(result)
    })

    it('rejects prefix starting with slash', () => {
      const invalid = [
        {
          folderId: 'folder-123',
          prefix: '/invalid/path',
          methods: ['GET'],
        },
      ]
      const result = storageAccessPolicySchema.safeParse(invalid)
      expectZodFailure(result)
    })

    it('rejects invalid method values', () => {
      const invalid = [
        {
          folderId: 'folder-123',
          methods: ['INVALID_METHOD'],
        },
      ]
      const result = storageAccessPolicySchema.safeParse(invalid)
      expectZodFailure(result)
    })

    it('rejects non-string folderId', () => {
      const invalid = [
        {
          folderId: 123,
          methods: ['GET'],
        },
      ]
      const result = storageAccessPolicySchema.safeParse(invalid)
      expectZodFailure(result)
    })

    it('rejects non-array methods', () => {
      const invalid = [
        {
          folderId: 'folder-123',
          methods: 'GET',
        },
      ]
      const result = storageAccessPolicySchema.safeParse(invalid)
      expectZodFailure(result)
    })

    it('rejects non-string prefix', () => {
      const invalid = [
        {
          folderId: 'folder-123',
          prefix: 123,
          methods: ['GET'],
        },
      ]
      const result = storageAccessPolicySchema.safeParse(invalid)
      expectZodFailure(result)
    })

    it('rejects non-array top-level value', () => {
      const invalid = {
        folderId: 'folder-123',
        methods: ['GET'],
      }
      const result = storageAccessPolicySchema.safeParse(invalid)
      expectZodFailure(result)
    })
  })

  describe('taskOnCompleteConfigSchema', () => {
    it('should validate task with a single onComplete handler config', () => {
      const triggers: TaskTriggerConfig[] = [
        {
          kind: 'schedule',
          config: {
            interval: 15,
            unit: 'minutes',
          },
          onComplete: {
            taskIdentifier: 'test_task',
            dataTemplate: {
              success: {
                someKey: '{{task.result.someKey}}',
              },
              failure: {
                someKey: '{{task.result.someOtherKey}}',
              },
            },
          },
        },
      ]
      const validTask = {
        identifier: 'scheduled_task',
        label: 'Scheduled Task',
        description: 'Task triggered on a schedule',
        triggers,
        handler: {
          type: 'external',
        },
      }

      const result = taskConfigSchema.safeParse(validTask)
      expectZodSuccess(result)
    })

    it('should validate task with a single onComplete handler config with no data config', () => {
      const triggers: TaskTriggerConfig[] = [
        {
          kind: 'schedule',
          config: {
            interval: 15,
            unit: 'minutes',
          },
          onComplete: {
            taskIdentifier: 'test_task',
          },
        },
      ]
      const validTask = {
        identifier: 'scheduled_task',
        label: 'Scheduled Task',
        description: 'Task triggered on a schedule',
        triggers,
        handler: {
          type: 'external',
        },
      }

      const result = taskConfigSchema.safeParse(validTask)
      expectZodSuccess(result)
    })

    it('should validate task with a single onComplete handler config with no just a success data config', () => {
      const triggers: TaskTriggerConfig[] = [
        {
          kind: 'schedule',
          config: {
            interval: 15,
            unit: 'minutes',
          },
          onComplete: {
            taskIdentifier: 'test_task',
            dataTemplate: {
              success: {
                someKey: '{{task.result.someKey}}',
              },
            },
          },
        },
      ]
      const validTask = {
        identifier: 'scheduled_task',
        label: 'Scheduled Task',
        description: 'Task triggered on a schedule',
        triggers,
        handler: {
          type: 'external',
        },
      }

      const result = taskConfigSchema.safeParse(validTask)
      expectZodSuccess(result)
    })

    it('should validate task with a single onComplete handler config with no just a failure data config', () => {
      const triggers: TaskTriggerConfig[] = [
        {
          kind: 'schedule',
          config: {
            interval: 15,
            unit: 'minutes',
          },
          onComplete: {
            taskIdentifier: 'test_task',
            dataTemplate: {
              failure: {
                someKey: '{{task.result.someKey}}',
              },
            },
          },
        },
      ]
      const validTask = {
        identifier: 'scheduled_task',
        label: 'Scheduled Task',
        description: 'Task triggered on a schedule',
        triggers,
        handler: {
          type: 'external',
        },
      }

      const result = taskConfigSchema.safeParse(validTask)
      expectZodSuccess(result)
    })

    it('should validate task with an array of onComplete handler configs', () => {
      const triggers: TaskTriggerConfig[] = [
        {
          kind: 'schedule',
          config: {
            interval: 15,
            unit: 'minutes',
          },
          onComplete: [
            {
              taskIdentifier: 'test_task',
              dataTemplate: {
                success: {
                  someKey: '{{task.result.someKey}}',
                },
              },
            },
            {
              taskIdentifier: 'test_taskk',
              dataTemplate: {
                success: {
                  someKey: '{{task.result.someKey}}',
                },
                failure: {
                  someOtherKey: '{{task.error.someOtherKey}}',
                },
              },
            },
          ],
        },
      ]
      const validTask = {
        identifier: 'scheduled_task',
        label: 'Scheduled Task',
        description: 'Task triggered on a schedule',
        triggers,
        handler: {
          type: 'external',
        },
      }

      const result = taskConfigSchema.safeParse(validTask)
      expectZodSuccess(result)
    })
  })

  describe('taskConfigSchema', () => {
    it('should validate complete task config', () => {
      const validTask = {
        identifier: 'test_task',
        label: 'Test Task',
        description: 'A test task',
        triggers: [
          { kind: 'event', eventIdentifier: 'platform:worker_task_enqueued' },
        ],
        handler: {
          type: 'worker',
          identifier: 'test-worker',
        },
      }
      const result = taskConfigSchema.safeParse(validTask)
      expectZodSuccess(result)
    })

    it('should validate minimal task config', () => {
      const validTask = {
        identifier: 'test_task',
        label: 'Test Task',
        description: 'A test task',
        handler: {
          type: 'external',
        },
      }
      const result = taskConfigSchema.safeParse(validTask)
      expectZodSuccess(result)
    })

    it('should reject task without required fields', () => {
      const invalidTask = {
        identifier: 'test_task',
        // missing label and description and triggers
      }
      const result = taskConfigSchema.safeParse(invalidTask)
      expectZodFailure(result)
    })

    it('should validate task with event trigger and data', () => {
      const validTask = {
        identifier: 'event_task',
        label: 'Event Task',
        description: 'Task triggered by event',
        triggers: [
          {
            kind: 'event',
            eventIdentifier: 'custom_event',
            dataTemplate: {
              foo: 'bar',
            },
          },
        ],
        handler: {
          type: 'worker',
          identifier: 'event-worker',
        },
      }

      const result = taskConfigSchema.safeParse(validTask)
      expectZodSuccess(result)
    })

    it('should validate task with schedule trigger', () => {
      const validTask = {
        identifier: 'scheduled_task',
        label: 'Scheduled Task',
        description: 'Task triggered on a schedule',
        triggers: [
          {
            kind: 'schedule',
            config: {
              interval: 15,
              unit: 'minutes',
            },
          },
        ],
        handler: {
          type: 'external',
        },
      }

      const result = taskConfigSchema.safeParse(validTask)
      expectZodSuccess(result)
    })

    it('should validate task with multiple trigger types', () => {
      const validTask = {
        identifier: 'multi_trigger_task',
        label: 'Multi Trigger Task',
        description: 'Task with event and schedule triggers',
        triggers: [
          {
            kind: 'event',
            eventIdentifier: PlatformObjectAddedEventTriggerIdentifier,
          },
          {
            kind: 'schedule',
            config: {
              interval: 1,
              unit: 'hours',
            },
          },
        ],
        handler: {
          type: 'worker',
          identifier: 'multi-worker',
        },
      }

      const result = taskConfigSchema.safeParse(validTask)
      expectZodSuccess(result)
    })

    it('should reject task with schedule trigger missing config', () => {
      const invalidTask = {
        identifier: 'invalid_schedule_task',
        label: 'Invalid Schedule Task',
        description: 'Schedule trigger without config',
        triggers: [
          {
            kind: 'schedule',
          },
        ],
        handler: {
          type: 'external',
        },
      }

      const result = taskConfigSchema.safeParse(
        invalidTask as unknown as typeof invalidTask,
      )
      expectZodFailure(result)
    })

    it('should reject task with event trigger using invalid identifier', () => {
      const invalidTask = {
        identifier: 'invalid_event_task',
        label: 'Invalid Event Task',
        description: 'Event trigger with invalid identifier',
        triggers: [
          {
            kind: 'event',
            eventIdentifier: 'INVALID-EVENT',
          },
        ],
        handler: {
          type: 'worker',
          identifier: 'event-worker',
        },
      }

      const result = taskConfigSchema.safeParse(invalidTask)
      expectZodFailure(result)
    })
  })
})
