import type { AppConfig } from '@lombokapp/types'
import { spawn } from 'bun'
import crypto from 'crypto'
import fs from 'fs'

import { DUMMY_APP_SLUG, E2E_TEST_APPS_PATH } from './e2e.contants'

// Generate key pair for socket test app
const generateKeyPair = (): Promise<{
  publicKey: string
  privateKey: string
}> => {
  return new Promise((resolve) => {
    crypto.generateKeyPair(
      'rsa',
      {
        modulusLength: 4096,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem',
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem',
          cipher: undefined,
          passphrase: undefined,
        },
      },
      (err, publicKey, privateKey) => {
        if (err) {
          throw err
        }
        resolve({ publicKey, privateKey })
      },
    )
  })
}

const MINIMAL_WORKER_CONTENT = `
export const handleTask: TaskHandler = async function handleTask(task, { serverClient }) {
  await serverClient.getContentSignedUrls([
    {
      folderId: task.subjectFolderId || 'test-folder',
      objectKey: task.subjectObjectKey || 'test-object',
      method: SignedURLsRequestMethod.GET,
    },
  ])
}
`

const testAppDefinitions: AppConfig[] = [
  {
    description: 'A dummy app.',
    slug: DUMMY_APP_SLUG,
    label: 'Dummy',
    requiresStorage: false,
    subscribedCoreEvents: ['core:object_added'],
    permissions: {
      platform: [],
      user: [],
      folder: ['WRITE_OBJECTS', 'READ_OBJECTS'],
    },
    triggers: [
      {
        kind: 'event',
        taskIdentifier: 'minimal_worker_task',
        eventIdentifier: 'core:object_added',
        dataTemplate: {
          folderId: '{{event.data.folderId}}',
          objectKey: '{{event.data.objectKey}}',
        },
      },
    ],
    tasks: [
      {
        identifier: 'minimal_worker_task',
        label: 'Minimal Worker Task',
        description: 'A task that is triggered by an object added event.',
        handler: {
          type: 'worker',
          identifier: 'minimal_worker',
        },
      },
    ],
    workers: {
      minimal_worker: {
        description: 'Test App Worker',
        entrypoint: 'minimal-worker.ts',
      },
    },
  },
  {
    description: 'A dummy app for testing docker workers.',
    slug: 'testapp',
    label: 'Test App',
    requiresStorage: false,
    subscribedCoreEvents: [],
    permissions: {
      platform: [],
      user: [],
      folder: ['WRITE_OBJECTS', 'READ_OBJECTS'],
    },
    tasks: [
      {
        identifier: 'triggered_docker_worker_task',
        label: 'Docker Handled and Event Triggered Job',
        description:
          'A task that is triggered by an event and handled by a docker worker.',
        handler: {
          type: 'docker',
          identifier: 'dummy_profile:test_job',
        },
      },
      {
        identifier: 'non_triggered_docker_worker_task',
        label: 'Docker Handled Job',
        description: 'Task that is handled by a docker worker.',
        handler: {
          type: 'docker',
          identifier: 'dummy_profile_two:test_job_other',
        },
      },
    ],
    containerProfiles: {
      dummy_profile: {
        image: 'dummy-namespace/dummy-image',
        workers: [
          {
            jobIdentifier: 'test_job',
            kind: 'exec',
            command: ['./start_dummy_worker.sh'],
          },
          {
            kind: 'http',
            command: ['./start_dummy_worker.sh'],
            port: 8080,
            jobs: [
              {
                identifier: 'test_job_http',
              },
            ],
          },
        ],
      },
      dummy_profile_two: {
        image: 'dummy-namespace/dummy-image',
        workers: [
          {
            jobIdentifier: 'test_job_other',
            kind: 'exec',
            command: ['./start_dummy_worker.sh'],
          },
        ],
      },
    },
  },
  {
    description: 'Test app for task lifecycle flows.',
    slug: 'tasklifecycle',
    label: 'Task Lifecycle App',
    requiresStorage: false,
    subscribedCoreEvents: [],
    permissions: {
      platform: [],
      user: [],
      folder: [],
    },
    triggers: [
      {
        kind: 'schedule',
        name: 'dummy_schedule',
        config: {
          interval: 1,
          unit: 'hours',
        },
        taskIdentifier: 'lifecycle_schedule_task',
      },
      {
        kind: 'event',
        eventIdentifier: 'dummy_event_other',
        dataTemplate: {
          payload: '{{event.data.payload}}',
        },
        taskIdentifier: 'lifecycle_parent_task_single_oncomplete',
        onComplete: [
          {
            taskIdentifier: 'lifecycle_on_complete',
            condition: 'task.success',
            dataTemplate: {
              inheritedPayload: '{{task.data.payload}}',
            },
          },
        ],
      },
      {
        kind: 'event',
        eventIdentifier: 'dummy_event',
        taskIdentifier: 'lifecycle_parent_task',
        dataTemplate: {
          payload: '{{event.data.payload}}',
        },
        onComplete: [
          {
            taskIdentifier: 'lifecycle_on_complete',
            condition: 'task.success',
            dataTemplate: {
              inheritedPayload: '{{task.data.payload}}',
            },
            onComplete: [
              {
                taskIdentifier: 'lifecycle_chain_one',
                condition: 'task.success',
                dataTemplate: {
                  doubleInheritedPayload: '{{task.data.inheritedPayload}}',
                },
              },
            ],
          },
        ],
      },
    ],
    tasks: [
      {
        identifier: 'lifecycle_app_action_task',
        label: 'App Action Task',
        description: 'Created via triggerAppActionTask.',
        handler: {
          type: 'worker',
          identifier: 'minimal_worker',
        },
      },
      {
        identifier: 'lifecycle_schedule_task',
        label: 'Schedule Task',
        description: 'Runs on a schedule trigger.',
        handler: {
          type: 'worker',
          identifier: 'minimal_worker',
        },
      },
      {
        identifier: 'lifecycle_user_action_task',
        label: 'User Action Task',
        description: 'Triggered by a user action.',
        handler: {
          type: 'worker',
          identifier: 'minimal_worker',
        },
      },
      {
        identifier: 'lifecycle_on_complete',
        label: 'On Complete Handler',
        description: 'Runs after the parent task completes.',
        handler: {
          type: 'worker',
          identifier: 'minimal_worker',
        },
      },
      {
        identifier: 'lifecycle_parent_task_single_oncomplete',
        label: 'Parent Event Task',
        description:
          'Triggered by an event registers a single onComplete handler.',
        handler: {
          type: 'worker',
          identifier: 'minimal_worker',
        },
      },
      {
        identifier: 'lifecycle_parent_task',
        label: 'Parent Event Task',
        description: 'Triggered by an event and chains an onComplete handler.',
        handler: {
          type: 'worker',
          identifier: 'minimal_worker',
        },
      },
      {
        identifier: 'lifecycle_chain_one',
        label: 'On Complete Chain One',
        description: 'First chain onComplete task.',
        handler: {
          type: 'worker',
          identifier: 'minimal_worker',
        },
      },
    ],
    workers: {
      minimal_worker: {
        description: 'Test App Worker',
        entrypoint: 'minimal-worker.ts',
      },
    },
  },
  {
    description: 'Test app for app socket interface testing.',
    slug: 'sockettestapp',
    label: 'Socket Test App',
    requiresStorage: false,
    subscribedCoreEvents: [],
    database: {
      enabled: true,
    },
    permissions: {
      platform: [],
      user: [],
      folder: ['WRITE_OBJECTS', 'READ_OBJECTS'],
    },
    tasks: [
      {
        identifier: 'socket_test_task',
        label: 'Socket Test Task',
        description: 'A task for testing socket interface.',
        handler: {
          type: 'worker',
          identifier: 'minimal_worker',
        },
      },
    ],
    workers: {
      minimal_worker: {
        description: 'Test App Worker',
        entrypoint: 'minimal-worker.ts',
      },
    },
  },
  {
    description:
      'Test app for app socket interface testing without db enabled.',
    slug: 'sockettestappnodb',
    label: 'Socket Test App',
    requiresStorage: false,
    subscribedCoreEvents: [],
    permissions: {
      platform: [],
      user: [],
      folder: ['WRITE_OBJECTS', 'READ_OBJECTS'],
    },
    tasks: [
      {
        identifier: 'socket_test_task',
        label: 'Socket Test Task',
        description: 'A task for testing socket interface.',
        handler: {
          type: 'worker',
          identifier: 'minimal_worker',
        },
      },
    ],
    workers: {
      minimal_worker: {
        description: 'Test App Worker',
        entrypoint: 'minimal-worker.ts',
      },
    },
  },
  {
    description: 'Test app for with data template.',
    slug: 'sockettestappdatatemplate',
    label: 'Socket Test App',
    requiresStorage: false,
    subscribedCoreEvents: [],
    permissions: {
      platform: [],
      user: [],
      folder: ['WRITE_OBJECTS', 'READ_OBJECTS'],
    },
    triggers: [
      {
        kind: 'event',
        eventIdentifier: 'dummy_event',
        taskIdentifier: 'socket_test_task',
        dataTemplate: {
          folderId: '{{event.data.folderId}}',
          objectKey: '{{event.data.objectKey}}',
          fileUrl:
            "{{createPresignedUrl(event.data.folderId, event.data.objectKey, 'GET')}}",
        },
      },
    ],
    workers: {
      minimal_worker: {
        description: 'Test App Worker',
        entrypoint: 'minimal-worker.ts',
      },
    },
    tasks: [
      {
        identifier: 'socket_test_task',
        label: 'Socket Test Task',
        description: 'A task for testing socket interface.',
        handler: {
          type: 'worker',
          identifier: 'minimal_worker',
        },
      },
    ],
  },
]

