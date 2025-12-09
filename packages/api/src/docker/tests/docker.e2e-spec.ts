/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type {
  JsonSerializableObject,
  StorageAccessPolicy,
} from '@lombokapp/types'
import { PLATFORM_IDENTIFIER, SignedURLsRequestMethod } from '@lombokapp/types'
import { Logger } from '@nestjs/common'
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  spyOn,
} from 'bun:test'
import { eq, notIlike } from 'drizzle-orm'
import { appsTable } from 'src/app/entities/app.entity'
import { appUserSettingsTable } from 'src/app/entities/app-user-settings.entity'
import { eventsTable } from 'src/event/entities/event.entity'
import { tasksTable } from 'src/task/entities/task.entity'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
} from 'src/test/test.util'
import type { User } from 'src/users/entities/user.entity'

import { DockerAdapterProvider } from '../services/client/adapters/docker-adapter.provider'
import {
  buildMockDockerAdapter,
  MockDockerAdapterProvider,
} from './docker.e2e-mocks'

const TEST_MODULE_KEY = 'docker_jobs'
const responseStatus = (result: { response?: Response; error?: unknown }) =>
  result.response?.status ??
  (result as { error?: { status?: number } }).error?.status ??
  -1

const insertTaskWithEvent = async (testModule: TestModule) => {
  const taskId = crypto.randomUUID()
  const eventId = crypto.randomUUID()
  const now = new Date()

  await testModule.getOrmService().db.insert(eventsTable).values({
    id: eventId,
    eventIdentifier: 'testapp:test_job',
    emitterIdentifier: 'testapp',
    data: {},
    createdAt: now,
  })

  await testModule
    .getOrmService()
    .db.insert(tasksTable)
    .values({
      id: taskId,
      ownerIdentifier: 'testapp',
      taskDescription: 'Test task',
      createdAt: now,
      updatedAt: now,
      handlerType: 'docker',
      handlerIdentifier: 'testapp:test_job',
      taskIdentifier: 'test_job_task',
      data: {},
      trigger: {
        kind: 'event',
        data: {
          eventId,
          eventIdentifier: 'testapp:test_job',
          emitterIdentifier: 'testapp',
          eventData: {},
        },
      },
    })

  return { taskId, eventId, createdAt: now }
}

const triggerAppDockerHandledTask = async (
  testModule: TestModule,
  {
    appIdentifier,
    taskIdentifier,
    taskData,
    storageAccessPolicy,
    expectRecords = true,
  }: {
    appIdentifier: string
    taskIdentifier: string
    taskData: JsonSerializableObject
    storageAccessPolicy?: StorageAccessPolicy | undefined
    expectRecords?: boolean
  },
) => {
  // await testModule.getEventService().emitEvent({
  //   emitterIdentifier: PLATFORM_IDENTIFIER,
  //   eventIdentifier: `${PLATFORM_IDENTIFIER}:app_action:queue_app_task`,
  //   data: {
  //     appIdentifier,
  //     taskIdentifier,
  //     inputData,
  //     ...(storageAccessPolicy && { storageAccessPolicy }),
  //   },
  // })
  await testModule.services.taskService.triggerAppActionTask({
    appIdentifier,
    taskIdentifier,
    ...(storageAccessPolicy && { storageAccessPolicy }),
    taskData,
  })

  // drain the platform tasks (twice) to ensure the docker run task is enqueued and started
  await testModule.services.platformTaskService.drainPlatformTasks(true)
  await testModule.services.platformTaskService.drainPlatformTasks(true)

  const events = await testModule
    .getOrmService()
    .db.select()
    .from(eventsTable)
    .where(
      notIlike(
        eventsTable.eventIdentifier,
        `${PLATFORM_IDENTIFIER}:schedule:%`,
      ),
    )
  const tasks = await testModule.getOrmService().db.select().from(tasksTable)
  const app = await testModule.getAppService().getApp(appIdentifier, {
    enabled: true,
  })
  const taskDefinition = app?.config.tasks?.find(
    (task) => task.identifier === taskIdentifier,
  )

  // console.log(
  //   'EVENTS AND TASKS',
  //   JSON.stringify(
  //     {
  //       events,
  //       tasks,
  //     },
  //     null,
  //     2,
  //   ),
  // )

  expect(taskDefinition).toBeDefined()
  if (
    taskDefinition?.handler.type !== 'docker' &&
    taskDefinition?.handler.type !== 'worker'
  ) {
    throw new Error('Task definition not found')
  }
  const innerTask = tasks.find((task) => task.taskIdentifier === taskIdentifier)
  const dockerRunTask = tasks.find(
    (task) => task.taskIdentifier === 'run_docker_job',
  )
  const queueTask = tasks.find(
    (task) => task.taskIdentifier === 'queue_app_task',
  )

  const taskQueueEvent = events[0]
  const dockerTaskEnqueuedEvent = events[1]

  if (expectRecords) {
    const profileIdentifier = taskDefinition.handler.identifier.split(':')[0]
    const jobClassIdentifier = taskDefinition.handler.identifier.split(':')[1]

    // logger.log('events', events)
    // logger.log('tasks', tasks)
    expect(taskQueueEvent).toEqual({
      id: expect.any(String),
      eventIdentifier: `${PLATFORM_IDENTIFIER}:app_action:queue_app_task`,
      emitterIdentifier: PLATFORM_IDENTIFIER,
      targetUserId: null,
      targetLocation: null,
      data: {
        inputData: taskData,
        appIdentifier,
        taskIdentifier: taskDefinition.identifier,
        ...(storageAccessPolicy && { storageAccessPolicy }),
      },
      createdAt: expect.any(Date),
    })
    expect(dockerTaskEnqueuedEvent).toEqual({
      id: expect.any(String),
      eventIdentifier: `${PLATFORM_IDENTIFIER}:docker_task_enqueued`,
      emitterIdentifier: PLATFORM_IDENTIFIER,
      targetUserId: null,
      targetLocation: null,
      data: {
        innerTaskId: expect.any(String),
        appIdentifier,
        profileIdentifier,
        jobClassIdentifier,
      },
      createdAt: expect.any(Date),
    })

    expect(queueTask).toEqual({
      id: expect.any(String),
      ownerIdentifier: PLATFORM_IDENTIFIER,
      taskIdentifier: 'queue_app_task',
      taskDescription: 'Queue an app task',
      data: {},
      trigger: {
        kind: 'event',
        data: {
          eventId: events[0].id,
          eventIdentifier: `${PLATFORM_IDENTIFIER}:app_action:queue_app_task`,
          emitterIdentifier: PLATFORM_IDENTIFIER,
          eventData: {
            inputData: taskData,
            appIdentifier,
            taskIdentifier: taskDefinition.identifier,
            ...(storageAccessPolicy && { storageAccessPolicy }),
          },
        },
      },
      targetLocation: null,
      targetUserId: null,
      dontStartBefore: null,
      storageAccessPolicy: [],
      systemLog: [
        {
          at: expect.any(String),
          payload: {
            logType: 'started',
          },
        },
        {
          at: expect.any(String),
          payload: {
            logType: 'success',
          },
        },
      ],
      taskLog: [],
      startedAt: expect.any(Date),
      completedAt: expect.any(Date),
      success: true,
      error: null,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      handlerType: PLATFORM_IDENTIFIER,
      handlerIdentifier: null,
    })
    expect(queueTask?.completedAt).toEqual(queueTask?.updatedAt)

    expect(dockerRunTask?.data.innerTaskId).toBeDefined()
    expect(dockerRunTask).toEqual({
      id: expect.any(String),
      ownerIdentifier: PLATFORM_IDENTIFIER,
      taskIdentifier: 'run_docker_job',
      taskDescription: 'Run a docker job',
      storageAccessPolicy: [],
      data: {
        appIdentifier,
        jobClassIdentifier,
        profileIdentifier,
        innerTaskId: innerTask?.id ?? '',
      },
      dontStartBefore: null,
      systemLog: [
        {
          at: expect.any(String),
          payload: {
            logType: 'started',
          },
        },
      ],
      taskLog: [],
      trigger: {
        kind: 'event',
        data: {
          eventId: events[1].id,
          eventIdentifier: `${PLATFORM_IDENTIFIER}:docker_task_enqueued`,
          emitterIdentifier: PLATFORM_IDENTIFIER,
          eventData: {
            innerTaskId: expect.any(String),
            appIdentifier,
            profileIdentifier,
            jobClassIdentifier,
          },
        },
      },
      targetLocation: null,
      targetUserId: null,
      startedAt: expect.any(Date),
      completedAt: null,
      success: null,
      error: null,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      handlerType: PLATFORM_IDENTIFIER,
      handlerIdentifier: null,
    })
    expect(dockerRunTask?.startedAt).toEqual(dockerRunTask?.updatedAt)
  }
  return {
    innerTask: innerTask!,
    dockerRunTask: dockerRunTask!,
    taskQueueEvent,
    queueTask: queueTask!,
  }
}

