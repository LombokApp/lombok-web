import { describe, expect, it } from 'bun:test'
import { CoreObjectAddedEventTriggerIdentifier } from 'src/events.types'
import type { SafeParseReturnType } from 'zod'

import type { AppConfig } from '../apps.types'
import {
  appConfigSchema,
  appConfigWithManifestSchema,
  appContributionsSchema,
  appManifestSchema,
  appMetricsSchema,
  appRuntimeWorkersBundleSchema,
  appRuntimeWorkerSchema,
  appRuntimeWorkerScriptIdentifierSchema,
  appRuntimeWorkersMapSchema,
  appRuntimeWorkerSocketConnectionSchema,
  appSocketMessageSchema,
  appUiBundleSchema,
  appUIConfigSchema,
  appUILinkSchema,
  appWorkerConfigSchema,
  ConfigParamType,
  containerProfileConfigSchema,
  containerProfileResourceHintsSchema,
  coreScopeAppPermissionsSchema,
  dockerWorkerConfigSchema,
  execJobDefinitionSchema,
  folderScopeAppPermissionsSchema,
  httpJobDefinitionSchema,
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
      }
      const result = appConfigSchema.safeParse(validApp)
      expectZodSuccess(result)
    })
    it('should validate when worker handler identifier exists in workers', () => {
      const validApp = {
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
            name: 'hourly_job',
            config: {
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
            name: 'hourly_job',
            config: {
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
          expect(result.error.issues[0]?.message).toContain('constructor')
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
          expect(result.error.issues[0]?.message).toContain('constructor')
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
      }

      const result = appConfigWithManifestSchema(manifest).safeParse(validApp)
      expectZodSuccess(result)
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
        appIdentifier: 'testapp',
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
        iconPath: '/icons/test.svg',
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
      const result = appWorkerConfigSchema.safeParse(validScriptConfig)
      expectZodSuccess(result)
    })

    it('should validate worker script config without env vars', () => {
      const validScriptConfig = {
        entrypoint: 'worker.js',
        description: 'Test script',
      }
      const result = appWorkerConfigSchema.safeParse(validScriptConfig)
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
        maxPerContainer: 1,
        countTowardsGlobalCap: false,
        priority: 10,
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

  describe('appConfigSchema container profile and docker handlers', () => {
    it('should validate when docker handler references existing container job', () => {
      const validApp = {
        slug: 'testapp',
        label: 'Test App',
        description: 'A test application',
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
        maxPerContainer: 1,
        countTowardsGlobalCap: false,
        priority: 5,
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
        maxPerContainer: 1,
        countTowardsGlobalCap: false,
        priority: 5,
      })
      expectZodSuccess(result)
    })
  })

  describe('appSocketMessageSchema', () => {
    it('should validate a socket message with optional data', () => {
      const result = appSocketMessageSchema.safeParse({
        name: 'AUTHENTICATE_USER',
        data: {
          token: 'token',
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
              iconPath: '/assets/logo.png',
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
                    maxPerContainer: 2,
                  },
                  {
                    identifier: 'generate_text_embedding',
                    maxPerContainer: 2,
                    countTowardsGlobalCap: false,
                  },
                  {
                    identifier: 'rerank_search_results',
                    maxPerContainer: 2,
                    countTowardsGlobalCap: false,
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
})