console.log(`Adding test app definitions at path: ${E2E_TEST_APPS_PATH}`)
const addTestAppDefinition = async (appConfig: AppConfig) => {
  if (!fs.existsSync(`${E2E_TEST_APPS_PATH}/${appConfig.slug}`)) {
    fs.mkdirSync(`${E2E_TEST_APPS_PATH}/${appConfig.slug}`, { recursive: true })
  }

  fs.writeFileSync(
    `${E2E_TEST_APPS_PATH}/${appConfig.slug}/config.json`,
    JSON.stringify(appConfig),
  )
  fs.mkdirSync(`${E2E_TEST_APPS_PATH}/${appConfig.slug}/workers`, {
    recursive: true,
  })
  fs.writeFileSync(
    `${E2E_TEST_APPS_PATH}/${appConfig.slug}/workers/minimal-worker.ts`,
    MINIMAL_WORKER_CONTENT,
  )

  // Generate and store public key for sockettestapp
  const { publicKey, privateKey } = await generateKeyPair()
  fs.writeFileSync(
    `${E2E_TEST_APPS_PATH}/${appConfig.slug}/.publicKey`,
    publicKey,
  )
  // Store private key in a file that tests can read
  fs.writeFileSync(
    `${E2E_TEST_APPS_PATH}/${appConfig.slug}/.privateKey`,
    privateKey,
  )

  // Zip up the files and leave the zip at ${E2E_TEST_APPS_PATH}/${appConfig.slug}.zip
  const zipPath = `${E2E_TEST_APPS_PATH}/${appConfig.slug}.zip`
  const zipProc = spawn({
    cmd: ['zip', '-r', zipPath, appConfig.slug],
    cwd: E2E_TEST_APPS_PATH,
    stdout: 'ignore',
    stderr: 'ignore',
  })
  const zipCode = await zipProc.exited
  if (zipCode !== 0) {
    throw new Error(
      `Failed to create zip file for ${appConfig.slug}: ${zipCode}`,
    )
  }
  fs.rmSync(`${E2E_TEST_APPS_PATH}/${appConfig.slug}/`, {
    recursive: true,
    force: true,
  })
}

await Promise.all(
  testAppDefinitions.map((appDef) => addTestAppDefinition(appDef)),
)
console.log(
  '%d test app definitions added! (slugs: %s)',
  testAppDefinitions.length,
  testAppDefinitions.map((appDef) => appDef.slug).join(', '),
)
