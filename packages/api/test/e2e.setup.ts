import type { AppConfig } from '@lombokapp/types'
import crypto from 'crypto'
import fs from 'fs'

const APPS_PATH = '/apps-test'

if (!fs.existsSync(APPS_PATH)) {
  fs.mkdirSync(APPS_PATH)
}

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

const testAppDefinitions: AppConfig[] = [
  {
    description:
      'An app implementing core functionality. This is a separate node process and can be run alongside the core app or deployed on another host.',
    slug: 'core',
    label: 'Core',
    requiresStorage: false,
    subscribedPlatformEvents: ['platform:worker_task_enqueued'],
    permissions: {
      platform: ['SERVE_APPS'],
      user: [],
      folder: ['WRITE_OBJECTS', 'READ_OBJECTS'],
    },
    triggers: [
      {
        kind: 'event',
        taskIdentifier: 'run_worker_script',
        eventIdentifier: 'platform:worker_task_enqueued',
        dataTemplate: {
          innerTaskId: '{{event.data.innerTaskId}}',
          appIdentifier: '{{event.data.appIdentifier}}',
          workerIdentifier: '{{event.data.workerIdentifier}}',
        },
      },
    ],

    tasks: [
      {
        identifier: 'analyze_object',
        label: 'Analyze Object',
        description:
          'Analyze the content of a file and save the result as metadata',
        handler: {
          type: 'external',
        },
      },
      {
        identifier: 'run_worker_script',
        label: 'Run Worker',
        description: 'Run a worker script.',
        handler: {
          type: 'external',
        },
      },
    ],
  },
  {
    description: 'A dummy app for testing docker jobs.',
    slug: 'testapp',
    label: 'Test App',
    requiresStorage: false,
    subscribedPlatformEvents: [],
    permissions: {
      platform: [],
      user: [],
      folder: ['WRITE_OBJECTS', 'READ_OBJECTS'],
    },
    tasks: [
      {
        identifier: 'triggered_docker_job_task',
        label: 'Docker Handled and Event Triggered Job',
        description:
          'A task that is triggered by an event and handled by a docker job.',
        handler: {
          type: 'docker',
          identifier: 'dummy_profile:test_job',
        },
      },
      {
        identifier: 'non_triggered_docker_job_task',
        label: 'Docker Handled Job',
        description: 'Task that is handled by a docker job.',
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
    subscribedPlatformEvents: [],
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
          type: 'external',
        },
      },
      {
        identifier: 'lifecycle_schedule_task',
        label: 'Schedule Task',
        description: 'Runs on a schedule trigger.',
        handler: {
          type: 'external',
        },
      },
      {
        identifier: 'lifecycle_user_action_task',
        label: 'User Action Task',
        description: 'Triggered by a user action.',
        handler: {
          type: 'external',
        },
      },
      {
        identifier: 'lifecycle_on_complete',
        label: 'On Complete Handler',
        description: 'Runs after the parent task completes.',
        handler: {
          type: 'external',
        },
      },
      {
        identifier: 'lifecycle_parent_task_single_oncomplete',
        label: 'Parent Event Task',
        description:
          'Triggered by an event registers a single onComplete handler.',
        handler: {
          type: 'external',
        },
      },
      {
        identifier: 'lifecycle_parent_task',
        label: 'Parent Event Task',
        description: 'Triggered by an event and chains an onComplete handler.',
        handler: {
          type: 'external',
        },
      },
      {
        identifier: 'lifecycle_chain_one',
        label: 'On Complete Chain One',
        description: 'First chain onComplete task.',
        handler: {
          type: 'external',
        },
      },
    ],
  },
  {
    description: 'Test app for app socket interface testing.',
    slug: 'sockettestapp',
    label: 'Socket Test App',
    requiresStorage: false,
    subscribedPlatformEvents: [],
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
          type: 'external',
        },
      },
    ],
  },
  {
    description:
      'Test app for app socket interface testing without db enabled.',
    slug: 'sockettestappnodb',
    label: 'Socket Test App',
    requiresStorage: false,
    subscribedPlatformEvents: [],
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
          type: 'external',
        },
      },
    ],
  },
  {
    description: 'Test app for with data template.',
    slug: 'sockettestappdatatemplate',
    label: 'Socket Test App',
    requiresStorage: false,
    subscribedPlatformEvents: [],
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
    tasks: [
      {
        identifier: 'socket_test_task',
        label: 'Socket Test Task',
        description: 'A task for testing socket interface.',
        handler: {
          type: 'external',
        },
      },
    ],
  },
]

const addTestAppDefinition = async (appConfig: AppConfig) => {
  if (!fs.existsSync(`${APPS_PATH}/${appConfig.slug}`)) {
    fs.mkdirSync(`${APPS_PATH}/${appConfig.slug}`)
  }

  fs.writeFileSync(
    `${APPS_PATH}/${appConfig.slug}/config.json`,
    JSON.stringify(appConfig),
  )

  // Generate and store public key for sockettestapp
  const { publicKey, privateKey } = await generateKeyPair()
  fs.writeFileSync(`${APPS_PATH}/${appConfig.slug}/.publicKey`, publicKey)
  // Store private key in a file that tests can read
  fs.writeFileSync(`${APPS_PATH}/${appConfig.slug}/.privateKey`, privateKey)
}

await Promise.all(
  testAppDefinitions.map((appDef) => addTestAppDefinition(appDef)),
)