describe('Docker Jobs', () => {
  let testModule: TestModule | undefined
  const logger = new Logger(`TestModule[${TEST_MODULE_KEY}]`)
  let _apiClient: TestApiClient
  const mockDockerAdapter = buildMockDockerAdapter('local')
  const mockDockerAdapterProvider = new MockDockerAdapterProvider(
    mockDockerAdapter,
  )

  const getAdapterSpy = spyOn(mockDockerAdapterProvider, 'getDockerAdapter')
  const createContainerSpy = spyOn(mockDockerAdapter, 'createContainer')
  const execSpy = spyOn(mockDockerAdapter, 'exec')

  const resetTestData = async () => {
    execSpy.mockClear()
    getAdapterSpy.mockClear()
    createContainerSpy.mockClear()
    await testModule?.resetAppState()
  }

  beforeAll(async () => {
    testModule = await buildTestModule({
      testModuleKey: TEST_MODULE_KEY,
      overrides: [
        {
          token: DockerAdapterProvider,
          value: mockDockerAdapterProvider,
        },
      ],
      // debug: true,
    })
    const apps = await testModule.getAppService().listAppsAsAdmin(
      {
        id: '1',
        isAdmin: true,
      } as User,
      { enabled: true },
    )

    if (apps.result.length !== 2) {
      throw new Error('Dummy test apps not installed (maybe invalid).')
    }
    _apiClient = testModule.apiClient
  })

  afterEach(async () => {
    await resetTestData()
  })

  it(`should properly call the docker adapter with AppService.executeAppDockerJob(...) is called`, async () => {
    const {
      session: { accessToken: _testUserAccessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    await testModule?.getAppService().executeAppDockerJob({
      appIdentifier: 'testapp',
      profileIdentifier: 'dummy_profile',
      jobIdentifier: 'test_job',
      jobInputData: {},
    })
    expect(getAdapterSpy).toHaveBeenCalledWith('local')
    expect(createContainerSpy).toHaveBeenCalledWith({
      gpus: {
        deviceIds: ['0'],
        driver: 'nvidia',
      },
      image: 'dummy-namespace/dummy-image',
      labels: {
        'lombok.platform': 'lombok',
        'lombok.profile_hash': '59da6c5f',
        'lombok.profile_id': 'lombok:profile_hash_59da6c5f',
      },
      volumes: {
        '/app/model_cache': '/mnt/user/appdata/somepath',
      },
    })
    expect(execSpy.mock.calls[0]).toEqual([
      '1',
      {
        gpus: {
          deviceIds: ['0'],
          driver: 'nvidia',
        },
        jobCommand: ['./start_dummy_worker.sh'],
        jobId: expect.any(String),
        jobInputData: {},
        platformURL: 'http://localhost:3000',
        jobInterface: {
          kind: 'exec_per_job',
        },
        jobIdentifier: 'test_job',
        jobToken: undefined,
        volumes: {
          '/app/model_cache': '/mnt/user/appdata/somepath',
        },
        waitForCompletion: true,
      },
    ])

    await testModule?.getAppService().executeAppDockerJob({
      appIdentifier: 'testapp',
      profileIdentifier: 'dummy_profile_two',
      jobIdentifier: 'test_job_other',
      jobInputData: {},
    })

    expect(execSpy.mock.calls[1]).toEqual([
      '1',
      {
        gpus: undefined,
        jobCommand: ['./start_dummy_worker.sh'],
        jobId: expect.any(String),
        jobInputData: {},
        platformURL: 'http://localhost:3000',
        jobInterface: {
          kind: 'exec_per_job',
        },
        jobIdentifier: 'test_job_other',
        jobToken: undefined,
        volumes: undefined,
        waitForCompletion: true,
      },
    ])
  })

  // it(`should generate a token that can call docker task lifecycle endpoints when AppService.executeAppDockerJob(...) is called with a taskId`, async () => {
  //   const {
  //     session: { accessToken: _testUserAccessToken },
  //   } = await createTestUser(testModule!, {
  //     username: 'testuser',
  //     password: '123',
  //   })

  //   const { innerTaskId, dockerRunTaskId } = await triggerAppDockerHandledTask(
  //     testModule!,
  //     {
  //       appIdentifier: 'testapp',
  //       taskIdentifier: 'non_triggered_docker_job_task',
  //       inputData: { myTaskData: 'test' },
  //     },
  //   )

  //   expect(getAdapterSpy).toHaveBeenCalledWith('local')
  //   expect(createContainerSpy).toHaveBeenCalledWith({
  //     gpus: {
  //       deviceIds: ['0'],
  //       driver: 'nvidia',
  //     },
  //     image: 'dummy-namespace/dummy-image',
  //     labels: {
  //       'lombok.platform': 'lombok',
  //       'lombok.profile_hash': '59da6c5f',
  //       'lombok.profile_id': 'lombok:profile_hash_59da6c5f',
  //     },
  //     volumes: {
  //       '/app/model_cache': '/mnt/user/appdata/somepath',
  //     },
  //   })

  //   expect(execSpy).toHaveBeenCalledWith('1', {
  //     gpus: {
  //       deviceIds: ['0'],
  //       driver: 'nvidia',
  //     },
  //     profileHostConfigKey: 'testapp:dummy_profile',
  //     jobCommand: ['./start_dummy_worker.sh'],
  //     jobId: expect.any(String),
  //     jobInputData: {},
  //     jobInterface: {
  //       kind: 'exec_per_job',
  //     },
  //     jobIdentifier: 'test_job',
  //     jobToken: expect.any(String),
  //     profileSpec: {
  //       image: 'dummy-namespace/dummy-image',
  //       workers: [
  //         {
  //           command: ['./start_dummy_worker.sh'],
  //           jobIdentifier: 'test_job',
  //           kind: 'exec',
  //         },
  //         {
  //           command: ['./start_dummy_worker.sh'],
  //           jobs: [
  //             {
  //               identifier: 'test_job_http',
  //             },
  //           ],
  //           kind: 'http',
  //           port: 8080,
  //         },
  //       ],
  //     },
  //     volumes: {
  //       '/app/model_cache': '/mnt/user/appdata/somepath',
  //     },
  //     waitForCompletion: true,
  //   })

  //   expect(execSpy.mock.calls.length).toBe(1)
  //   const token = execSpy.mock.calls[0][1].jobToken ?? ''
  //   const jobId = execSpy.mock.calls[0][1].jobId
  //   const workerJobService = await testModule!.resolveDep(WorkerJobService)
  //   const claims = workerJobService.verifyWorkerJobToken(token, jobId)

  //   expect(claims.jobId).toBe(jobId)
  //   expect(claims.taskId).toBe(dockerRunTaskId)

  //   await _apiClient(token).POST(`/api/v1/docker/jobs/{jobId}/start`, {
  //     params: {
  //       path: {
  //         jobId,
  //       },
  //     },
  //   })

  //   const startedTask = await testModule!
  //     .getOrmService()
  //     .db.query.tasksTable.findFirst({
  //       where: eq(tasksTable.id, dockerRunTaskId),
  //     })

  //   expect(startedTask?.startedAt).toBeDefined()

  //   await _apiClient(token).POST(`/api/v1/docker/jobs/{jobId}/complete`, {
  //     params: {
  //       path: {
  //         jobId,
  //       },
  //     },
  //     body: {
  //       success: true,
  //       result: {
  //         message: 'Test result',
  //       },
  //       uploadedFiles: [],
  //     },
  //   })

  //   const completedTask = await testModule!
  //     .getOrmService()
  //     .db.query.tasksTable.findFirst({
  //       where: eq(tasksTable.id, dockerRunTaskId),
  //     })

  //   expect(completedTask?.completedAt).toBeDefined()

  //   expect(completedTask?.updates.at(-1)?.updateData ?? {}).toEqual({
  //     jobId: expect.any(String),
  //     success: expect.any(Boolean),
  //     result: expect.any(Object),
  //   })
  // })

  // it('should call exec with waitForCompletion=false when no asyncTaskId is provided', async () => {
  //   await createTestUser(testModule!, {
  //     username: 'testuser',
  //     password: '123',
  //   })

  //   await testModule?.getAppService().executeAppDockerJob({
  //     appIdentifier: 'testapp',
  //     profileIdentifier: 'dummy_profile',
  //     jobIdentifier: 'test_job',
  //     jobInputData: { foo: 'bar' },
  //   })

  //   expect(execSpy).toHaveBeenCalledWith(
  //     ...[
  //       '1',
  //       expect.objectContaining({
  //         waitForCompletion: false,
  //         jobToken: undefined,
  //         jobInputData: { foo: 'bar' },
  //       }),
  //     ],
  //   )
  // })

  it('should reject completion when the task has not been started', async () => {
    await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const { taskId } = await insertTaskWithEvent(testModule!)

    await testModule?.getAppService().executeAppDockerJob({
      appIdentifier: 'testapp',
      profileIdentifier: 'dummy_profile',
      jobIdentifier: 'test_job',
      jobInputData: {},
      asyncTaskId: taskId,
    })

    const token = execSpy.mock.calls[0][1].jobToken ?? ''
    const jobId = execSpy.mock.calls[0][1].jobId

    const completeAttempt = await _apiClient(token).POST(
      `/api/v1/docker/jobs/{jobId}/complete`,
      {
        params: {
          path: { jobId },
        },
        body: {
          success: true,
          result: { message: 'should fail' },
          uploadedFiles: [],
        },
      },
    )

    expect(responseStatus(completeAttempt)).toBe(403)

    const task = await testModule!
      .getOrmService()
      .db.query.tasksTable.findFirst({
        where: eq(tasksTable.id, taskId),
      })

    expect(task?.startedAt).toBeFalsy()
    expect(task?.completedAt).toBeFalsy()
  })

  it('should call the worker agent with a valid jobToken that can be used to start the inner task', async () => {
    await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const { innerTask, taskQueueEvent, dockerRunTask } =
      await triggerAppDockerHandledTask(testModule!, {
        appIdentifier: 'testapp',
        taskIdentifier: 'non_triggered_docker_job_task',
        taskData: { myTaskData: 'test' },
      })

    expect(innerTask).toEqual({
      id: expect.any(String),
      ownerIdentifier: 'testapp',
      taskIdentifier: 'non_triggered_docker_job_task',
      taskDescription: 'Task that is handled by a docker job.',
      data: { myTaskData: 'test' },
      dontStartBefore: null,
      storageAccessPolicy: [],
      systemLog: [],
      taskLog: [],
      trigger: {
        kind: 'event',
        data: {
          eventId: taskQueueEvent.id,
          eventIdentifier: `${PLATFORM_IDENTIFIER}:app_action:queue_app_task`,
          emitterIdentifier: PLATFORM_IDENTIFIER,
          eventData: {
            inputData: { myTaskData: 'test' },
            appIdentifier: 'testapp',
            taskIdentifier: 'non_triggered_docker_job_task',
          },
        },
      },
      targetLocation: null,
      targetUserId: null,
      startedAt: null,
      completedAt: null,
      success: null,
      error: null,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      handlerType: 'docker',
      handlerIdentifier: 'dummy_profile_two:test_job_other',
    })

    const jobToken = execSpy.mock.calls[0][1].jobToken ?? ''
    const jobId = execSpy.mock.calls[0][1].jobId
    expect(jobToken.length).toBeGreaterThan(0)

    const claims = testModule!
      .getWorkerJobService()
      .verifyWorkerJobToken(jobToken, jobId)

    expect(claims.jobId).toBe(jobId)
    expect(claims.taskId).toBe(dockerRunTask.id)
    expect(claims.storageAccessPolicy).toEqual([])
  })

  it('should create an unstarted app task when a docker handled app task is queued', async () => {
    await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const { innerTask, taskQueueEvent } = await triggerAppDockerHandledTask(
      testModule!,
      {
        appIdentifier: 'testapp',
        taskIdentifier: 'non_triggered_docker_job_task',
        taskData: { myTaskData: 'test' },
      },
    )

    expect(innerTask).toEqual({
      id: expect.any(String),
      ownerIdentifier: 'testapp',
      taskIdentifier: 'non_triggered_docker_job_task',
      taskDescription: 'Task that is handled by a docker job.',
      data: { myTaskData: 'test' },
      storageAccessPolicy: [],
      dontStartBefore: null,
      systemLog: [],
      taskLog: [],
      trigger: {
        kind: 'event',
        data: {
          eventId: taskQueueEvent.id,
          eventIdentifier: `${PLATFORM_IDENTIFIER}:app_action:queue_app_task`,
          emitterIdentifier: PLATFORM_IDENTIFIER,
          eventData: {
            inputData: { myTaskData: 'test' },
            appIdentifier: 'testapp',
            taskIdentifier: 'non_triggered_docker_job_task',
          },
        },
      },
      targetLocation: null,
      targetUserId: null,
      startedAt: null,
      completedAt: null,
      success: null,
      error: null,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      handlerType: 'docker',
      handlerIdentifier: 'dummy_profile_two:test_job_other',
    })
  })

  it('should be accept and respect a provided storageAccessPolicy', async () => {
    const {
      session: { accessToken: folderOwnerAccessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    await createTestUser(testModule!, {
      username: 'nonfolderowner',
      password: '123',
    })

    const testFolder = await createTestFolder({
      testModule: testModule!,
      folderName: 'test-folder',
      accessToken: folderOwnerAccessToken,
      mockFiles: [],
      apiClient: testModule!.apiClient,
    })

    const testFolder2 = await createTestFolder({
      testModule: testModule!,
      folderName: 'test-folder-2',
      accessToken: folderOwnerAccessToken,
      mockFiles: [],
      apiClient: testModule!.apiClient,
    })

    const allowedFolderId = testFolder.folder.id
    const allowedFolderId2 = testFolder2.folder.id

    await testModule!
      .getOrmService()
      .db.update(appsTable)
      .set({
        userScopeEnabledDefault: true,
        folderScopeEnabledDefault: true,
      })
      .where(eq(appsTable.identifier, 'testapp'))

    const { innerTask, taskQueueEvent } = await triggerAppDockerHandledTask(
      testModule!,
      {
        appIdentifier: 'testapp',
        taskIdentifier: 'non_triggered_docker_job_task',
        taskData: { myTaskData: 'test' },
        storageAccessPolicy: [
          {
            folderId: allowedFolderId,
            methods: [SignedURLsRequestMethod.PUT, SignedURLsRequestMethod.GET],
            prefix: 'this/is/the/test',
          },
          {
            folderId: allowedFolderId2,
            methods: [SignedURLsRequestMethod.DELETE],
            prefix: 'this/is/another/test',
          },
        ],
      },
    )

    expect(innerTask).toEqual({
      id: expect.any(String),
      ownerIdentifier: 'testapp',
      taskIdentifier: 'non_triggered_docker_job_task',
      taskDescription: 'Task that is handled by a docker job.',
      data: { myTaskData: 'test' },
      storageAccessPolicy: [
        {
          folderId: testFolder.folder.id,
          methods: [SignedURLsRequestMethod.PUT, SignedURLsRequestMethod.GET],
          prefix: 'this/is/the/test',
        },
        {
          folderId: testFolder2.folder.id,
          methods: [SignedURLsRequestMethod.DELETE],
          prefix: 'this/is/another/test',
        },
      ],
      dontStartBefore: null,
      systemLog: [],
      taskLog: [],
      trigger: {
        kind: 'event',
        data: {
          eventId: taskQueueEvent.id,
          eventIdentifier: `${PLATFORM_IDENTIFIER}:app_action:queue_app_task`,
          emitterIdentifier: PLATFORM_IDENTIFIER,
          eventData: {
            inputData: { myTaskData: 'test' },
            appIdentifier: 'testapp',
            taskIdentifier: 'non_triggered_docker_job_task',
            storageAccessPolicy: [
              {
                folderId: testFolder.folder.id,
                methods: [
                  SignedURLsRequestMethod.PUT,
                  SignedURLsRequestMethod.GET,
                ],
                prefix: 'this/is/the/test',
              },
              {
                folderId: testFolder2.folder.id,
                methods: [SignedURLsRequestMethod.DELETE],
                prefix: 'this/is/another/test',
              },
            ],
          },
        },
      },
      targetLocation: null,
      targetUserId: null,
      startedAt: null,
      completedAt: null,
      success: null,
      error: null,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      handlerType: 'docker',
      handlerIdentifier: 'dummy_profile_two:test_job_other',
    })

    const jobToken = execSpy.mock.calls[0][1].jobToken ?? ''
    const jobId = execSpy.mock.calls[0][1].jobId

    const deniedFolderId = crypto.randomUUID()

    const presignedUrlRequests = [
      {
        folderId: deniedFolderId,
        objectKey: 'test.txt',
        method: SignedURLsRequestMethod.PUT,
        jobToken,
        expectedStatus: 403,
      },
      {
        folderId: deniedFolderId,
        objectKey: 'this/is/the/test/test.txt',
        method: SignedURLsRequestMethod.PUT,
        jobToken,
        expectedStatus: 403,
      },
      {
        folderId: allowedFolderId,
        objectKey: 'test.txt',
        method: SignedURLsRequestMethod.PUT,
        jobToken,
        expectedStatus: 403,
      },
      {
        folderId: allowedFolderId,
        objectKey: 'this/is/the/test/test.txt',
        method: SignedURLsRequestMethod.DELETE,
        jobToken,
        expectedStatus: 403,
      },
      {
        folderId: deniedFolderId,
        objectKey: 'this/is/the/test/test.txt',
        method: SignedURLsRequestMethod.GET,
        jobToken,
        expectedStatus: 403,
      },
      {
        folderId: allowedFolderId,
        objectKey: 'test.txt',
        method: SignedURLsRequestMethod.GET,
        jobToken,
        expectedStatus: 403,
      },
      {
        folderId: allowedFolderId,
        objectKey: 'this/is/test/test.txt',
        method: SignedURLsRequestMethod.PUT,
        jobToken,
        expectedStatus: 403,
      },
      {
        folderId: allowedFolderId,
        objectKey: 'prefix/this/is/the/test/test.txt',
        method: SignedURLsRequestMethod.PUT,
        jobToken,
        expectedStatus: 403,
      },
      {
        folderId: allowedFolderId,
        objectKey: '',
        method: SignedURLsRequestMethod.PUT,
        jobToken,
        expectedStatus: 400,
      },
      {
        folderId: allowedFolderId,
        objectKey: 'this/is/the/test/test.txt',
        method: SignedURLsRequestMethod.DELETE,
        jobToken,
        expectedStatus: 403,
      },
      {
        folderId: allowedFolderId,
        objectKey: 'this/is/the/test/test.txt',
        method: SignedURLsRequestMethod.PUT,
        jobToken: 'invalid-token',
        expectedStatus: 401,
      },
      {
        folderId: allowedFolderId,
        objectKey: 'this/is/the/test/test.txt',
        method: SignedURLsRequestMethod.GET,
        jobToken: 'invalid-token',
        expectedStatus: 401,
      },
      {
        folderId: allowedFolderId,
        objectKey: 'this/is/the/test/test.txt',
        method: SignedURLsRequestMethod.PUT,
        jobToken: '',
        expectedStatus: 401,
      },
      {
        folderId: allowedFolderId,
        objectKey: 'this/is/the/test/test.txt',
        method: SignedURLsRequestMethod.PUT,
        jobToken: 'not-a-valid-jwt-token-at-all',
        expectedStatus: 401,
      },
      {
        folderId: allowedFolderId,
        objectKey: 'this/is/the/test/test.txt',
        method: SignedURLsRequestMethod.PUT,
        jobToken,
        expectedStatus: 200,
      },
      {
        folderId: allowedFolderId,
        objectKey: 'this/is/the/test/test.txt',
        method: SignedURLsRequestMethod.GET,
        jobToken,
        expectedStatus: 200,
      },
      {
        folderId: allowedFolderId,
        objectKey: 'this/is/the/test/deep/nested/path/file.json',
        method: SignedURLsRequestMethod.PUT,
        jobToken,
        expectedStatus: 200,
      },
      {
        folderId: allowedFolderId,
        objectKey: 'this/is/the/test/deep/nested/path/file.json',
        method: SignedURLsRequestMethod.GET,
        jobToken,
        expectedStatus: 200,
      },
      {
        folderId: allowedFolderId,
        objectKey: 'this/is/the/test/image.png',
        method: SignedURLsRequestMethod.PUT,
        jobToken,
        expectedStatus: 200,
      },
      {
        folderId: allowedFolderId,
        objectKey: 'this/is/the/test/image.png',
        method: SignedURLsRequestMethod.GET,
        jobToken,
        expectedStatus: 200,
      },
      {
        folderId: allowedFolderId,
        objectKey: 'this/is/the/test/data.csv',
        method: SignedURLsRequestMethod.PUT,
        jobToken,
        expectedStatus: 200,
      },
      {
        folderId: allowedFolderId,
        objectKey: 'this/is/the/test/data.csv',
        method: SignedURLsRequestMethod.GET,
        jobToken,
        expectedStatus: 200,
      },
      {
        folderId: allowedFolderId,
        objectKey: 'this/is/the/test/output/result.bin',
        method: SignedURLsRequestMethod.PUT,
        jobToken,
        expectedStatus: 200,
      },
      {
        folderId: allowedFolderId,
        objectKey: 'this/is/the/test/output/result.bin',
        method: SignedURLsRequestMethod.GET,
        jobToken,
        expectedStatus: 200,
      },
      {
        folderId: allowedFolderId,
        objectKey: 'this/is/the/test/file-with-dashes_and_underscores.txt',
        method: SignedURLsRequestMethod.PUT,
        jobToken,
        expectedStatus: 200,
      },
      {
        folderId: allowedFolderId,
        objectKey: 'this/is/the/test/file-with-dashes_and_underscores.txt',
        method: SignedURLsRequestMethod.GET,
        jobToken,
        expectedStatus: 200,
      },
      // Success cases for allowedFolderId2 with DELETE method
      {
        folderId: allowedFolderId2,
        objectKey: 'this/is/another/test',
        method: SignedURLsRequestMethod.DELETE,
        jobToken,
        expectedStatus: 200,
      },
      {
        folderId: allowedFolderId2,
        objectKey: 'this/is/another/test/file.txt',
        method: SignedURLsRequestMethod.DELETE,
        jobToken,
        expectedStatus: 200,
      },
      {
        folderId: allowedFolderId2,
        objectKey: 'this/is/another/test/deep/nested/path/file.json',
        method: SignedURLsRequestMethod.DELETE,
        jobToken,
        expectedStatus: 200,
      },
      {
        folderId: allowedFolderId2,
        objectKey: 'this/is/another/test/old-data.csv',
        method: SignedURLsRequestMethod.DELETE,
        jobToken,
        expectedStatus: 200,
      },
      {
        folderId: allowedFolderId2,
        objectKey: 'this/is/another/test/temp/output.bin',
        method: SignedURLsRequestMethod.DELETE,
        jobToken,
        expectedStatus: 200,
      },
      // Failure cases for allowedFolderId2
      {
        folderId: allowedFolderId2,
        objectKey: 'this/is/another/test/file.txt',
        method: SignedURLsRequestMethod.PUT,
        jobToken,
        expectedStatus: 403,
      },
      {
        folderId: allowedFolderId2,
        objectKey: 'this/is/another/test/file.txt',
        method: SignedURLsRequestMethod.GET,
        jobToken,
        expectedStatus: 403,
      },
      {
        folderId: allowedFolderId2,
        objectKey: 'wrong/prefix/file.txt',
        method: SignedURLsRequestMethod.DELETE,
        jobToken,
        expectedStatus: 403,
      },
      {
        folderId: allowedFolderId2,
        objectKey: 'this/is/another/file.txt',
        method: SignedURLsRequestMethod.DELETE,
        jobToken,
        expectedStatus: 403,
      },
      {
        folderId: allowedFolderId2,
        objectKey: 'this/is/another',
        method: SignedURLsRequestMethod.DELETE,
        jobToken,
        expectedStatus: 403,
      },
      {
        folderId: allowedFolderId2,
        objectKey: 'prefix/this/is/another/test/file.txt',
        method: SignedURLsRequestMethod.DELETE,
        jobToken,
        expectedStatus: 403,
      },
      {
        folderId: allowedFolderId2,
        objectKey: 'this/is/another/test/file.txt',
        method: SignedURLsRequestMethod.DELETE,
        jobToken: 'invalid-token',
        expectedStatus: 401,
      },
      {
        folderId: allowedFolderId2,
        objectKey: 'this/is/another/test/file.txt',
        method: SignedURLsRequestMethod.DELETE,
        jobToken: '',
        expectedStatus: 401,
      },
    ]

    for (const request of presignedUrlRequests) {
      const response = await _apiClient(request.jobToken).POST(
        `/api/v1/docker/jobs/{jobId}/request-presigned-urls`,
        {
          params: { path: { jobId } },
          body: [
            {
              folderId: request.folderId,
              objectKey: request.objectKey,
              method: request.method,
            },
          ],
        },
      )
      const _responseStatus = responseStatus(response)
      if (_responseStatus !== request.expectedStatus) {
        logger.error(`Presigned URL Request Failure:`, request)
      }

      expect(_responseStatus).toBe(request.expectedStatus)
      if (_responseStatus === 200) {
        expect(response.data).toEqual({
          urls: [
            {
              folderId: request.folderId,
              objectKey: request.objectKey,
              method: request.method,
              url: expect.any(String),
            },
          ],
        })
      }
    }

    const allowedPresignedUrlsResponse = await _apiClient(jobToken).POST(
      `/api/v1/docker/jobs/{jobId}/request-presigned-urls`,
      {
        params: { path: { jobId } },
        body: [
          {
            folderId: allowedFolderId,
            objectKey: 'this/is/the/test/something.txt',
            method: SignedURLsRequestMethod.PUT,
          },
        ],
      },
    )

    expect(responseStatus(allowedPresignedUrlsResponse)).toBe(200)
    expect(allowedPresignedUrlsResponse.data).toEqual({
      urls: [
        {
          folderId: allowedFolderId,
          objectKey: 'this/is/the/test/something.txt',
          method: SignedURLsRequestMethod.PUT,
          url: expect.any(String),
        },
      ],
    })

    // Test batch request with multiple valid URLs
    const batchValidResponse = await _apiClient(jobToken).POST(
      `/api/v1/docker/jobs/{jobId}/request-presigned-urls`,
      {
        params: { path: { jobId } },
        body: [
          {
            folderId: allowedFolderId,
            objectKey: 'this/is/the/test/batch1.txt',
            method: SignedURLsRequestMethod.PUT,
          },
          {
            folderId: allowedFolderId,
            objectKey: 'this/is/the/test/batch2.txt',
            method: SignedURLsRequestMethod.GET,
          },
          {
            folderId: allowedFolderId,
            objectKey: 'this/is/the/test/batch3.json',
            method: SignedURLsRequestMethod.PUT,
          },
        ],
      },
    )

    expect(responseStatus(batchValidResponse)).toBe(200)
    expect(batchValidResponse.data).toEqual({
      urls: [
        {
          folderId: allowedFolderId,
          objectKey: 'this/is/the/test/batch1.txt',
          method: SignedURLsRequestMethod.PUT,
          url: expect.any(String),
        },
        {
          folderId: allowedFolderId,
          objectKey: 'this/is/the/test/batch2.txt',
          method: SignedURLsRequestMethod.GET,
          url: expect.any(String),
        },
        {
          folderId: allowedFolderId,
          objectKey: 'this/is/the/test/batch3.json',
          method: SignedURLsRequestMethod.PUT,
          url: expect.any(String),
        },
      ],
    })

    // Test batch request with invalid URLs (should fail)
    const batchInvalidResponse = await _apiClient(jobToken).POST(
      `/api/v1/docker/jobs/{jobId}/request-presigned-urls`,
      {
        params: { path: { jobId } },
        body: [
          {
            folderId: deniedFolderId,
            objectKey: 'this/is/the/test/invalid.txt',
            method: SignedURLsRequestMethod.PUT,
          },
          {
            folderId: allowedFolderId,
            objectKey: 'wrong/prefix/invalid.txt',
            method: SignedURLsRequestMethod.PUT,
          },
          {
            folderId: allowedFolderId,
            objectKey: 'this/is/the/test/invalid.txt',
            method: SignedURLsRequestMethod.DELETE,
          },
        ],
      },
    )

    expect(responseStatus(batchInvalidResponse)).toBe(403)

    // Test batch request with invalid token (should fail)
    const batchInvalidTokenResponse = await _apiClient('invalid-token').POST(
      `/api/v1/docker/jobs/{jobId}/request-presigned-urls`,
      {
        params: { path: { jobId } },
        body: [
          {
            folderId: allowedFolderId,
            objectKey: 'this/is/the/test/valid.txt',
            method: SignedURLsRequestMethod.PUT,
          },
        ],
      },
    )

    expect(responseStatus(batchInvalidTokenResponse)).toBe(401)
  })

  it('should disallow queuing of an app task with an invalid access policy', async () => {
    const {
      session: { accessToken: folderOwnerAccessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const testFolder = await createTestFolder({
      testModule: testModule!,
      folderName: 'test-folder',
      accessToken: folderOwnerAccessToken,
      mockFiles: [],
      apiClient: testModule!.apiClient,
    })

    // const app = await testModule!.getAppService().getApp('testapp', {
    //   enabled: true,
    // })

    const userSettings = await testModule!
      .getOrmService()
      .db.query.appUserSettingsTable.findFirst({
        where: eq(appUserSettingsTable.appIdentifier, 'testapp'),
      })

    const folderSettings = await testModule!
      .getOrmService()
      .db.query.appFolderSettingsTable.findFirst({
        where: eq(appUserSettingsTable.appIdentifier, 'testapp'),
      })
    // console.log(
    //   JSON.stringify(
    //     {
    //       app,
    //       userSettings: userSettings ?? {},
    //       folderSettings: folderSettings ?? {},
    //     },
    //     null,
    //     2,
    //   ),
    // )
    expect(userSettings).toBeUndefined()
    expect(folderSettings).toBeUndefined()

    await testModule!
      .getOrmService()
      .db.update(appsTable)
      .set({
        userScopeEnabledDefault: true,
        folderScopeEnabledDefault: true,
      })
      .where(eq(appsTable.identifier, 'testapp'))

    const firstTry = await triggerAppDockerHandledTask(testModule!, {
      appIdentifier: 'testapp',
      taskIdentifier: 'non_triggered_docker_job_task',
      taskData: { myTaskData: 'test' },
      storageAccessPolicy: [
        {
          folderId: testFolder.folder.id,
          methods: [SignedURLsRequestMethod.GET],
          prefix: 'valid/prefix',
        },
      ],
      expectRecords: false,
    })
    expect(firstTry.queueTask.error).toBeNull()

    // set the app to not be allowed user access by default
    await testModule!
      .getOrmService()
      .db.update(appsTable)
      .set({
        userScopeEnabledDefault: false,
        folderScopeEnabledDefault: true,
      })
      .where(eq(appsTable.identifier, 'testapp'))
      .returning()

    await resetTestData()

    const {
      session: { accessToken: folderOwnerAccessToken2 },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const testFolder2 = await createTestFolder({
      testModule: testModule!,
      folderName: 'test-folder',
      accessToken: folderOwnerAccessToken2,
      mockFiles: [],
      apiClient: testModule!.apiClient,
    })

    const secondTry = await triggerAppDockerHandledTask(testModule!, {
      appIdentifier: 'testapp',
      taskIdentifier: 'non_triggered_docker_job_task',
      taskData: { myTaskData: 'test' },
      storageAccessPolicy: [
        {
          folderId: testFolder2.folder.id,
          methods: [SignedURLsRequestMethod.GET],
          prefix: 'valid/prefix',
        },
      ],
      expectRecords: false,
    })

    expect(secondTry.queueTask.error).toEqual({
      code: 'UnauthorizedException',
      message: `Unauthorized: app "testapp" is not enabled for folder "${testFolder2.folder.id}".`,
    })
  })

  it('should result in the storage access policy being encoded in the jobToken', async () => {
    const {
      session: { accessToken: folderOwnerAccessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const testFolder = await createTestFolder({
      testModule: testModule!,
      folderName: 'test-folder',
      accessToken: folderOwnerAccessToken,
      mockFiles: [],
      apiClient: testModule!.apiClient,
    })

    const storageAccessPolicyRule = {
      folderId: testFolder.folder.id,
      methods: [SignedURLsRequestMethod.PUT, SignedURLsRequestMethod.GET],
      prefix: 'valid/prefix',
    }

    await testModule!
      .getOrmService()
      .db.update(appsTable)
      .set({
        userScopeEnabledDefault: true,
        folderScopeEnabledDefault: true,
      })
      .where(eq(appsTable.identifier, 'testapp'))

    const { innerTask, taskQueueEvent } = await triggerAppDockerHandledTask(
      testModule!,
      {
        appIdentifier: 'testapp',
        taskIdentifier: 'non_triggered_docker_job_task',
        taskData: { myTaskData: 'test' },
        storageAccessPolicy: [storageAccessPolicyRule],
      },
    )

    expect(innerTask).toEqual({
      id: expect.any(String),
      ownerIdentifier: 'testapp',
      taskIdentifier: 'non_triggered_docker_job_task',
      taskDescription: 'Task that is handled by a docker job.',
      data: { myTaskData: 'test' },
      storageAccessPolicy: [storageAccessPolicyRule],
      dontStartBefore: null,
      systemLog: [],
      taskLog: [],
      trigger: {
        kind: 'event',
        data: {
          eventId: taskQueueEvent.id,
          eventIdentifier: `${PLATFORM_IDENTIFIER}:app_action:queue_app_task`,
          emitterIdentifier: PLATFORM_IDENTIFIER,
          eventData: {
            inputData: { myTaskData: 'test' },
            appIdentifier: 'testapp',
            taskIdentifier: 'non_triggered_docker_job_task',
            storageAccessPolicy: [storageAccessPolicyRule],
          },
        },
      },
      targetLocation: null,
      targetUserId: null,
      startedAt: null,
      completedAt: null,
      success: null,
      error: null,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      handlerType: 'docker',
      handlerIdentifier: 'dummy_profile_two:test_job_other',
    })

    const jobToken = execSpy.mock.calls[0][1].jobToken ?? ''
    const jobId = execSpy.mock.calls[0][1].jobId
    const claims = testModule!
      .getWorkerJobService()
      .verifyWorkerJobToken(jobToken, jobId)

    expect(claims.storageAccessPolicy).toEqual([storageAccessPolicyRule])
  })

  it('should have docker task started automatically and allow inner task starting via lifecycle endpoints', async () => {
    await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const { innerTask, dockerRunTask } = await triggerAppDockerHandledTask(
      testModule!,
      {
        appIdentifier: 'testapp',
        taskIdentifier: 'non_triggered_docker_job_task',
        taskData: { myTaskData: 'test' },
      },
    )

    const jobToken = execSpy.mock.calls[0][1].jobToken ?? ''
    const jobId = execSpy.mock.calls[0][1].jobId

    const startResponse = await _apiClient(jobToken).POST(
      `/api/v1/docker/jobs/{jobId}/start`,
      {
        params: { path: { jobId } },
      },
    )

    expect(responseStatus(startResponse)).toBe(200)

    const startedInnerTask = await testModule!
      .getOrmService()
      .db.query.tasksTable.findFirst({
        where: eq(tasksTable.id, innerTask.id),
      })

    expect(startedInnerTask?.completedAt).toBeFalsy()
    expect(startedInnerTask?.startedAt).toBeDefined()
    expect(startedInnerTask?.systemLog.length).toBe(1)
    expect(startedInnerTask?.systemLog.at(0)).toEqual({
      at: expect.any(String),
      payload: {
        logType: 'started',
        data: {
          dockerTaskId: dockerRunTask.id,
        },
      },
    })

    const completeResponse = await _apiClient(jobToken).POST(
      `/api/v1/docker/jobs/{jobId}/complete`,
      {
        params: { path: { jobId } },
        body: {
          success: true,
          result: { message: 'done' },
        },
      },
    )

    expect(responseStatus(completeResponse)).toBe(200)

    const completedInnerTask = await testModule!
      .getOrmService()
      .db.query.tasksTable.findFirst({
        where: eq(tasksTable.id, innerTask.id),
      })

    expect(completedInnerTask?.completedAt).toBeDefined()
    expect(completedInnerTask?.systemLog.length).toEqual(2)
    expect(completedInnerTask?.systemLog).toEqual([
      {
        at: expect.any(String),
        payload: {
          logType: 'started',
          data: {
            dockerTaskId: expect.any(String),
          },
        },
      },
      {
        at: expect.any(String),
        payload: {
          logType: 'success',
          data: {
            result: { message: 'done' },
          },
        },
      },
    ])

    const completedDockerTask = await testModule!
      .getOrmService()
      .db.query.tasksTable.findFirst({
        where: eq(tasksTable.id, dockerRunTask.id),
      })

    expect(completedDockerTask?.completedAt).toBeDefined()
    expect(completedDockerTask?.systemLog.length).toEqual(2)
    expect(completedDockerTask?.systemLog).toEqual([
      {
        at: expect.any(String),
        payload: {
          logType: 'started',
        },
      },
      {
        at: expect.any(String),
        payload: {
          logType: 'success',
        },
      },
    ])
  })

  it('should return unauthorized when lifecycle endpoints are called with an invalid token', async () => {
    const jobId = crypto.randomUUID()

    const startAttempt = await _apiClient('not-a-valid-token').POST(
      `/api/v1/docker/jobs/{jobId}/start`,
      {
        params: { path: { jobId } },
      },
    )
    expect([401, 403]).toContain(responseStatus(startAttempt))

    const completeAttempt = await _apiClient('not-a-valid-token').POST(
      `/api/v1/docker/jobs/{jobId}/complete`,
      {
        params: { path: { jobId } },
        body: { success: true, result: {}, uploadedFiles: [] },
      },
    )
    expect([401, 403]).toContain(responseStatus(completeAttempt))
  })
  afterAll(async () => {
    await testModule?.shutdown()
  })
})

/* eslint-enable @typescript-eslint/no-unsafe-assignment */
