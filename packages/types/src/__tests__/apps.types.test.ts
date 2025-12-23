import { describe, expect, it } from 'bun:test'
import type { SafeParseReturnType } from 'zod'

import {
  appConfigSchema,
  appConfigWithManifestSchema,
  appContributionsSchema,
  appManifestSchema,
  appMetricsSchema,
  appSocketMessageSchema,
  appUiBundleSchema,
  appUIConfigSchema,
  appUILinkSchema,
  appWorkerConfigSchema,
  appWorkersBundleSchema,
  appWorkerSchema,
  appWorkerScriptIdentifierSchema,
  appWorkersMapSchema,
  ConfigParamType,
  containerProfileConfigSchema,
  containerProfileJobDefinitionSchema,
  containerProfileResourceHintsSchema,
  dockerWorkerConfigSchema,
  externalAppWorkerSchema,
  folderScopeAppPermissionsSchema,
  paramConfigSchema,
  platformScopeAppPermissionsSchema,
  taskConfigSchema,
  userScopeAppPermissionsSchema,
  workerEntrypointSchema,
} from '../apps.types'

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

  describe('taskConfigSchema', () => {
    it('should validate complete task config', () => {
      const validTask = {
        identifier: 'test_task',
        label: 'Test Task',
        description: 'A test task',
        triggers: ['test.event'],
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
        triggers: ['test.event'],
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
  })

  describe('appConfigSchema', () => {
    it('should validate complete app config', () => {
      const validApp = {
        identifier: 'testapp',
        label: 'Test App',
        description: 'A test application',
        emittableEvents: ['event1', 'event2'],
        tasks: [
          {
            identifier: 'task',
            label: 'Task 1',
            description: 'First task',
            triggers: ['test.event'],
            handler: {
              type: 'worker',
              identifier: 'script1',
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
      const result = appConfigSchema.safeParse(validApp)
      expectZodSuccess(result)
    })

    it('should validate minimal app config', () => {
      const validApp = {
        identifier: 'testapp',
        label: 'Test App',
        description: 'A test application',
        emittableEvents: ['event'],
      }
      const result = appConfigSchema.safeParse(validApp)
      expectZodSuccess(result)
    })
    it('should validate when worker handler identifier exists in workers', () => {
      const validApp = {
        identifier: 'testapp',
        label: 'Test App',
        description: 'A test application',
        emittableEvents: ['event'],
        tasks: [
          {
            identifier: 'task',
            label: 'Task 1',
            description: 'First task',
            triggers: ['test.event'],
            handler: {
              type: 'worker',
              identifier: 'script1',
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
      const result = appConfigSchema.safeParse(validApp)
      expectZodSuccess(result)
    })

    it('should reject when worker handler identifier does not exist in workers', () => {
      const invalidApp = {
        identifier: 'testapp',
        label: 'Test App',
        description: 'A test application',
        emittableEvents: ['event'],
        tasks: [
          {
            identifier: 'task',
            label: 'Task 1',
            description: 'First task',
            triggers: ['test.event'],
            handler: {
              type: 'worker',
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
        identifier: 'TEST_APP', // uppercase not allowed
        label: 'Test App',
        description: 'A test application',
        emittableEvents: ['event1'],
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

    it("should reject app with 'platform' identifier", () => {
      const invalidApp = {
        identifier: 'platform',
        label: 'Test App',
        description: 'A test application',
        emittableEvents: ['event1'],
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
        identifier: '',
        label: 'Test App',
        description: 'A test application',
        emittableEvents: ['event1'],
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
        identifier: 'testapp',
        label: 'Test App',
        description: 'A test application',
        emittableEvents: ['event1'],
        tasks: [
          {
            identifier: 'task_one',
            label: 'Task 1',
            description: 'First task',
            triggers: ['test.event'],
            handler: {
              type: 'worker',
              identifier: 'script1',
            },
          },
        ],
        workers: {
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
        identifier: 'testapp',
        label: 'Test App',
        description: 'A test application',
        emittableEvents: ['event1'],
        workers: {
          script1: {
            entrypoint: 'nonexistent.js',
            description: 'Test script',
          },
        },
      }

      const result = appConfigWithManifestSchema(manifest).safeParse(invalidApp)
      expectZodFailure(result)
      expect(result.error?.issues[0].message).toContain(
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
        identifier: 'testapp',
        label: 'Test App',
        description: 'A test application',
        emittableEvents: ['event1'],
        tasks: [
          {
            identifier: 'task_one',
            label: 'Task 1',
            description: 'First task',
            triggers: ['test.event'],
            handler: {
              type: 'external',
            },
          },
        ],
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

  describe('externalAppWorkerSchema', () => {
    it('should validate external app worker', () => {
      const validWorker = {
        appIdentifier: 'testapp',
        workerId: 'worker1',
        handledTaskIdentifiers: ['task', 'task'],
        socketClientId: 'client123',
        ip: '192.168.1.1',
      }
      const result = externalAppWorkerSchema.safeParse(validWorker)
      expectZodSuccess(result)
    })

    it('should reject external app worker with missing fields', () => {
      const invalidWorker = {
        appIdentifier: 'testapp',
        // missing other required fields
      }
      const result = externalAppWorkerSchema.safeParse(invalidWorker)
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
        jobName: 'job',
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
            jobName: 'job',
          },
        ],
      })
      expectZodSuccess(result)
    })

    it('should reject docker worker command with invalid tokens', () => {
      const result = dockerWorkerConfigSchema.safeParse({
        kind: 'exec',
        command: ['RUN'], // must be lowercase
        jobName: 'job',
      })
      expectZodFailure(result)
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
            jobName: 'job',
          },
        ],
      })
      expectZodSuccess(result)
    })
  })

  describe('appConfigSchema container profile and docker handlers', () => {
    it('should validate when docker handler references existing container job', () => {
      const validApp = {
        identifier: 'testapp',
        label: 'Test App',
        description: 'A test application',
        emittableEvents: ['event'],
        containerProfiles: {
          default: {
            image: 'example-image',
            workers: [
              {
                kind: 'exec',
                command: ['run'],
                jobName: 'job',
              },
            ],
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
              profile: 'default',
              jobName: 'job',
            },
          },
        ],
      }

      const result = appConfigSchema.safeParse(validApp)
      expectZodSuccess(result)
    })

    it('should reject when docker handler profile does not exist', () => {
      const invalidApp = {
        identifier: 'testapp',
        label: 'Test App',
        description: 'A test application',
        emittableEvents: ['event'],
        tasks: [
          {
            identifier: 'task',
            label: 'Task 1',
            description: 'First task',
            triggers: ['test.event'],
            handler: {
              type: 'docker',
              profile: 'missing',
              jobName: 'job',
            },
          },
        ],
      }

      const result = appConfigSchema.safeParse(invalidApp)
      expectZodFailure(result)
    })

    it('should reject when docker handler job name does not exist in profile', () => {
      const invalidApp = {
        identifier: 'testapp',
        label: 'Test App',
        description: 'A test application',
        emittableEvents: ['event'],
        containerProfiles: {
          default: {
            image: 'example-image',
            workers: {
              worker: [
                {
                  kind: 'exec',
                  command: ['run'],
                  jobName: 'existing',
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
              profile: 'default',
              jobName: 'missing',
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
        identifier: 'testapp',
        label: 'Test App',
        description: 'A test application',
        emittableEvents: ['event'],
        requiresStorage: true,
        permissions: {
          platform: ['READ_ACL'],
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

  describe('appConfigSchema duplicate container job detection', () => {
    it('should reject duplicate job names within a single container profile', () => {
      const invalidApp = {
        identifier: 'testapp',
        label: 'Test App',
        description: 'A test application',
        emittableEvents: ['event'],
        containerProfiles: {
          default: {
            image: 'example-image',
            workers: {
              worker: [
                {
                  kind: 'exec',
                  command: ['run'],
                  jobName: 'job',
                },
                {
                  kind: 'exec',
                  command: ['run'],
                  jobName: 'job',
                },
              ],
            },
          },
        },
      }

      const result = appConfigSchema.safeParse(invalidApp)
      expectZodFailure(result)
    })
  })

  describe('platform, user and folder scope permissions schemas', () => {
    it('should validate platform scope permissions', () => {
      const result = platformScopeAppPermissionsSchema.safeParse('READ_ACL')
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
      const result = appWorkerSchema.safeParse({
        description: 'Test worker',
        environmentVariables: {
          SOME_ENV_VAR: 'value',
        },
        entrypoint: 'worker.js',
      })
      expectZodSuccess(result)
    })

    it('should reject app worker definition with missing env vars', () => {
      const result = appWorkerSchema.safeParse({
        description: 'Test worker',
        entrypoint: 'worker.js',
      })
      expectZodFailure(result)
    })

    it('should validate app workers bundle schema', () => {
      const result = appWorkersBundleSchema.safeParse({
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
      const result = appWorkersMapSchema.safeParse({
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
      const result = appWorkerScriptIdentifierSchema.safeParse('worker_id')
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

  describe('containerProfileJobDefinitionSchema', () => {
    it('should validate job definition', () => {
      const result = containerProfileJobDefinitionSchema.safeParse({
        jobName: 'job',
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
})
