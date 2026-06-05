import { describe, expect, it } from 'bun:test'
import { CoreObjectAddedEventTriggerIdentifier } from 'src/events.types'
import type { z } from 'zod'

import type { AppConfig } from '../apps.types'

type SafeParseReturnType<Input, Output> =
  | { success: true; data: Output }
  | { success: false; error: z.ZodError<Input> }
import {
  appConfigSchema,
  appConfigWithManifestSchema,
  appContributionsSchema,
  appManifestSchema,
  appMetricsSchema,
  appRuntimeWorkerConfigSchema,
  appRuntimeWorkersBundleSchema,
  appRuntimeWorkerSchema,
  appRuntimeWorkerScriptIdentifierSchema,
  appRuntimeWorkersMapSchema,
  appRuntimeWorkerSocketConnectionSchema,
  appSocketMessageSchema,
  appUiBundleSchema,
  appUIConfigSchema,
  appUILinkSchema,
  ConfigParamType,
  containerProfileConfigSchema,
  containerProfileResourceHintsSchema,
  coreScopeAppPermissionsSchema,
  dockerWorkerConfigSchema,
  execJobDefinitionSchema,
  folderScopeAppPermissionsSchema,
  httpJobDefinitionSchema,
  iconSchema,
  mobileContributionsSchema,
  paramConfigSchema,
  userScopeAppPermissionsSchema,
  workerEntrypointSchema,
} from '../apps.types'
import {
  taskOnCompleteConfigSchema,
  taskTriggerConfigSchema,
} from '../task.types'

// Helper assertions that print zod errors only if the expectation fails
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

