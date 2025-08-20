import { describe, expect, it } from 'bun:test'
import type { SafeParseReturnType } from 'zod'

import {
  appConfigSchema,
  appContributionsSchema,
  appManifestSchema,
  appUIConfigSchema,
  appUILinkSchema,
  appWorkerScriptConfigSchema,
  ConfigParamType,
  externalAppWorkerSchema,
  paramConfigSchema,
  taskConfigSchema,
  triggerSchema,
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

  describe('triggerSchema', () => {
    it('should validate event trigger', () => {
      const validTrigger = {
        type: 'event',
        event: 'test.event',
        inputParams: { param1: 'value1' },
      }
      const result = triggerSchema.safeParse(validTrigger)
      expectZodSuccess(result)
    })

    it('should validate object action trigger', () => {
      const validTrigger = {
        type: 'objectAction',
        description: 'Test action',
        inputParams: { param1: 'value1' },
      }
      const result = triggerSchema.safeParse(validTrigger)
      expectZodSuccess(result)
    })

    it('should validate folder action trigger', () => {
      const validTrigger = {
        type: 'folderAction',
        actionLabel: 'Test Action',
        inputParams: { param1: 'value1' },
      }
      const result = triggerSchema.safeParse(validTrigger)
      expectZodSuccess(result)
    })

    it('should reject invalid trigger type', () => {
      const invalidTrigger = {
        type: 'invalid',
        event: 'test.event',
      }
      const result = triggerSchema.safeParse(invalidTrigger)
      expectZodFailure(result)
    })
  })

  describe('taskConfigSchema', () => {
    it('should validate complete task config', () => {
      const validTask = {
        identifier: 'test_task',
        label: 'Test Task',
        description: 'A test task',
        triggers: [
          {
            type: 'event',
            event: 'test.event',
            inputParams: {},
          },
        ],
        inputParams: {
          param1: {
            type: ConfigParamType.string,
            default: 'default',
          },
        },
        worker: 'test-worker',
      }
      const result = taskConfigSchema.safeParse(validTask)
      expectZodSuccess(result)
    })

    it('should validate minimal task config', () => {
      const validTask = {
        identifier: 'test_task',
        label: 'Test Task',
        description: 'A test task',
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
          },
        ],
        externalWorkers: ['worker1'],
        workers: {
          script1: {
            description: 'Test script',
            environmentVariables: { VAR1: 'value1' },
          },
        },
        ui: {
          main: {
            description: 'Main UI',
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
        tasks: [
          {
            identifier: 'task',
            label: 'Task 1',
            description: 'First task',
          },
        ],
      }
      const result = appConfigSchema.safeParse(validApp)
      expectZodSuccess(result)
    })

    it('should reject app with invalid identifier', () => {
      const invalidApp = {
        identifier: 'TEST_APP', // uppercase not allowed
        label: 'Test App',
        description: 'A test application',
        emittableEvents: ['event1'],
        tasks: [
          {
            identifier: 'task1',
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
            identifier: 'task1',
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
            identifier: 'task1',
            label: 'Task 1',
            description: 'First task',
          },
        ],
      }
      const result = appConfigSchema.safeParse(invalidApp)
      expectZodFailure(result)
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
    it('should validate menu item config (with uiIdentifier)', () => {
      const validMenuItem = {
        label: 'Test Menu',
        iconPath: '/icons/test.svg',
      }
      const result = appUILinkSchema.safeParse(validMenuItem)
      expectZodSuccess(result)
    })

    it('should validate menu item config without icon', () => {
      const validMenuItem = {
        label: 'Test Menu',
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
        description: 'Test script',
        environmentVariables: {
          SOME_ENV_VAR: 'production',
          API_URL: 'https://api.example.com',
        },
      }
      const result = appWorkerScriptConfigSchema.safeParse(validScriptConfig)
      expectZodSuccess(result)
    })

    it('should validate worker script config without env vars', () => {
      const validScriptConfig = {
        description: 'Test script',
      }
      const result = appWorkerScriptConfigSchema.safeParse(validScriptConfig)
      expectZodSuccess(result)
    })
  })

  describe('appContributionsSchema', () => {
    it('should validate complete contributions object', () => {
      const validContributions = {
        routes: [
          {
            label: 'Home',
            uiIdentifier: 'main_ui',
            iconPath: '/icons/home.svg',
            path: '/home',
          },
        ],
        sidebarMenuLinks: [
          {
            label: 'Dashboard',
            uiIdentifier: 'main_ui',
            path: '/dashboard',
          },
        ],
        folderActionMenuLinks: [
          {
            label: 'Analyze Folder',
            uiIdentifier: 'tools_ui',
            iconPath: '/icons/analyze.svg',
            path: '/folders/:id/analyze',
          },
        ],
        objectActionMenuLinks: [
          {
            label: 'Process Object',
            uiIdentifier: 'tools_ui',
            path: '/objects/:id/process',
          },
        ],
        folderSidebarEmbeds: [
          {
            label: 'Folder Stats',
            uiIdentifier: 'analytics_ui',
            path: '/folders/:id/stats',
          },
        ],
        objectSidebarEmbeds: [
          {
            label: 'Object Preview',
            uiIdentifier: 'viewer_ui',
            path: '/objects/:id/preview',
          },
        ],
      }
      const result = appContributionsSchema.safeParse(validContributions)
      expectZodSuccess(result)
    })

    it('should allow empty arrays for all contribution sections', () => {
      const validContributions = {
        routes: [],
        sidebarMenuLinks: [],
        folderActionMenuLinks: [],
        objectActionMenuLinks: [],
        folderSidebarEmbeds: [],
        objectSidebarEmbeds: [],
      }
      const result = appContributionsSchema.safeParse(validContributions)
      expectZodSuccess(result)
    })

    it('should reject contributions missing a required section', () => {
      const invalidContributions = {
        // routes missing
        sidebarMenuLinks: [],
        folderActionMenuLinks: [],
        objectActionMenuLinks: [],
        folderSidebarEmbeds: [],
        objectSidebarEmbeds: [],
      }
      const result = appContributionsSchema.safeParse(
        invalidContributions as unknown,
      )
      expectZodFailure(result)
    })

    it('should reject a route entry with empty required fields', () => {
      const invalidContributions = {
        routes: [
          {
            label: '',
            uiIdentifier: '',
            path: '',
          },
        ],
        sidebarMenuLinks: [],
        folderActionMenuLinks: [],
        objectActionMenuLinks: [],
        folderSidebarEmbeds: [],
        objectSidebarEmbeds: [],
      }
      const result = appContributionsSchema.safeParse(invalidContributions)
      expectZodFailure(result)
    })

    it('should reject when a section has the wrong type', () => {
      const invalidContributions = {
        routes: {},
        sidebarMenuLinks: [],
        folderActionMenuLinks: [],
        objectActionMenuLinks: [],
        folderSidebarEmbeds: [],
        objectSidebarEmbeds: [],
      }
      const result = appContributionsSchema.safeParse(
        invalidContributions as unknown,
      )
      expectZodFailure(result)
    })
  })
})
