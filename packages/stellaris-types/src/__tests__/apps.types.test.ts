import { describe, expect, it } from 'bun:test'

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

describe('apps.types', () => {
  describe('paramConfigSchema', () => {
    it('should validate boolean parameter config', () => {
      const validConfig = {
        type: ConfigParamType.boolean,
        default: true,
      }
      const result = paramConfigSchema.safeParse(validConfig)
      expect(result.success).toBe(true)
    })

    it('should validate string parameter config', () => {
      const validConfig = {
        type: ConfigParamType.string,
        default: 'test',
      }
      const result = paramConfigSchema.safeParse(validConfig)
      expect(result.success).toBe(true)
    })

    it('should validate number parameter config', () => {
      const validConfig = {
        type: ConfigParamType.number,
        default: 42,
      }
      const result = paramConfigSchema.safeParse(validConfig)
      expect(result.success).toBe(true)
    })

    it('should validate parameter config without default', () => {
      const validConfig = {
        type: ConfigParamType.string,
      }
      const result = paramConfigSchema.safeParse(validConfig)
      expect(result.success).toBe(true)
    })

    it('should reject invalid parameter type', () => {
      const invalidConfig = {
        type: 'invalid',
        default: 'test',
      }
      const result = paramConfigSchema.safeParse(invalidConfig)
      expect(result.success).toBe(false)
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
      expect(result.success).toBe(true)
    })

    it('should validate object action trigger', () => {
      const validTrigger = {
        type: 'objectAction',
        description: 'Test action',
        inputParams: { param1: 'value1' },
      }
      const result = triggerSchema.safeParse(validTrigger)
      expect(result.success).toBe(true)
    })

    it('should validate folder action trigger', () => {
      const validTrigger = {
        type: 'folderAction',
        actionLabel: 'Test Action',
        inputParams: { param1: 'value1' },
      }
      const result = triggerSchema.safeParse(validTrigger)
      expect(result.success).toBe(true)
    })

    it('should reject invalid trigger type', () => {
      const invalidTrigger = {
        type: 'invalid',
        event: 'test.event',
      }
      const result = triggerSchema.safeParse(invalidTrigger)
      expect(result.success).toBe(false)
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
      expect(result.success).toBe(true)
    })

    it('should validate minimal task config', () => {
      const validTask = {
        identifier: 'test_task',
        label: 'Test Task',
        description: 'A test task',
      }
      const result = taskConfigSchema.safeParse(validTask)
      expect(result.success).toBe(true)
    })

    it('should reject task without required fields', () => {
      const invalidTask = {
        identifier: 'test_task',
        // missing label and description
      }
      const result = taskConfigSchema.safeParse(invalidTask)
      expect(result.success).toBe(false)
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
        workerScripts: {
          script1: {
            description: 'Test script',
            envVars: { VAR1: 'value1' },
          },
        },
        uis: {
          main: {
            description: 'Main UI',
            menuItems: [
              {
                label: 'Menu Item',
                uiIdentifier: 'main',
              },
            ],
          },
        },
      }
      const result = appConfigSchema.safeParse(validApp)
      expect(result.success).toBe(true)
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
      expect(result.success).toBe(true)
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
      expect(result.success).toBe(false)
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
      expect(result.success).toBe(false)
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
      expect(result.success).toBe(false)
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
      expect(result.success).toBe(true)
    })

    it('should reject manifest with invalid entry', () => {
      const invalidManifest = {
        'file1.js': {
          hash: 'abc123',
          // missing size and mimeType
        },
      }
      const result = appManifestSchema.safeParse(invalidManifest)
      expect(result.success).toBe(false)
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
      expect(result.success).toBe(true)
    })

    it('should reject external app worker with missing fields', () => {
      const invalidWorker = {
        appIdentifier: 'testapp',
        // missing other required fields
      }
      const result = externalAppWorkerSchema.safeParse(invalidWorker)
      expect(result.success).toBe(false)
    })
  })

  describe('appMenuItemSchema', () => {
    it('should validate menu item config (with uiIdentifier)', () => {
      const validMenuItem = {
        label: 'Test Menu',
        iconPath: '/icons/test.svg',
      }
      const result = appUILinkSchema.safeParse(validMenuItem)
      expect(result.success).toBe(true)
    })

    it('should validate menu item config without icon', () => {
      const validMenuItem = {
        label: 'Test Menu',
      }
      const result = appUILinkSchema.safeParse(validMenuItem)
      expect(result.success).toBe(true)
    })
  })

  describe('appUIConfigSchema', () => {
    it('should validate UI config', () => {
      const validUIConfig = {
        description: 'Test UI',
        menuItems: [
          {
            label: 'Menu Item',
          },
        ],
      }
      const result = appUIConfigSchema.safeParse(validUIConfig)
      expect(result.success).toBe(true)
    })
  })

  describe('appWorkerScriptConfigSchema', () => {
    it('should validate worker script config', () => {
      const validScriptConfig = {
        description: 'Test script',
        envVars: {
          NODE_ENV: 'production',
          API_URL: 'https://api.example.com',
        },
      }
      const result = appWorkerScriptConfigSchema.safeParse(validScriptConfig)
      expect(result.success).toBe(true)
    })

    it('should validate worker script config without env vars', () => {
      const validScriptConfig = {
        description: 'Test script',
      }
      const result = appWorkerScriptConfigSchema.safeParse(validScriptConfig)
      expect(result.success).toBe(true)
    })
  })

  describe('appContributionsSchema', () => {
    it('should validate complete contributions object', () => {
      const validContributions = {
        routes: [
          {
            title: 'Home',
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
            title: 'Folder Stats',
            uiIdentifier: 'analytics_ui',
            path: '/folders/:id/stats',
          },
        ],
        objectSidebarEmbeds: [
          {
            title: 'Object Preview',
            uiIdentifier: 'viewer_ui',
            path: '/objects/:id/preview',
          },
        ],
      }
      const result = appContributionsSchema.safeParse(validContributions)
      expect(result.success).toBe(true)
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
      expect(result.success).toBe(true)
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
      expect(result.success).toBe(false)
    })

    it('should reject a route entry with empty required fields', () => {
      const invalidContributions = {
        routes: [
          {
            title: '',
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
      expect(result.success).toBe(false)
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
      expect(result.success).toBe(false)
    })
  })
})