const validIcon = {
  source: 'builtin' as const,
  name: 'app' as const,
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

describe('apps.types', () => {
  describe('paramConfigSchema', () => {
    it('should validate boolean parameter config', () => {
      const validConfig = {
        type: ConfigParamType.boolean,
        default: true,
      }
      const result = paramConfigSchema.safeParse(validConfig)
      expectZodSuccess(result)
    })

    it('should validate string parameter config', () => {
      const validConfig = {
        type: ConfigParamType.string,
        default: 'test',
      }
      const result = paramConfigSchema.safeParse(validConfig)
      expectZodSuccess(result)
    })

    it('should validate number parameter config', () => {
      const validConfig = {
        type: ConfigParamType.number,
        default: 42,
      }
      const result = paramConfigSchema.safeParse(validConfig)
      expectZodSuccess(result)
    })

    it('should validate parameter config without default', () => {
      const validConfig = {
        type: ConfigParamType.string,
      }
      const result = paramConfigSchema.safeParse(validConfig)
      expectZodSuccess(result)
    })

    it('should reject invalid parameter type', () => {
      const invalidConfig = {
        type: 'invalid',
        default: 'test',
      }
      const result = paramConfigSchema.safeParse(invalidConfig)
      expectZodFailure(result)
    })
  })

  describe('appConfigSchema', () => {
    it('should validate minimal app config', () => {
      const validApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        icon: validIcon,
      }
      const result = appConfigSchema.safeParse(validApp)
      expectZodSuccess(result)
    })
    it('should validate when worker handler identifier exists in workers', () => {
      const validApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        icon: validIcon,
        tasks: [
          {
            identifier: 'task',
            label: 'Task 1',
            description: 'First task',
            handler: {
              type: 'runtime',
              identifier: 'script1',
            },
          },
        ],
        runtimeWorkers: {
          script1: {
            entrypoint: 'worker1.js',
            description: 'Test script',
            environmentVariables: { VAR1: 'value1' },
          },
        },
      }
      const result = appConfigSchema.safeParse(validApp)
      expectZodSuccess(result)
    })

    it('should reject when worker handler identifier does not exist in workers', () => {
      const invalidApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        tasks: [
          {
            identifier: 'task',
            label: 'Task 1',
            description: 'First task',
            handler: {
              type: 'runtime',
              identifier: 'missing_worker',
            },
          },
        ],
        workers: {
          script1: {
            entrypoint: 'worker1.js',
            description: 'Test script',
            environmentVariables: { VAR1: 'value1' },
          },
        },
      }
      const result = appConfigSchema.safeParse(invalidApp)
      expectZodFailure(result)
    })

    it('should reject app with invalid identifier', () => {
      const invalidApp = {
        slug: 'TEST_APP', // uppercase not allowed
        label: 'Test App',
        description: 'A test application',
        tasks: [
          {
            identifier: 'task_one',
            label: 'Task 1',
            description: 'First task',
          },
        ],
      }
      const result = appConfigSchema.safeParse(invalidApp)
      expectZodFailure(result)
    })

    it("should reject app with 'platform' slug", () => {
      const invalidApp = {
        slug: 'platform',
        label: 'Test App',
        description: 'A test application',
        tasks: [
          {
            identifier: 'task_one',
            label: 'Task 1',
            description: 'First task',
          },
        ],
      }
      const result = appConfigSchema.safeParse(invalidApp)
      expectZodFailure(result)
    })

    it("should reject app with 'core' slug", () => {
      const invalidApp = {
        slug: 'core',
        label: 'Test App',
        description: 'A test application',
        tasks: [
          {
            identifier: 'task_one',
            label: 'Task 1',
            description: 'First task',
          },
        ],
      }
      const result = appConfigSchema.safeParse(invalidApp)
      expectZodFailure(result)
    })

    it('should reject app with empty identifier', () => {
      const invalidApp = {
        slug: '',
        label: 'Test App',
        description: 'A test application',
        tasks: [
          {
            identifier: 'task_one',
            label: 'Task 1',
            description: 'First task',
          },
        ],
      }
      const result = appConfigSchema.safeParse(invalidApp)
      expectZodFailure(result)
    })

    it('should validate top-level event trigger data templating', () => {
      const appWithTemplatedTrigger: AppConfig = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        icon: validIcon,
        subscribedCoreEvents: ['core:worker_task_enqueued'],
        runtimeWorkers: {
          worker1: {
            entrypoint: 'worker.js',
            description: 'Test worker',
          },
        },
        tasks: [
          {
            identifier: 'templated_task',
            label: 'Templated Task',
            description: 'Uses event data interpolation',
            handler: {
              type: 'runtime',
              identifier: 'worker1',
            },
          },
        ],
        triggers: [
          {
            kind: 'event',
            eventIdentifier: 'core:worker_task_enqueued',
            taskIdentifier: 'templated_task',
            dataTemplate: {
              innerTaskId: '{{event.data.innerTaskId}}',
              appIdentifier: '{{event.data.appIdentifier}}',
              workerIdentifier: '{{event.data.workerIdentifier}}',
            },
          },
        ],
      }

      const result = appConfigSchema.safeParse(appWithTemplatedTrigger)
      expectZodSuccess(result)
    })

    it('should validate app config with top-level triggers handled by tasks', () => {
      const validApp: AppConfig = {
        slug: 'demo',
        label: 'Demo App',
        description: 'A demo application',
        icon: validIcon,
        subscribedCoreEvents: ['core:object_added'],
        tasks: [
          {
            identifier: 'demo_worker_task_on_complete',
            label: 'On Complete Handler',
            description: 'Is run as a completion handler for another task.',
            handler: {
              type: 'runtime',
              identifier: 'demo_on_complete_worker',
            },
          },
          {
            identifier: 'demo_object_added_worker_task',
            label: 'Demo Object Added Worker',
            description: 'A task that runs for every newly added object.',
            handler: {
              type: 'runtime',
              identifier: 'demo_object_added_worker',
            },
          },
          {
            identifier: 'demo_scheduled_worker_task',
            label: 'Demo Scheduled Worker',
            description: 'A task that runs in response to a schedule event.',
            handler: {
              type: 'runtime',
              identifier: 'demo_scheduled_worker',
            },
          },
        ],
        runtimeWorkers: {
          demo_object_added_worker: {
            entrypoint: 'demo_object_added_worker/index.ts',
            description: 'Runs for every newly added object.',
          },
          demo_scheduled_worker: {
            entrypoint: 'demo_scheduled_worker/index.ts',
            description: 'Runs in response to a schedule event.',
          },
          demo_on_complete_worker: {
            entrypoint: 'demo_on_complete_worker/index.ts',
            description: 'Runs as a completion handler for another task.',
          },
        },
        triggers: [
          {
            kind: 'event',
            eventIdentifier: 'core:object_added',
            taskIdentifier: 'demo_object_added_worker_task',
            onComplete: [
              {
                taskIdentifier: 'demo_worker_task_on_complete',
                dataTemplate: {
                  success: {
                    taskError: '{{task.error}}',
                  },
                },
              },
            ],
          },
          {
            kind: 'schedule',
            triggerKey: 'hourly_job',
            config: {
              kind: 'interval',
              interval: 1,
              unit: 'hours',
            },
            taskIdentifier: 'demo_scheduled_worker_task',
          },
        ],
      }

      const result = appConfigSchema.safeParse(validApp)
      expectZodSuccess(result)
    })

    it('should reject app config when top-level trigger handler references unknown task', () => {
      const invalidApp: AppConfig = {
        slug: 'demo',
        label: 'Demo App',
        description: 'A demo application',
        icon: validIcon,
        triggers: [
          {
            kind: 'event',
            eventIdentifier: 'core:object_added',
            taskIdentifier: 'missing_task',
          },
        ],
      }

      const result = appConfigSchema.safeParse(invalidApp)
      expectZodFailure(result)
    })

    it('should reject app config when onComplete handler references unknown task', () => {
      const invalidApp: AppConfig = {
        slug: 'demo',
        label: 'Demo App',
        description: 'A demo application',
        icon: validIcon,
        runtimeWorkers: {
          myworker: {
            entrypoint: 'worker.js',
            description: 'Test worker',
          },
        },
        tasks: [
          {
            identifier: 'root_task',
            label: 'Root task',
            description: 'First task',
            handler: {
              type: 'runtime',
              identifier: 'myworker',
            },
          },
        ],
        triggers: [
          {
            kind: 'schedule',
            triggerKey: 'hourly_job',
            config: {
              kind: 'interval',
              interval: 1,
              unit: 'hours',
            },
            taskIdentifier: 'root_task',
            onComplete: [
              {
                taskIdentifier: 'missing_task',
              },
            ],
          },
        ],
      }

      const result = appConfigSchema.safeParse(invalidApp)
      expectZodFailure(result)
    })

    it('should reject app config when nested onComplete handler references unknown task', () => {
      const invalidApp: AppConfig = {
        slug: 'demo',
        label: 'Demo App',
        description: 'A demo application',
        icon: validIcon,
        tasks: [
          {
            identifier: 'root_task',
            label: 'Root task',
            description: 'First task',
            handler: {
              type: 'runtime',
              identifier: 'myworker',
            },
          },
          {
            identifier: 'first_on_complete',
            label: 'First onComplete',
            description: 'First onComplete task',
            handler: {
              type: 'runtime',
              identifier: 'mysecondworker',
            },
          },
        ],
        triggers: [
          {
            kind: 'event',
            eventIdentifier: 'core:object_added',
            taskIdentifier: 'root_task',
            onComplete: [
              {
                taskIdentifier: 'first_on_complete',
                onComplete: [
                  {
                    taskIdentifier: 'deep_missing_task',
                  },
                ],
              },
            ],
          },
        ],
      }

      const result = appConfigSchema.safeParse(invalidApp)
      expectZodFailure(result)
    })
  })

  describe('taskTriggerConfigSchema', () => {
    it('should validate trigger with onComplete task chain', () => {
      const result = taskTriggerConfigSchema.safeParse({
        kind: 'event',
        eventIdentifier: 'core:object_added',
        taskIdentifier: 'demo_worker',
        onComplete: [
          {
            taskIdentifier: 'on_complete_task',
            condition: 'task.success',
            dataTemplate: {
              someKey: '{{task.result.someKey}}',
            },
            onComplete: [
              {
                taskIdentifier: 'final_task',
              },
            ],
          },
        ],
      })

      expectZodSuccess(result)
    })

    it('should reject trigger without a task identifier', () => {
      const result = taskTriggerConfigSchema.safeParse({
        kind: 'event',
        eventIdentifier: 'core:object_added',
      } as unknown)

      expectZodFailure(result)
    })

    describe('condition validation', () => {
      it('should accept valid condition expressions', () => {
        const result = taskTriggerConfigSchema.safeParse({
          kind: 'event',
          eventIdentifier: 'core:object_added',
          taskIdentifier: 'demo_worker',
          condition: "event.data.mediaType === 'IMAGE'",
        })

        expectZodSuccess(result)
      })

      it('should accept condition with logical operators', () => {
        const result = taskTriggerConfigSchema.safeParse({
          kind: 'event',
          eventIdentifier: 'core:object_added',
          taskIdentifier: 'demo_worker',
          condition:
            "event.data.mediaType === 'IMAGE' || event.data.mediaType === 'VIDEO'",
        })

        expectZodSuccess(result)
      })

      it('should reject condition with constructor access', () => {
        const result = taskTriggerConfigSchema.safeParse({
          kind: 'event',
          eventIdentifier: 'core:object_added',
          taskIdentifier: 'demo_worker',
          condition: 'event.data.constructor.constructor',
        })

        expectZodFailure(result)
        if (!result.success) {
          expect(result.error.issues[0]?.message).toContain(
            'Invalid condition expression',
          )
        }
      })

      it('should reject condition with nested constructor access', () => {
        const result = taskTriggerConfigSchema.safeParse({
          kind: 'event',
          eventIdentifier: 'core:object_added',
          taskIdentifier: 'demo_worker',
          condition: 'event.data.someProperty.constructor',
        })

        expectZodFailure(result)
      })

      it('should accept condition without constructor access', () => {
        const result = taskTriggerConfigSchema.safeParse({
          kind: 'event',
          eventIdentifier: 'core:object_added',
          taskIdentifier: 'demo_worker',
          condition: 'event.data.mediaType',
        })

        expectZodSuccess(result)
      })
    })
  })

  describe('taskOnCompleteConfigSchema', () => {
    it('should validate a standalone onComplete config', () => {
      const result = taskOnCompleteConfigSchema.safeParse({
        taskIdentifier: 'test_task',
        dataTemplate: {
          someKey: '{{result.someKey}}',
        },
        onComplete: [
          {
            taskIdentifier: 'nested_task',
          },
        ],
      })
      expectZodSuccess(result)
    })

    describe('condition validation', () => {
      it('should accept valid condition expressions', () => {
        const result = taskOnCompleteConfigSchema.safeParse({
          taskIdentifier: 'test_task',
          condition: 'task.success',
        })

        expectZodSuccess(result)
      })

      it('should accept condition with comparisons', () => {
        const result = taskOnCompleteConfigSchema.safeParse({
          taskIdentifier: 'test_task',
          condition: 'task.success === true',
        })

        expectZodSuccess(result)
      })

      it('should accept condition with logical operators', () => {
        const result = taskOnCompleteConfigSchema.safeParse({
          taskIdentifier: 'test_task',
          condition: 'task.success && task.result.value !== null',
        })

        expectZodSuccess(result)
      })

      it('should reject condition with constructor access', () => {
        const result = taskOnCompleteConfigSchema.safeParse({
          taskIdentifier: 'test_task',
          condition: 'task.constructor.constructor',
        })

        expectZodFailure(result)
        if (!result.success) {
          expect(result.error.issues[0]?.message).toContain(
            'Invalid condition expression',
          )
        }
      })

      it('should reject condition with nested constructor access', () => {
        const result = taskOnCompleteConfigSchema.safeParse({
          taskIdentifier: 'test_task',
          condition: 'task.result.constructor',
        })

        expectZodFailure(result)
      })

      it('should accept condition without constructor access', () => {
        const result = taskOnCompleteConfigSchema.safeParse({
          taskIdentifier: 'test_task',
          condition: 'task.result.value',
        })

        expectZodSuccess(result)
      })

      it('should accept negated conditions', () => {
        const result = taskOnCompleteConfigSchema.safeParse({
          taskIdentifier: 'test_task',
          condition: '!task.success',
        })

        expectZodSuccess(result)
      })
    })
  })

  describe('appConfigWithManifestSchema', () => {
    it('should validate when worker entrypoints exist in manifest', () => {
      const manifest = {
        '/workers/worker1.js': {
          hash: 'abc123',
          size: 1024,
          mimeType: 'application/javascript',
        },
        '/workers/worker2.js': {
          hash: 'def456',
          size: 512,
          mimeType: 'application/javascript',
        },
      }

      const validApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        icon: validIcon,
        tasks: [
          {
            identifier: 'task_one',
            label: 'Task 1',
            description: 'First task',
            handler: {
              type: 'runtime',
              identifier: 'script1',
            },
          },
        ],
        runtimeWorkers: {
          script1: {
            entrypoint: 'worker1.js',
            description: 'Test script',
          },
        },
      }

      const result = appConfigWithManifestSchema(manifest).safeParse(validApp)
      expectZodSuccess(result)
    })

    it('should reject when worker entrypoint does not exist in manifest', () => {
      const manifest = {
        '/workers/worker1.js': {
          hash: 'abc123',
          size: 1024,
          mimeType: 'application/javascript',
        },
      }

      const invalidApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        icon: validIcon,
        runtimeWorkers: {
          script1: {
            entrypoint: 'nonexistent.js',
            description: 'Test script',
          },
        },
      }

      const result = appConfigWithManifestSchema(manifest).safeParse(invalidApp)
      expectZodFailure(result)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      expect(result.error?.issues[0]!.message).toContain(
        'does not exist in manifest',
      )
    })

    it('should validate when no workers are defined', () => {
      const manifest = {
        'file1.js': {
          hash: 'abc123',
          size: 1024,
          mimeType: 'application/javascript',
        },
      }

      const validApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        icon: validIcon,
      }

      const result = appConfigWithManifestSchema(manifest).safeParse(validApp)
      expectZodSuccess(result)
    })

    it('validates a custom SVG icon whose path exists in the UI manifest', () => {
      const manifest = {
        '/ui/icons/logo.svg': {
          hash: 'a',
          size: 100,
          mimeType: 'image/svg+xml',
        },
      }
      const validApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        ui: { enabled: true },
        icon: {
          source: 'custom',
          format: 'svg',
          rendering: 'original',
          assets: [{ path: 'icons/logo.svg' }],
        },
      }
      const result = appConfigWithManifestSchema(manifest).safeParse(validApp)
      expectZodSuccess(result)
    })

    it('rejects a custom icon whose asset path is missing from the UI manifest', () => {
      const manifest = {
        '/ui/index.html': {
          hash: 'a',
          size: 100,
          mimeType: 'text/html',
        },
      }
      const invalidApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        ui: { enabled: true },
        icon: {
          source: 'custom',
          format: 'svg',
          rendering: 'original',
          assets: [{ path: 'icons/missing.svg' }],
        },
      }
      const result = appConfigWithManifestSchema(manifest).safeParse(invalidApp)
      expectZodFailure(result)
      if (!result.success) {
        const issue = result.error.issues.find((i) =>
          i.message.includes('does not exist in the app'),
        )
        expect(issue).toBeDefined()
      }
    })

    it('rejects a custom icon whose path tries to traverse upwards', () => {
      const manifest = {
        '/ui/index.html': {
          hash: 'a',
          size: 100,
          mimeType: 'text/html',
        },
      }
      const invalidApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        ui: { enabled: true },
        icon: {
          source: 'custom',
          format: 'svg',
          rendering: 'original',
          assets: [{ path: '../secret.svg' }],
        },
      }
      const result = appConfigWithManifestSchema(manifest).safeParse(invalidApp)
      expectZodFailure(result)
      if (!result.success) {
        const issue = result.error.issues.find((i) =>
          i.message.includes('paths must be relative'),
        )
        expect(issue).toBeDefined()
      }
    })
  })

  describe('appManifestSchema', () => {
    it('should validate app manifest', () => {
      const validManifest = {
        'file1.js': {
          hash: 'abc123',
          size: 1024,
          mimeType: 'application/javascript',
        },
        'file2.css': {
          hash: 'def456',
          size: 512,
          mimeType: 'text/css',
        },
      }
      const result = appManifestSchema.safeParse(validManifest)
      expectZodSuccess(result)
    })

    it('should reject manifest with invalid entry', () => {
      const invalidManifest = {
        'file1.js': {
          hash: 'abc123',
          // missing size and mimeType
        },
      }
      const result = appManifestSchema.safeParse(invalidManifest)
      expectZodFailure(result)
    })
  })

  describe('appWorkerSocketConnectionSchema', () => {
    it('should validate app worker socket connection', () => {
      const validWorker = {
        appIdentifier: 'testapp-12345678',
        workerId: 'worker1',
        socketClientId: 'client123',
        ip: '192.168.1.1',
      }
      const result =
        appRuntimeWorkerSocketConnectionSchema.safeParse(validWorker)
      expectZodSuccess(result)
    })

    it('should reject worker socket connection with missing fields', () => {
      const invalidWorker = {
        appIdentifier: 'testapp',
        // missing other required fields
      }
      const result =
        appRuntimeWorkerSocketConnectionSchema.safeParse(invalidWorker)
      expectZodFailure(result)
    })
  })

  describe('appMenuItemSchema', () => {
    it('should validate menu item config', () => {
      const validMenuItem = {
        label: 'Test Menu',
        icon: validIcon,
        path: '/',
      }
      const result = appUILinkSchema.safeParse(validMenuItem)
      expectZodSuccess(result)
    })

    it('should validate menu item config without icon', () => {
      const validMenuItem = {
        label: 'Test Menu',
        path: '/',
      }
      const result = appUILinkSchema.safeParse(validMenuItem)
      expectZodSuccess(result)
    })
  })

  describe('appUIConfigSchema', () => {
    it('should validate UI config', () => {
      const validUIConfig = {
        description: 'Test UI',
      }
      const result = appUIConfigSchema.safeParse(validUIConfig)
      expectZodSuccess(result)
    })
  })

  describe('appWorkerScriptConfigSchema', () => {
    it('should validate worker script config', () => {
      const validScriptConfig = {
        entrypoint: 'worker.js',
        description: 'Test script',
        environmentVariables: {
          SOME_ENV_VAR: 'production',
          API_URL: 'https://api.example.com',
        },
      }
      const result = appRuntimeWorkerConfigSchema.safeParse(validScriptConfig)
      expectZodSuccess(result)
    })

    it('should validate worker script config without env vars', () => {
      const validScriptConfig = {
        entrypoint: 'worker.js',
        description: 'Test script',
      }
      const result = appRuntimeWorkerConfigSchema.safeParse(validScriptConfig)
      expectZodSuccess(result)
    })

    it('should validate worker script config with label', () => {
      const validScriptConfig = {
        entrypoint: 'worker.js',
        description: 'Test script',
        label: 'My Worker',
      }
      const result = appRuntimeWorkerConfigSchema.safeParse(validScriptConfig)
      expectZodSuccess(result)
    })

    it('should validate worker script config with label and env vars', () => {
      const validScriptConfig = {
        entrypoint: 'worker.js',
        description: 'Test script',
        label: 'My Worker',
        environmentVariables: {
          SOME_ENV_VAR: 'production',
        },
      }
      const result = appRuntimeWorkerConfigSchema.safeParse(validScriptConfig)
      expectZodSuccess(result)
    })
  })

  describe('workerEntrypointSchema', () => {
    it('should validate a simple relative entrypoint', () => {
      const result = workerEntrypointSchema.safeParse('workers/worker.js')
      expectZodSuccess(result)
    })

    it('should reject entrypoints starting with "/"', () => {
      const result = workerEntrypointSchema.safeParse('/workers/worker.js')
      expectZodFailure(result)
    })

    it('should reject entrypoints starting with "./"', () => {
      const result = workerEntrypointSchema.safeParse('./worker.js')
      expectZodFailure(result)
    })

    it('should reject entrypoints containing ".."', () => {
      const result = workerEntrypointSchema.safeParse('workers/../worker.js')
      expectZodFailure(result)
    })

    it('should reject entrypoints with backslashes', () => {
      const result = workerEntrypointSchema.safeParse('workers\\worker.js')
      expectZodFailure(result)
    })

    it('should reject entrypoints with leading or trailing whitespace', () => {
      const result = workerEntrypointSchema.safeParse(' worker.js ')
      expectZodFailure(result)
    })

    it('should reject entrypoints with consecutive slashes', () => {
      const result = workerEntrypointSchema.safeParse('workers//worker.js')
      expectZodFailure(result)
    })
  })

  describe('appContributionsSchema', () => {
    it('should validate complete contributions object', () => {
      const validContributions = {
        sidebarMenuLinks: [
          {
            label: 'Dashboard',
            path: '/dashboard',
          },
        ],
        folderSidebarViews: [
          {
            label: 'Folder Stats',
            path: '/folder-stats',
          },
        ],
        objectSidebarViews: [
          {
            label: 'Object Preview',
            path: '/object-sidebar',
          },
        ],
        objectDetailViews: [
          {
            label: 'Object Detail',
            path: '/object-detail',
          },
        ],
        folderDetailViews: [
          {
            label: 'Folder Detail',
            path: '/folder-detail',
          },
        ],
      }
      const result = appContributionsSchema.safeParse(validContributions)
      expectZodSuccess(result)
    })

    it('should allow empty arrays for all contribution sections', () => {
      const validContributions = {
        sidebarMenuLinks: [],
        folderSidebarViews: [],
        objectSidebarViews: [],
        objectDetailViews: [],
        folderDetailViews: [],
      }
      const result = appContributionsSchema.safeParse(validContributions)
      expectZodSuccess(result)
    })

    it('should reject contributions missing a required section', () => {
      const invalidContributions = {
        // sidebarMenuLinks missing
        folderSidebarViews: [],
        objectSidebarViews: [],
        objectDetailViews: [],
        folderDetailViews: [],
      }
      const result = appContributionsSchema.safeParse(
        invalidContributions as unknown,
      )
      expectZodFailure(result)
    })

    it('should reject when a section has the wrong type', () => {
      const invalidContributions = {
        sidebarMenuLinks: {},
        folderSidebarViews: [],
        objectSidebarViews: [],
        objectDetailViews: [],
        folderDetailViews: [],
      }
      const result = appContributionsSchema.safeParse(
        invalidContributions as unknown,
      )
      expectZodFailure(result)
    })

    it('should accept an optional mobile contributions block', () => {
      const validContributions = {
        sidebarMenuLinks: [],
        folderSidebarViews: [],
        objectSidebarViews: [],
        objectDetailViews: [],
        folderDetailViews: [],
        mobile: {
          root: {
            views: [
              {
                id: 'home',
                navRoot: true,
                components: [
                  { id: 'root', component: 'Column', children: ['title'] },
                  { id: 'title', component: 'Text', text: 'Hello' },
                ],
              },
            ],
          },
        },
      }
      const result = appContributionsSchema.safeParse(validContributions)
      expectZodSuccess(result)
    })
  })

  describe('mobileContributionsSchema', () => {
    // Minimal valid nav-root (entry) view; overrides are merged on top.
    const navRootView = (overrides: Record<string, unknown> = {}) => ({
      id: 'home',
      navRoot: true,
      components: [
        { id: 'root', component: 'Column', children: ['title'] },
        { id: 'title', component: 'Text', text: 'Hello' },
      ],
      ...overrides,
    })

    // Minimal valid mobile root; overrides are merged on top.
    const root = (overrides: Record<string, unknown> = {}) => ({
      views: [navRootView()],
      ...overrides,
    })

    it('validates a rich component view with queries, actions, and navigation', () => {
      const valid = {
        queries: {
          'lombok.viewer': { source: 'lombok', path: '/viewer' },
          'app.profile.self': {
            source: 'app',
            worker: 'api_worker',
            path: '/profile/self',
          },
          'app.profile.metrics': {
            source: 'app',
            worker: 'api_worker',
            path: '/profile/metrics',
            method: 'GET',
          },
          'app.profile.notification': {
            source: 'app',
            worker: 'api_worker',
            path: '/profile/notification',
          },
        },
        root: {
          views: [
            {
              id: 'dashboard',
              navRoot: true,
              components: [
                {
                  id: 'root',
                  component: 'Column',
                  children: ['avatar', 'name', 'metrics', 'go'],
                },
                {
                  id: 'avatar',
                  component: 'Avatar',
                  imageUrl: { path: '/profile/self/avatarUrl' },
                  initials: { path: '/profile/self/initials' },
                  size: 56,
                  accessibility: { label: { path: '/profile/self/name' } },
                },
                {
                  id: 'name',
                  component: 'Text',
                  text: { path: '/profile/self/name' },
                  variant: 'h3',
                },
                {
                  id: 'metrics',
                  component: 'List',
                  children: {
                    componentId: 'metric',
                    path: '/profile/metrics/items',
                  },
                  direction: 'horizontal',
                },
                {
                  id: 'metric',
                  component: 'MetricCard',
                  label: { path: 'label' },
                  value: { path: 'value' },
                  tint: 'blue',
                },
                {
                  id: 'go',
                  component: 'Button',
                  child: 'go-label',
                  variant: 'primary',
                  action: {
                    event: {
                      name: 'navigate',
                      context: { target: 'detail', id: 'x' },
                    },
                  },
                },
                { id: 'go-label', component: 'Text', text: 'Open' },
              ],
              initialDataModel: {
                profile: { self: {}, metrics: { items: [] } },
              },
              initialQueries: [
                {
                  query: { name: 'app.profile.self' },
                  targetPath: '/profile/self',
                  loadingPath: '/profile/loading',
                },
                {
                  query: { name: 'app.profile.metrics' },
                  targetPath: '/profile/metrics',
                },
              ],
              actionMap: {
                refresh: [
                  {
                    query: { name: 'app.profile.self' },
                    targetPath: '/profile/self',
                  },
                ],
              },
            },
            {
              id: 'detail',
              components: [
                { id: 'root', component: 'Column', children: ['back'] },
                {
                  id: 'back',
                  component: 'Button',
                  child: 'back-label',
                  variant: 'secondary',
                  action: { event: { name: 'navigateBack' } },
                },
                { id: 'back-label', component: 'Text', text: 'Back' },
              ],
              initialQueries: [
                {
                  query: {
                    name: 'app.profile.notification',
                    args: { id: { fromPath: '/inputs/id' } },
                  },
                  targetPath: '/notification',
                },
              ],
            },
          ],
        },
      }
      expectZodSuccess(mobileContributionsSchema.safeParse(valid))
    })

    it('accepts queries namespaced under both lombok. and app.', () => {
      const valid = {
        queries: {
          'lombok.viewer': { source: 'lombok', path: '/viewer' },
          'app.workspaces.list': {
            source: 'app',
            worker: 'api_worker',
            path: '/workspaces',
            method: 'GET',
          },
        },
        root: {
          views: [
            navRootView({
              initialQueries: [
                { query: { name: 'lombok.viewer' }, targetPath: '/viewer' },
                {
                  query: { name: 'app.workspaces.list' },
                  targetPath: '/workspaces',
                },
              ],
            }),
          ],
        },
      }
      expectZodSuccess(mobileContributionsSchema.safeParse(valid))
    })

    it('accepts a query key without a lombok./app. namespace prefix', () => {
      const valid = {
        queries: {
          'profile.self': { source: 'lombok', path: '/profile/self' },
        },
        root: root(),
      }
      expectZodSuccess(mobileContributionsSchema.safeParse(valid))
    })

    it('should reject an app source query that does not declare a worker', () => {
      const invalid = {
        queries: {
          'app.workspaces.list': { source: 'app', path: '/workspaces' },
        },
        root: root(),
      }
      expectZodFailure(mobileContributionsSchema.safeParse(invalid))
    })

    it('should reject a lombok source query that declares a worker', () => {
      const invalid = {
        queries: {
          'lombok.viewer': {
            source: 'lombok',
            worker: 'api_worker',
            path: '/viewer',
          },
        },
        root: root(),
      }
      expectZodFailure(mobileContributionsSchema.safeParse(invalid))
    })

    it('should reject a query definition whose path is not an absolute path', () => {
      const invalid = {
        queries: {
          'app.workspaces.list': {
            source: 'app',
            worker: 'api_worker',
            path: 'workspaces',
          },
        },
        root: root(),
      }
      expectZodFailure(mobileContributionsSchema.safeParse(invalid))
    })

    it('accepts a query with a transform exercising every operator', () => {
      const valid = {
        queries: {
          'app.workspaces.list': {
            source: 'app',
            worker: 'api_worker',
            path: '/workspaces',
            transform: {
              items: {
                $map: '/data/items',
                to: {
                  id: { $ref: 'id' },
                  label: {
                    $if: { $exists: 'name' },
                    then: { $ref: 'name' },
                    else: 'untitled',
                  },
                  active: {
                    $cond: [
                      {
                        if: {
                          $and: [
                            { $eq: [{ $ref: 'state' }, 'open'] },
                            { $not: { $exists: 'archivedAt' } },
                          ],
                        },
                        then: true,
                      },
                    ],
                    else: false,
                  },
                  kind: { $call: 'lower', args: { value: { $ref: 'kind' } } },
                  flagged: {
                    $if: {
                      $or: [
                        { $in: [{ $ref: 'status' }, ['a', 'b', 'c']] },
                        { $exists: 'pinned' },
                      ],
                    },
                    then: true,
                    else: false,
                  },
                },
              },
            },
          },
        },
        root: root(),
      }
      expectZodSuccess(mobileContributionsSchema.safeParse(valid))
    })

    it('accepts an empty path as the current scope ($map "" over a root array)', () => {
      const valid = {
        queries: {
          'app.workspaces.list': {
            source: 'app',
            worker: 'api_worker',
            path: '/workspaces',
            transform: {
              items: {
                $map: '',
                to: { id: { $ref: 'id' }, self: { $ref: '' } },
              },
            },
          },
        },
        root: root(),
      }
      expectZodSuccess(mobileContributionsSchema.safeParse(valid))
    })

    it('should reject a transform plain object with a $-prefixed non-operator key', () => {
      const invalid = {
        queries: {
          'lombok.viewer': {
            source: 'lombok',
            path: '/viewer',
            transform: { $bogus: 'x' },
          },
        },
        root: root(),
      }
      expectZodFailure(mobileContributionsSchema.safeParse(invalid))
    })

    it('should reject a transform operator node with an unknown companion key', () => {
      const invalid = {
        queries: {
          'lombok.viewer': {
            source: 'lombok',
            path: '/viewer',
            transform: { $ref: '/a', extra: 'nope' },
          },
        },
        root: root(),
      }
      expectZodFailure(mobileContributionsSchema.safeParse(invalid))
    })

    it('should reject an empty $cond clause list', () => {
      const invalid = {
        queries: {
          'lombok.viewer': {
            source: 'lombok',
            path: '/viewer',
            transform: { $cond: [], else: 'fallback' },
          },
        },
        root: root(),
      }
      expectZodFailure(mobileContributionsSchema.safeParse(invalid))
    })

    it('should reject a binding that references an undeclared query', () => {
      const invalid = {
        queries: {
          'app.workspaces.list': {
            source: 'app',
            worker: 'api_worker',
            path: '/workspaces',
          },
        },
        root: {
          views: [
            navRootView({
              initialQueries: [
                {
                  query: { name: 'app.workspaces.missing' },
                  targetPath: '/workspaces',
                },
              ],
            }),
          ],
        },
      }
      const result = mobileContributionsSchema.safeParse(invalid)
      expectZodFailure(result)
      if (!result.success) {
        const issue = result.error.issues.find((i) =>
          i.message.includes('Unknown query "app.workspaces.missing"'),
        )
        expect(issue).toBeDefined()
      }
    })

    it('should reject an actionMap binding that references an undeclared query', () => {
      const invalid = {
        queries: {
          'app.workspaces.list': {
            source: 'app',
            worker: 'api_worker',
            path: '/workspaces',
          },
        },
        root: {
          views: [
            navRootView({
              actionMap: {
                refresh: [
                  { query: { name: 'app.nope' }, targetPath: '/workspaces' },
                ],
              },
            }),
          ],
        },
      }
      expectZodFailure(mobileContributionsSchema.safeParse(invalid))
    })

    it('accepts an unknown component tag with freeform properties', () => {
      const valid = {
        root: {
          views: [
            navRootView({
              components: [
                { id: 'root', component: 'Column', children: ['w'] },
                {
                  id: 'w',
                  component: 'CustomWidget',
                  anything: { nested: [1, 2, 3] },
                  flag: true,
                },
              ],
            }),
          ],
        },
      }
      expectZodSuccess(mobileContributionsSchema.safeParse(valid))
    })

    it('should reject unknown fields on a view', () => {
      const invalid = { root: { views: [navRootView({ extra: 'nope' })] } }
      expectZodFailure(mobileContributionsSchema.safeParse(invalid as unknown))
    })

    it('should reject an empty views array', () => {
      const invalid = { root: { views: [] } }
      expectZodFailure(mobileContributionsSchema.safeParse(invalid))
    })

    it('should reject an empty components array', () => {
      const invalid = {
        root: { views: [navRootView({ components: [] })] },
      }
      expectZodFailure(mobileContributionsSchema.safeParse(invalid))
    })

    it('should reject a view without a root component', () => {
      const invalid = {
        root: {
          views: [
            navRootView({
              components: [{ id: 'main', component: 'Text', text: 'hi' }],
            }),
          ],
        },
      }
      expectZodFailure(mobileContributionsSchema.safeParse(invalid))
    })

    it('should reject a dangling children reference', () => {
      const invalid = {
        root: {
          views: [
            navRootView({
              components: [
                { id: 'root', component: 'Column', children: ['missing'] },
              ],
            }),
          ],
        },
      }
      expectZodFailure(mobileContributionsSchema.safeParse(invalid))
    })

    it('should reject a dangling list template componentId', () => {
      const invalid = {
        root: {
          views: [
            navRootView({
              components: [
                {
                  id: 'root',
                  component: 'List',
                  children: { componentId: 'missing', path: '/items' },
                  direction: 'vertical',
                },
              ],
            }),
          ],
        },
      }
      expectZodFailure(mobileContributionsSchema.safeParse(invalid))
    })

    it('should reject a dangling button child reference', () => {
      const invalid = {
        root: {
          views: [
            navRootView({
              components: [
                { id: 'root', component: 'Column', children: ['btn'] },
                {
                  id: 'btn',
                  component: 'Button',
                  child: 'missing',
                  variant: 'primary',
                  action: { event: { name: 'tap' } },
                },
              ],
            }),
          ],
        },
      }
      expectZodFailure(mobileContributionsSchema.safeParse(invalid))
    })

    it('should reject duplicate component ids within a view', () => {
      const invalid = {
        root: {
          views: [
            navRootView({
              components: [
                { id: 'root', component: 'Column', children: ['title'] },
                { id: 'title', component: 'Text', text: 'A' },
                { id: 'title', component: 'Text', text: 'B' },
              ],
            }),
          ],
        },
      }
      expectZodFailure(mobileContributionsSchema.safeParse(invalid))
    })

    it('should reject duplicate view ids within the root', () => {
      const invalid = {
        root: {
          views: [
            navRootView({ id: 'dup' }),
            {
              id: 'dup',
              components: [{ id: 'root', component: 'Text', text: 'x' }],
            },
          ],
        },
      }
      expectZodFailure(mobileContributionsSchema.safeParse(invalid))
    })

    it('should reject a navigate action targeting an unknown view', () => {
      const invalid = {
        root: {
          views: [
            navRootView({
              components: [
                { id: 'root', component: 'Column', children: ['btn'] },
                {
                  id: 'btn',
                  component: 'Button',
                  child: 'lbl',
                  variant: 'primary',
                  action: {
                    event: { name: 'navigate', context: { target: 'nope' } },
                  },
                },
                { id: 'lbl', component: 'Text', text: 'x' },
              ],
            }),
          ],
        },
      }
      expectZodFailure(mobileContributionsSchema.safeParse(invalid))
    })

    it('should reject accessibility with neither label nor description', () => {
      const invalid = {
        root: {
          views: [
            navRootView({
              components: [
                { id: 'root', component: 'Column', children: ['title'] },
                {
                  id: 'title',
                  component: 'Text',
                  text: 'Hello',
                  accessibility: {},
                },
              ],
            }),
          ],
        },
      }
      expectZodFailure(mobileContributionsSchema.safeParse(invalid))
    })

    it('accepts a rich root with queries, data model, and actions', () => {
      const valid = {
        queries: {
          'app.workspaces.list': {
            source: 'app',
            worker: 'api_worker',
            path: '/workspaces',
          },
        },
        root: {
          views: [
            navRootView({
              initialDataModel: { workspaces: { items: [] } },
              initialQueries: [
                {
                  query: { name: 'app.workspaces.list' },
                  targetPath: '/workspaces',
                },
              ],
              actionMap: {
                refresh: [
                  {
                    query: { name: 'app.workspaces.list' },
                    targetPath: '/workspaces',
                  },
                ],
              },
            }),
          ],
        },
      }
      expectZodSuccess(mobileContributionsSchema.safeParse(valid))
    })

    it('omits root entirely (optional)', () => {
      expectZodSuccess(mobileContributionsSchema.safeParse({}))
    })

    it('accepts a nav-root view plus drill-down views', () => {
      const valid = {
        root: {
          views: [
            navRootView({
              components: [
                { id: 'root', component: 'Column', children: ['go'] },
                {
                  id: 'go',
                  component: 'Button',
                  child: 'go-label',
                  variant: 'primary',
                  action: {
                    event: { name: 'navigate', context: { target: 'detail' } },
                  },
                },
                { id: 'go-label', component: 'Text', text: 'Open' },
              ],
            }),
            {
              id: 'detail',
              components: [{ id: 'root', component: 'Text', text: 'Detail' }],
            },
          ],
        },
      }
      expectZodSuccess(mobileContributionsSchema.safeParse(valid))
    })

    it('rejects a root with no nav-root view', () => {
      const invalid = { root: { views: [navRootView({ navRoot: false })] } }
      const result = mobileContributionsSchema.safeParse(invalid)
      expectZodFailure(result)
      if (!result.success) {
        const issue = result.error.issues.find((i) =>
          i.message.includes('Exactly one mobile root view must be flagged'),
        )
        expect(issue).toBeDefined()
      }
    })

    it('rejects a root with more than one nav-root view', () => {
      const invalid = {
        root: { views: [navRootView({ id: 'a' }), navRootView({ id: 'b' })] },
      }
      const result = mobileContributionsSchema.safeParse(invalid)
      expectZodFailure(result)
      if (!result.success) {
        const issue = result.error.issues.find((i) =>
          i.message.includes('Only one mobile root view may be flagged'),
        )
        expect(issue).toBeDefined()
      }
    })

    it('rejects an unknown query referenced by a root binding', () => {
      const invalid = {
        root: {
          views: [
            navRootView({
              initialQueries: [
                { query: { name: 'app.nope' }, targetPath: '/x' },
              ],
            }),
          ],
        },
      }
      expectZodFailure(mobileContributionsSchema.safeParse(invalid))
    })

    it('rejects unknown fields on root', () => {
      const invalid = { root: { views: [navRootView()], extra: 'nope' } }
      expectZodFailure(mobileContributionsSchema.safeParse(invalid as unknown))
    })

    it('accepts a refreshable flag on a root view', () => {
      const valid = { root: { views: [navRootView({ refreshable: true })] } }
      expectZodSuccess(mobileContributionsSchema.safeParse(valid))
    })

    it('omits refreshable on a view (optional)', () => {
      expectZodSuccess(mobileContributionsSchema.safeParse({ root: root() }))
    })

    it('rejects a non-boolean refreshable on a view', () => {
      const invalid = {
        root: { views: [navRootView({ refreshable: 'yes' })] },
      }
      expectZodFailure(mobileContributionsSchema.safeParse(invalid))
    })
  })

  describe('appConfigSchema mobile query worker validation', () => {
    const appWithMobileQueryWorker = (worker: string) => ({
      slug: 'testapp',
      label: 'Test App',
      description: 'A test application',
      icon: validIcon,
      ui: { enabled: true },
      runtimeWorkers: {
        api_worker: {
          entrypoint: 'api-worker.js',
          description: 'API worker',
        },
      },
      contributions: {
        sidebarMenuLinks: [],
        folderSidebarViews: [],
        objectSidebarViews: [],
        objectDetailViews: [],
        folderDetailViews: [],
        mobile: {
          queries: {
            'app.workspaces.list': {
              source: 'app',
              worker,
              path: '/workspaces',
            },
          },
          root: {
            views: [
              {
                id: 'home',
                navRoot: true,
                components: [
                  { id: 'root', component: 'Column', children: ['title'] },
                  { id: 'title', component: 'Text', text: 'Hello' },
                ],
                initialQueries: [
                  {
                    query: { name: 'app.workspaces.list' },
                    targetPath: '/workspaces',
                  },
                ],
              },
            ],
          },
        },
      },
    })

    it('accepts an app.* query whose worker exists in runtimeWorkers', () => {
      const result = appConfigSchema.safeParse(
        appWithMobileQueryWorker('api_worker'),
      )
      expectZodSuccess(result)
    })

    it('rejects an app.* query whose worker is not a declared runtime worker', () => {
      const result = appConfigSchema.safeParse(
        appWithMobileQueryWorker('missing_worker'),
      )
      expectZodFailure(result)
      if (!result.success) {
        const issue = result.error.issues.find((i) =>
          i.message.includes(
            'Unknown worker "missing_worker" in mobile query "app.workspaces.list"',
          ),
        )
        expect(issue).toBeDefined()
      }
    })
  })

  describe('containerProfileResourceHintsSchema', () => {
    it('should validate resource hints with positive numbers', () => {
      const result = containerProfileResourceHintsSchema.safeParse({
        gpu: true,
        memoryMB: 1024,
        cpuCores: 2,
      })
      expectZodSuccess(result)
    })

    it('should reject negative numeric resource hints', () => {
      const result = containerProfileResourceHintsSchema.safeParse({
        memoryMB: -1,
        cpuCores: -2,
      })
      expectZodFailure(result)
    })
  })

  describe('dockerWorkerConfigSchema', () => {
    it('should validate an exec docker worker config', () => {
      const result = dockerWorkerConfigSchema.safeParse({
        kind: 'exec',
        command: ['run'],
        jobIdentifier: 'job',
      })
      expectZodSuccess(result)
    })

    it('should validate an http docker worker config', () => {
      const result = dockerWorkerConfigSchema.safeParse({
        kind: 'http',
        command: ['serve'],
        port: 8080,
        jobs: [
          {
            identifier: 'job',
          },
        ],
      })
      expectZodSuccess(result)
    })
  })

  describe('containerProfileConfigSchema', () => {
    it('should validate a container profile with workers', () => {
      const result = containerProfileConfigSchema.safeParse({
        image: 'example-image',
        resources: {
          memoryMB: 512,
        },
        workers: [
          {
            kind: 'exec',
            command: ['run'],
            jobIdentifier: 'job',
          },
        ],
      })
      expectZodSuccess(result)
    })
  })

  describe('appConfigSchema systemRequestRuntimeWorkers validation', () => {
    it('should validate when performSearch references an existing runtime worker', () => {
      const validApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        icon: validIcon,
        runtimeWorkers: {
          search_worker: {
            entrypoint: 'search.js',
            description: 'Search worker',
          },
        },
        systemRequestRuntimeWorkers: {
          performSearch: ['search_worker'],
        },
      }
      const result = appConfigSchema.safeParse(validApp)
      expectZodSuccess(result)
    })

    it('should reject when performSearch references a non-existent runtime worker', () => {
      const invalidApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        icon: validIcon,
        runtimeWorkers: {
          other_worker: {
            entrypoint: 'other.js',
            description: 'Other worker',
          },
        },
        systemRequestRuntimeWorkers: {
          performSearch: ['missing_worker'],
        },
      }
      const result = appConfigSchema.safeParse(invalidApp)
      expectZodFailure(result)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain(
          'Unknown worker "missing_worker"',
        )
        expect(result.error.issues[0]?.message).toContain(
          'systemRequestRuntimeWorkers.performSearch',
        )
        expect(result.error.issues[0]?.path).toEqual([
          'systemRequestRuntimeWorkers',
          'performSearch',
          0,
        ])
      }
    })

    it('should reject when performSearch references a worker but runtimeWorkers is empty', () => {
      const invalidApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        icon: validIcon,
        systemRequestRuntimeWorkers: {
          performSearch: ['any_worker'],
        },
      }
      const result = appConfigSchema.safeParse(invalidApp)
      expectZodFailure(result)
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain('(none)')
      }
    })

    it('should validate when systemRequestRuntimeWorkers is undefined', () => {
      const validApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        icon: validIcon,
        runtimeWorkers: {
          search_worker: {
            entrypoint: 'search.js',
            description: 'Search worker',
          },
        },
      }
      const result = appConfigSchema.safeParse(validApp)
      expectZodSuccess(result)
    })

    it('should validate when performSearch is undefined within systemRequestRuntimeWorkers', () => {
      const validApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        icon: validIcon,
        runtimeWorkers: {
          search_worker: {
            entrypoint: 'search.js',
            description: 'Search worker',
          },
        },
        systemRequestRuntimeWorkers: {},
      }
      const result = appConfigSchema.safeParse(validApp)
      expectZodSuccess(result)
    })

    it('should reject when systemRequestRuntimeWorkers.performSearch is null', () => {
      const invalidApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        runtimeWorkers: {
          search_worker: {
            entrypoint: 'search.js',
            description: 'Search worker',
          },
        },
        systemRequestRuntimeWorkers: {
          performSearch: null,
        },
      }
      const result = appConfigSchema.safeParse(invalidApp)
      expectZodFailure(result)
    })

    it('should reject when systemRequestRuntimeWorkers contains an invalid key', () => {
      const invalidApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        runtimeWorkers: {
          search_worker: {
            entrypoint: 'search.js',
            description: 'Search worker',
          },
        },
        systemRequestRuntimeWorkers: {
          invalidKey: 'search_worker',
        },
      }
      const result = appConfigSchema.safeParse(invalidApp)
      expectZodFailure(result)
      if (!result.success) {
        const invalidKeyIssue = result.error.issues.find(
          (issue) =>
            issue.path.includes('systemRequestRuntimeWorkers') ||
            issue.message.toLowerCase().includes('invalidkey') ||
            issue.message.toLowerCase().includes('unrecognized'),
        )
        expect(invalidKeyIssue).toBeDefined()
        if (invalidKeyIssue) {
          expect(invalidKeyIssue.path).toContain('systemRequestRuntimeWorkers')
        }
      }
    })

    it('should reject when systemRequestRuntimeWorkers contains multiple invalid keys', () => {
      const invalidApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        runtimeWorkers: {
          search_worker: {
            entrypoint: 'search.js',
            description: 'Search worker',
          },
        },
        systemRequestRuntimeWorkers: {
          performIndex: ['search_worker'],
          performUpdate: ['search_worker'],
        },
      }
      const result = appConfigSchema.safeParse(invalidApp)
      expectZodFailure(result)
      if (!result.success) {
        // Should have an issue for the invalid keys (Zod strict mode may report one issue for the object)
        const invalidKeyIssues = result.error.issues.filter(
          (issue) =>
            issue.path.includes('systemRequestRuntimeWorkers') ||
            issue.message.toLowerCase().includes('unrecognized'),
        )
        expect(invalidKeyIssues.length).toBeGreaterThanOrEqual(1)
        // Check that the error message or path indicates the problem is with systemRequestRuntimeWorkers
        const hasSystemRequestIssue = invalidKeyIssues.some(
          (issue) =>
            issue.path.includes('systemRequestRuntimeWorkers') ||
            issue.message.toLowerCase().includes('systemrequestruntimeworkers'),
        )
        expect(hasSystemRequestIssue).toBe(true)
      }
    })

    it('should reject when systemRequestRuntimeWorkers contains both valid and invalid keys', () => {
      const invalidApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        runtimeWorkers: {
          search_worker: {
            entrypoint: 'search.js',
            description: 'Search worker',
          },
        },
        systemRequestRuntimeWorkers: {
          performSearch: ['search_worker'],
          invalidKey: 'search_worker',
        },
      }
      const result = appConfigSchema.safeParse(invalidApp)
      expectZodFailure(result)
      if (!result.success) {
        // Should have an issue for the invalid key (Zod strict mode rejects the object)
        const invalidKeyIssue = result.error.issues.find(
          (issue) =>
            issue.path.includes('systemRequestRuntimeWorkers') ||
            issue.message.toLowerCase().includes('invalidkey') ||
            issue.message.toLowerCase().includes('unrecognized'),
        )
        expect(invalidKeyIssue).toBeDefined()
        if (invalidKeyIssue) {
          expect(invalidKeyIssue.path).toContain('systemRequestRuntimeWorkers')
        }
      }
    })
  })

  describe('appConfigSchema container profile and docker handlers', () => {
    it('should validate when docker handler references existing container job', () => {
      const validApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        icon: validIcon,
        containerProfiles: {
          default: {
            image: 'example-image',
            workers: [
              {
                kind: 'exec',
                command: ['run'],
                jobIdentifier: 'job',
              },
            ],
          },
        },
        tasks: [
          {
            identifier: 'task',
            label: 'Task 1',
            description: 'First task',
            handler: {
              type: 'docker',
              identifier: 'default:job',
            },
          },
        ],
      }

      const result = appConfigSchema.safeParse(validApp)
      expectZodSuccess(result)
    })

    it('should reject when docker handler profile does not exist', () => {
      const invalidApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        icon: validIcon,
        tasks: [
          {
            identifier: 'task',
            label: 'Task 1',
            description: 'First task',
            handler: {
              type: 'docker',
              identifier: 'missing:job',
            },
          },
        ],
      }

      const result = appConfigSchema.safeParse(invalidApp)
      expect(result.error?.issues).toEqual([
        {
          code: 'custom',
          message:
            'Unknown container profile "missing". Must be one of: (none)',
          path: ['tasks', 0, 'worker'],
        },
      ])
      expectZodFailure(result)
    })

    it('should reject when docker handler job name does not exist in profile', () => {
      const invalidApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        containerProfiles: {
          default: {
            image: 'example-image',
            workers: {
              worker: [
                {
                  kind: 'exec',
                  command: ['run'],
                  jobIdentifier: 'existing',
                },
              ],
            },
          },
        },
        tasks: [
          {
            identifier: 'task',
            label: 'Task 1',
            description: 'First task',
            triggers: ['test.event'],
            handler: {
              type: 'docker',
              identifier: 'default:missing',
            },
          },
        ],
      }

      const result = appConfigSchema.safeParse(invalidApp)
      expectZodFailure(result)
    })
  })

  describe('appConfigSchema permissions and options', () => {
    it('should validate app config with permissions, storage, ui and database', () => {
      const validApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        icon: validIcon,
        requiresStorage: true,
        permissions: {
          core: ['READ_FOLDER_ACL'],
          user: ['CREATE_FOLDERS', 'READ_USER'],
          folder: ['READ_OBJECTS', 'REINDEX_FOLDER'],
        },
        ui: {
          enabled: true,
          csp: "default-src 'self'",
        },
        database: {
          enabled: true,
        },
      }

      const result = appConfigSchema.safeParse(validApp)
      expectZodSuccess(result)
    })
  })

  describe('appConfigSchema should fail validation with extra keys', () => {
    it('should validate app config with invalid permissions (platform scope is deprecated)', () => {
      const validApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        requiresStorage: true,
        permissions: {
          platform: ['READ_FOLDER_ACL'], // platform scope is deprecated, so it should fail
          user: ['CREATE_FOLDERS', 'READ_USER'],
          folder: ['READ_OBJECTS', 'REINDEX_FOLDER'],
        },
        ui: {
          enabled: true,
          csp: "default-src 'self'",
        },
        database: {
          enabled: true,
        },
      }

      const result = appConfigSchema.safeParse(validApp)
      expectZodFailure(result)
    })

    it('should reject app config with extra keys in ui object', () => {
      const invalidApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        ui: {
          enabled: true,
          csp: "default-src 'self'",
          extraKey: 'should be rejected', // extra key should cause validation to fail
        },
      }

      const result = appConfigSchema.safeParse(invalidApp)
      expectZodFailure(result)
    })

    it('should reject app config with extra keys in database object', () => {
      const invalidApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        database: {
          enabled: true,
          extraKey: 'should be rejected', // extra key should cause validation to fail
        },
      }

      const result = appConfigSchema.safeParse(invalidApp)
      expectZodFailure(result)
    })

    it('should reject app config with extra keys at top level', () => {
      const invalidApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        extraTopLevelKey: 'should be rejected', // extra key should cause validation to fail
      }

      const result = appConfigSchema.safeParse(invalidApp)
      expectZodFailure(result)
    })
  })

  describe('appConfigSchema duplicate container job detection', () => {
    it('should reject duplicate job names within a single container profile', () => {
      const invalidApp: AppConfig = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        icon: validIcon,
        containerProfiles: {
          default: {
            image: 'example-image',
            workers: [
              {
                kind: 'exec',
                command: ['run'],
                jobIdentifier: 'job',
              },
              {
                kind: 'exec',
                command: ['run'],
                jobIdentifier: 'job',
              },
            ],
          },
        },
      }

      const result = appConfigSchema.safeParse(invalidApp)
      expectZodFailure(result)
    })
  })

  describe('platform, user and folder scope permissions schemas', () => {
    it('should validate core scope permissions', () => {
      const result = coreScopeAppPermissionsSchema.safeParse('READ_FOLDER_ACL')
      expectZodSuccess(result)
    })

    it('should validate user scope permissions', () => {
      const result = userScopeAppPermissionsSchema.safeParse('CREATE_FOLDERS')
      expectZodSuccess(result)
    })

    it('should validate folder scope permissions', () => {
      const result = folderScopeAppPermissionsSchema.safeParse('READ_OBJECTS')
      expectZodSuccess(result)
    })
  })

  describe('appWorkerSchema and related schemas', () => {
    it('should validate app worker definition', () => {
      const result = appRuntimeWorkerSchema.safeParse({
        label: 'Test Worker',
        description: 'Test worker',
        environmentVariables: {
          SOME_ENV_VAR: 'value',
        },
        entrypoint: 'worker.js',
      })
      expectZodSuccess(result)
    })

    it('should reject app worker definition with missing env vars', () => {
      const result = appRuntimeWorkerSchema.safeParse({
        description: 'Test worker',
        entrypoint: 'worker.js',
      })
      expectZodFailure(result)
    })

    it('should validate app workers bundle schema', () => {
      const result = appRuntimeWorkersBundleSchema.safeParse({
        hash: 'bundlehash',
        size: 1234,
        manifest: {
          'worker.js': {
            hash: 'hash',
            size: 10,
            mimeType: 'application/javascript',
          },
        },
        definitions: {
          worker: {
            label: 'Test Worker',
            description: 'Test worker',
            environmentVariables: {
              SOME_ENV_VAR: 'value',
            },
            entrypoint: 'worker.js',
          },
        },
      })
      expectZodSuccess(result)
    })

    it('should validate app UI bundle schema', () => {
      const result = appUiBundleSchema.safeParse({
        hash: 'uibundle',
        size: 1234,
        csp: "default-src 'self'",
        manifest: {
          'index.js': {
            hash: 'hash',
            size: 10,
            mimeType: 'application/javascript',
          },
        },
      })
      expectZodSuccess(result)
    })

    it('should validate app workers map schema', () => {
      const result = appRuntimeWorkersMapSchema.safeParse({
        worker: {
          label: 'Test Worker',
          description: 'Test worker',
          environmentVariables: {
            SOME_ENV_VAR: 'value',
          },
          entrypoint: 'worker.js',
        },
      })
      expectZodSuccess(result)
    })

    it('should validate app worker script identifier schema', () => {
      const result =
        appRuntimeWorkerScriptIdentifierSchema.safeParse('worker_id')
      expectZodSuccess(result)
    })
  })

  describe('appMetricsSchema', () => {
    it('should validate app metrics', () => {
      const result = appMetricsSchema.safeParse({
        tasksExecutedLast24Hours: {
          completed: 10,
          failed: 2,
        },
        errorsLast24Hours: {
          total: 3,
          last10Minutes: 1,
        },
        eventsEmittedLast24Hours: {
          total: 20,
          last10Minutes: 5,
        },
      })
      expectZodSuccess(result)
    })
  })

  describe('httpJobDefinitionSchema', () => {
    it('should validate job definition', () => {
      const result = httpJobDefinitionSchema.safeParse({
        identifier: 'job',
      })
      expectZodSuccess(result)
    })
  })

  describe('execJobDefinitionSchema', () => {
    it('should validate job definition', () => {
      const result = execJobDefinitionSchema.safeParse({
        kind: 'exec',
        command: ['run'],
        jobIdentifier: 'job',
      })
      expectZodSuccess(result)
    })
  })

  describe('appSocketMessageSchema', () => {
    it('should validate a socket message with optional data', () => {
      const result = appSocketMessageSchema.safeParse({
        name: 'MINT_APP_USER_TOKEN',
        data: {
          userId: '00000000-0000-0000-0000-000000000000',
        },
      })
      expectZodSuccess(result)
    })

    it('should reject a socket message with invalid name', () => {
      const result = appSocketMessageSchema.safeParse({
        name: 'INVALID',
      })
      expectZodFailure(result)
    })
  })

  describe('should validate app config (complex)', () => {
    it('should validate an exec docker worker config', () => {
      const result = appConfigSchema.safeParse({
        description: 'The official Lombok AI app',
        slug: 'ai',
        label: 'Lombok AI',
        icon: validIcon,
        requiresStorage: true,
        subscribedCoreEvents: ['core:object_added'],
        runtimeWorkers: {
          api_worker: {
            entrypoint: 'api-worker-entrypoint.js',
            description: 'The API worker.',
            environmentVariables: {
              LLAMACPP_BASE_URL: 'https://llamacpp.phonk.tv/v1',
              LLAMACPP_API_KEY: '8b90bf27-5fb4-44c6-ad1f-5ca8401a0cc3',
            },
          },
          search_worker: {
            entrypoint: 'handle-search/index.js',
            description: 'The search request worker.',
          },
          trigger_extract_content_metadata_worker: {
            entrypoint: 'extract-content-metadata/index.js',
            description:
              'The worker that triggers the extract content metadata job.',
          },
        },
        tasks: [
          {
            identifier: 'trigger_extract_content_metadata',
            label: 'Trigger Extract Content Metadata',
            description:
              'A task that runs for every newly added object and triggers the job to extract metadata and generate embeddings.',
            handler: {
              type: 'runtime',
              identifier: 'trigger_extract_content_metadata_worker',
            },
          },
          {
            identifier: 'extract_content_metadata',
            label: 'Extract Content Metadata',
            description:
              'A docker based task that does deep metadata extraction and generation of embeddings on content.',
            handler: {
              type: 'docker',
              identifier: 'content_indexing:generate_content_embeddings',
            },
          },
        ],
        triggers: [
          {
            kind: 'event',
            eventIdentifier: CoreObjectAddedEventTriggerIdentifier,
            taskIdentifier: 'trigger_extract_content_metadata',
          },
        ],
        ui: {
          enabled: true,
        },
        contributions: {
          sidebarMenuLinks: [
            {
              label: 'Chat',
              icon: {
                source: 'custom',
                format: 'png',
                rendering: 'original',
                assets: [{ path: 'assets/logo.png', scale: 2 }],
              },
              path: '/chat/new',
            },
          ],
          folderSidebarViews: [],
          objectSidebarViews: [],
          objectDetailViews: [],
          folderDetailViews: [],
        },
        permissions: {
          core: ['READ_FOLDER_ACL'],
          folder: [
            'READ_OBJECTS',
            'WRITE_OBJECTS',
            'WRITE_OBJECTS_METADATA',
            'WRITE_FOLDER_METADATA',
          ],
          user: ['READ_USER'],
        },
        containerProfiles: {
          content_indexing: {
            image: 'docker.phonk.tv/lombok-ai-search-worker',
            workers: [
              {
                kind: 'exec',
                jobIdentifier: 'hello_world',
                command: ['echo', '{ "message": "Hello, world!" }'],
              },
              {
                kind: 'http',
                command: ['./start_worker.sh', '8080'],
                port: 8080,
                jobs: [
                  {
                    identifier: 'generate_content_embeddings',
                  },
                  {
                    identifier: 'generate_text_embedding',
                  },
                  {
                    identifier: 'rerank_search_results',
                  },
                ],
              },
            ],
            resources: {
              gpu: true,
            },
          },
        },
      })
      expectZodSuccess(result)
    })
  })

  describe('iconSchema', () => {
    it('validates a builtin icon', () => {
      const result = iconSchema.safeParse({
        source: 'builtin',
        name: 'app',
      })
      expectZodSuccess(result)
    })

    it('rejects a builtin icon with an unknown name', () => {
      const result = iconSchema.safeParse({
        source: 'builtin',
        name: 'made_up_name',
      })
      expectZodFailure(result)
    })

    it('rejects a builtin icon that carries a rendering field', () => {
      const result = iconSchema.safeParse({
        source: 'builtin',
        name: 'app',
        rendering: 'template',
      })
      expectZodFailure(result)
    })

    it('validates a custom SVG with a single any-appearance asset', () => {
      const result = iconSchema.safeParse({
        source: 'custom',
        format: 'svg',
        rendering: 'original',
        assets: [{ path: 'icons/logo.svg' }],
      })
      expectZodSuccess(result)
    })

    it('validates a custom SVG with separate light + dark variants', () => {
      const result = iconSchema.safeParse({
        source: 'custom',
        format: 'svg',
        rendering: 'original',
        assets: [
          { path: 'icons/logo-light.svg', appearance: 'light' },
          { path: 'icons/logo-dark.svg', appearance: 'dark' },
        ],
      })
      expectZodSuccess(result)
    })

    it('rejects a custom SVG that mixes "any" with light/dark', () => {
      const result = iconSchema.safeParse({
        source: 'custom',
        format: 'svg',
        rendering: 'original',
        assets: [
          { path: 'icons/logo.svg' },
          { path: 'icons/logo-light.svg', appearance: 'light' },
        ],
      })
      expectZodFailure(result)
    })

    it('rejects a PNG icon with template rendering (V1 ban)', () => {
      const result = iconSchema.safeParse({
        source: 'custom',
        format: 'png',
        rendering: 'template',
        assets: [{ path: 'icons/logo.png', scale: 2 }],
      })
      expectZodFailure(result)
    })

    it('rejects a PNG icon that only ships a 1x asset', () => {
      const result = iconSchema.safeParse({
        source: 'custom',
        format: 'png',
        rendering: 'original',
        assets: [{ path: 'icons/logo.png', scale: 1 }],
      })
      expectZodFailure(result)
    })

    it('rejects a PNG icon with duplicate (appearance, scale) pairs', () => {
      const result = iconSchema.safeParse({
        source: 'custom',
        format: 'png',
        rendering: 'original',
        assets: [
          { path: 'a.png', scale: 2, appearance: 'light' },
          { path: 'b.png', scale: 2, appearance: 'light' },
        ],
      })
      expectZodFailure(result)
    })

    it('accepts a PNG icon with multiple scale variants and no appearance', () => {
      const result = iconSchema.safeParse({
        source: 'custom',
        format: 'png',
        rendering: 'original',
        assets: [
          { path: 'assets/icon@1x.png', scale: 1 },
          { path: 'assets/icon@2x.png', scale: 2 },
          { path: 'assets/icon@3x.png', scale: 3 },
        ],
      })
      expectZodSuccess(result)
    })

    it('accepts a PNG icon with multiple scales per light/dark appearance', () => {
      const result = iconSchema.safeParse({
        source: 'custom',
        format: 'png',
        rendering: 'original',
        assets: [
          { path: 'assets/light@1x.png', scale: 1, appearance: 'light' },
          { path: 'assets/light@2x.png', scale: 2, appearance: 'light' },
          { path: 'assets/dark@1x.png', scale: 1, appearance: 'dark' },
          { path: 'assets/dark@2x.png', scale: 2, appearance: 'dark' },
        ],
      })
      expectZodSuccess(result)
    })

    it('rejects a PNG icon mixing "any" with light/dark', () => {
      const result = iconSchema.safeParse({
        source: 'custom',
        format: 'png',
        rendering: 'original',
        assets: [
          { path: 'assets/icon@2x.png', scale: 2 },
          { path: 'assets/light@2x.png', scale: 2, appearance: 'light' },
        ],
      })
      expectZodFailure(result)
    })

    it('rejects custom icons on an app without ui.enabled', () => {
      const result = appConfigSchema.safeParse({
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        icon: {
          source: 'custom',
          format: 'svg',
          rendering: 'original',
          assets: [{ path: 'icons/logo.svg' }],
        },
      })
      expectZodFailure(result)
      if (!result.success) {
        const issue = result.error.issues.find((i) =>
          i.message.includes('Custom icons require `ui.enabled: true`'),
        )
        expect(issue).toBeDefined()
      }
    })

    it('accepts custom icons when ui.enabled is set', () => {
      const result = appConfigSchema.safeParse({
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
        ui: { enabled: true },
        icon: {
          source: 'custom',
          format: 'svg',
          rendering: 'original',
          assets: [{ path: 'icons/logo.svg' }],
        },
      })
      expectZodSuccess(result)
    })
  })
})
