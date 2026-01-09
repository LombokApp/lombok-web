/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import type {
  JsonSerializableObject,
  StorageAccessPolicy,
} from '@lombokapp/types'
import {
  CORE_IDENTIFIER,
  CoreEvent,
  SignedURLsRequestMethod,
} from '@lombokapp/types'
import { Logger } from '@nestjs/common'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  spyOn,
} from 'bun:test'
import { eq, notIlike } from 'drizzle-orm'
import { appsTable } from 'src/app/entities/app.entity'
import { appUserSettingsTable } from 'src/app/entities/app-user-settings.entity'
import { eventsTable } from 'src/event/entities/event.entity'
import { runWithThreadContext } from 'src/shared/thread-context'
import { tasksTable } from 'src/task/entities/task.entity'
import { CoreTaskName } from 'src/task/task.constants'
import { withTaskIdempotencyKey } from 'src/task/util/task-idempotency-key.util'
import type { TestApiClient, TestModule } from 'src/test/test.types'
import {
  buildTestModule,
  createTestFolder,
  createTestUser,
} from 'src/test/test.util'

import { DockerAdapterProvider } from '../services/client/adapters/docker-adapter.provider'
import { DockerError } from '../services/client/docker-client.types'
import {
  buildMockDockerAdapter,
  MockDockerAdapterProvider,
} from './docker.e2e-mocks'

const TEST_MODULE_KEY = 'docker_workers'
const TEST_APP_SLUG = 'testapp'
const responseStatus = (result: { response?: Response; error?: unknown }) =>
  result.response?.status ??
  (result as { error?: { status?: number } }).error?.status ??
  -1

const parseJobPayload = (
  payload: string,
  { expectJobToken = true }: { expectJobToken: boolean } = {
    expectJobToken: true,
  },
) => {
  try {
    const parsedPaylod = JSON.parse(
      atob(payload.split('--payload-base64=')[1] ?? '{}'),
    ) as Record<string, string> & {
      interface:
        | { kind?: string; listener?: { type: string; port: number } }
        | undefined
    }

    if (expectJobToken) {
      expect(parsedPaylod.job_token?.length).toBeGreaterThan(0)
      expect(parsedPaylod.platform_url?.length).toBeGreaterThan(0)
    } else {
      expect(parsedPaylod.job_token).toBeUndefined()
    }
    expect(parsedPaylod.job_id?.length).toBeGreaterThan(0)
    expect(parsedPaylod.job_class?.length).toBeGreaterThan(0)
    expect(parsedPaylod.interface?.kind).toBeDefined()
    if (parsedPaylod.interface?.kind === 'persistent_http') {
      expect(parsedPaylod.interface.listener?.port).toBeGreaterThan(0)
    } else if (parsedPaylod.interface?.kind === 'exec_per_job') {
      expect(parsedPaylod.interface.listener).toBeUndefined()
    } else {
      throw new Error('Unknown job interface kind')
    }
    expect(parsedPaylod.job_input).toBeDefined()

    return {
      ...(parsedPaylod.job_token && {
        jobToken: parsedPaylod.job_token,
        platformURL: parsedPaylod.platform_url,
      }),
      jobId: parsedPaylod.job_id ?? '',
      jobData: parsedPaylod.job_input ?? {},
      jobIdentifier: parsedPaylod.job_class ?? '',
      jobInterface: parsedPaylod.interface,
    }
  } catch (error) {
    throw new Error('Error parsing job payload', { cause: error })
  }
}

const insertTaskWithEvent = async (testModule: TestModule) => {
  const taskId = crypto.randomUUID()
  const eventId = crypto.randomUUID()
  const now = new Date()

  await testModule.services.ormService.db.insert(eventsTable).values({
    id: eventId,
    eventIdentifier: 'testapp:test_job',
    emitterIdentifier: await testModule.getAppIdentifierBySlug(TEST_APP_SLUG),
    data: {},
    createdAt: now,
  })

  const appIdentifier = await testModule.getAppIdentifierBySlug(TEST_APP_SLUG)
  await testModule.services.ormService.db.insert(tasksTable).values(
    withTaskIdempotencyKey({
      id: taskId,
      ownerIdentifier: appIdentifier,
      taskDescription: 'Test task',
      createdAt: now,
      updatedAt: now,
      handlerType: 'docker',
      handlerIdentifier: 'testapp:test_job',
      taskIdentifier: 'test_job_task',
      data: {},
      storageAccessPolicy: [],
      trigger: {
        kind: 'event',
        invokeContext: {
          eventIdentifier: 'testapp:test_job',
          eventTriggerConfigIndex: 0,
          eventId,
          emitterIdentifier:
            await testModule.getAppIdentifierBySlug(TEST_APP_SLUG),
          eventData: {},
        },
      },
    }),
  )

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
  await runWithThreadContext(crypto.randomUUID(), async () => {
    await testModule.services.taskService.triggerAppActionTask({
      appIdentifier,
      taskIdentifier,
      ...(storageAccessPolicy && { storageAccessPolicy }),
      taskData,
    })
  })

  const runnerTask =
    await testModule.services.ormService.db.query.tasksTable.findFirst({
      where: eq(tasksTable.taskIdentifier, 'run_docker_worker'),
    })

  // trigger drain and wait for runner task start
  if (runnerTask) {
    await testModule.waitForTasks('started', { taskIds: [runnerTask.id] })
  }

  const events = await testModule.services.ormService.db
    .select()
    .from(eventsTable)
    .where(
      notIlike(eventsTable.eventIdentifier, `${CORE_IDENTIFIER}:schedule:%`),
    )
  const tasks = await testModule.services.ormService.db
    .select()
    .from(tasksTable)
  const app = await testModule.services.appService.getApp(appIdentifier, {
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
    (task) => task.taskIdentifier === (CoreTaskName.RunDockerWorker as string),
  )

  // console.log('events', events)
  const dockerTaskEnqueuedEvent = events[0]

  if (expectRecords) {
    const profileIdentifier = taskDefinition.handler.identifier.split(':')[0]!
    const jobClassIdentifier = taskDefinition.handler.identifier.split(':')[1]!

    // logger.log('events', events)
    // logger.log('tasks', tasks)

    expect(dockerTaskEnqueuedEvent).toEqual({
      id: expect.any(String),
      eventIdentifier: CoreEvent.docker_task_enqueued,
      emitterIdentifier: CORE_IDENTIFIER,
      targetUserId: null,
      targetLocationFolderId: null,
      targetLocationObjectKey: null,
      data: {
        innerTaskId: expect.any(String),
        appIdentifier,
        dontStartBefore: null,
        profileIdentifier,
        jobClassIdentifier,
      },
      createdAt: expect.any(Date),
    })

    expect(dockerRunTask?.data.innerTaskId).toBeDefined()
    expect(dockerRunTask).toEqual({
      id: expect.any(String),
      ownerIdentifier: CORE_IDENTIFIER,
      taskIdentifier: 'run_docker_worker',
      taskDescription: 'Run a docker worker to execute a task',
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
          at: expect.any(Date),
          logType: 'started',
          message: 'Task is started',
        },
      ],
      taskLog: [],
      trigger: {
        kind: 'event',
        invokeContext: {
          eventIdentifier: CoreEvent.docker_task_enqueued,
          eventTriggerConfigIndex: 0,
          eventId: events[0]!.id,
          emitterIdentifier: CORE_IDENTIFIER,
          eventData: {
            innerTaskId: expect.any(String),
            appIdentifier,
            dontStartBefore: null,
            profileIdentifier,
            jobClassIdentifier,
          },
        },
      },
      idempotencyKey: expect.any(String),
      targetLocationFolderId: null,
      targetLocationObjectKey: null,
      targetUserId: null,
      attemptCount: 0,
      failureCount: 0,
      startedAt: expect.any(Date),
      completedAt: null,
      success: null,
      userVisible: true,
      error: null,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      handlerType: CORE_IDENTIFIER,
      handlerIdentifier: null,
    })
    expect(dockerRunTask?.startedAt).toEqual(dockerRunTask?.updatedAt)
  }
  return {
    innerTask: innerTask!,
    dockerRunTask: dockerRunTask!,
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
  const listContainersByLabelsSpy = spyOn(
    mockDockerAdapter,
    'listContainersByLabels',
  )
  const execSpy = spyOn(mockDockerAdapter, 'execInContainer')

  const resetTestData = async () => {
    execSpy.mockClear()
    getAdapterSpy.mockClear()
    createContainerSpy.mockClear()
    listContainersByLabelsSpy.mockClear()
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
    await testModule.installLocalAppBundles([TEST_APP_SLUG])
    const appsCount = await testModule.getInstalledAppsCount()

    if (appsCount !== 1) {
      throw new Error('Dummy test apps not installed (maybe invalid).')
    }
    _apiClient = testModule.apiClient
  })

  beforeEach(async () => {
    await testModule!.installLocalAppBundles([TEST_APP_SLUG])
  })

  afterEach(async () => {
    await resetTestData()
  })

  it(`should properly call the docker adapter when AppService.executeAppDockerJob(...) is called`, async () => {
    const {
      session: { accessToken: _testUserAccessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    execSpy.mockImplementation((_containerId, _options) => {
      return Promise.resolve({
        getError: () =>
          Promise.resolve(new DockerError('UNKNOWN_ERROR', 'Unknown error')),
        output: () => ({ stdout: '', stderr: '' }),
        state: () => Promise.resolve({ running: false, exitCode: 0 }),
      })
    })

    await testModule?.services.appService.executeAppDockerJob({
      appIdentifier: await testModule.getAppIdentifierBySlug(TEST_APP_SLUG),
      profileIdentifier: 'dummy_profile',
      jobIdentifier: 'test_job',
      jobData: {},
    })

    expect(execSpy).toHaveBeenCalledWith('1', {
      command: ['lombok-worker-agent', 'run-job', expect.any(String)],
    })

    expect(execSpy.mock.calls[0]).toEqual([
      '1',
      { command: ['lombok-worker-agent', 'run-job', expect.any(String)] },
    ])

    expect(execSpy.mock.calls[1]).toEqual([
      '1',
      {
        command: [
          'lombok-worker-agent',
          'job-state',
          '--job-id',
          expect.any(String),
        ],
      },
    ])

    const payload = parseJobPayload(
      execSpy.mock.calls[0]![1].command.at(-1) ?? '',
      {
        expectJobToken: false,
      },
    )

    expect(payload).toEqual({
      jobId: expect.any(String),
      jobIdentifier: 'test_job',
      jobInterface: { kind: 'exec_per_job' },
      jobData: {},
    })

    const createContainerCall = createContainerSpy.mock.calls[0]!

    expect(createContainerCall[0]).toEqual({
      gpus: {
        deviceIds: ['0'],
        driver: 'nvidia',
      },
      image: 'dummy-namespace/dummy-image',
      labels: {
        'lombok.platform': 'lombok',
        'lombok.profile_hash': '59da6c5f',
        'lombok.profile_id': `lombok:profile_${await testModule!.getAppIdentifierBySlug(TEST_APP_SLUG)}:dummy_profile`,
      },
      volumes: ['/app/model_cache:/mnt/user/appdata/somepath'],
    })

    await testModule?.services.appService.executeAppDockerJob({
      appIdentifier: await testModule.getAppIdentifierBySlug(TEST_APP_SLUG),
      profileIdentifier: 'dummy_profile_two',
      jobIdentifier: 'test_job_other',
      jobData: {},
    })

    const execCall2 = execSpy.mock.calls[2]!

    expect(execCall2).toEqual([
      '1',
      { command: ['lombok-worker-agent', 'run-job', expect.any(String)] },
    ])
    const payload2 = parseJobPayload(execCall2[1].command.at(-1) ?? '', {
      expectJobToken: false,
    })

    expect(payload2).toEqual({
      jobId: expect.any(String),
      jobIdentifier: 'test_job_other',
      jobInterface: { kind: 'exec_per_job' },
      jobData: {},
    })
  })

  it('should call exec with waitForCompletion=true when no asyncTaskId is provided', async () => {
    await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    execSpy.mockImplementation((_containerId, _options) => {
      return Promise.resolve({
        getError: () =>
          Promise.resolve(new DockerError('UNKNOWN_ERROR', 'Unknown error')),
        output: () => ({ stdout: '', stderr: '' }),
        state: () => Promise.resolve({ running: false, exitCode: 0 }),
      })
    })

    await testModule?.services.appService.executeAppDockerJob({
      appIdentifier: await testModule.getAppIdentifierBySlug(TEST_APP_SLUG),
      profileIdentifier: 'dummy_profile',
      jobIdentifier: 'test_job',
      jobData: { foo: 'bar' },
    })

    const execCall = execSpy.mock.calls[0]!

    expect(execCall).toEqual([
      '1',
      { command: ['lombok-worker-agent', 'run-job', expect.any(String)] },
    ])
    const payload = parseJobPayload(execCall[1].command.at(-1) ?? '', {
      expectJobToken: false,
    })
    expect(payload).toEqual({
      jobId: expect.any(String),
      jobIdentifier: 'test_job',
      jobInterface: { kind: 'exec_per_job' },
      jobData: { foo: 'bar' },
    })

    const createContainerCall = createContainerSpy.mock.calls[0]!

    expect(createContainerCall[0]).toEqual({
      image: 'dummy-namespace/dummy-image',
      volumes: ['/app/model_cache:/mnt/user/appdata/somepath'],
      gpus: {
        deviceIds: ['0'],
        driver: 'nvidia',
      },
      labels: {
        'lombok.platform': 'lombok',
        'lombok.profile_hash': '59da6c5f',
        'lombok.profile_id': `lombok:profile_${await testModule!.getAppIdentifierBySlug(TEST_APP_SLUG)}:dummy_profile`,
      },
      networkMode: undefined,
    })
  })

  it('should return an error when submitting a job with an invalid interface', async () => {
    await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    execSpy.mockImplementationOnce(() =>
      Promise.resolve({
        getError: () =>
          Promise.resolve({
            code: 'UNKNOWN_INTERFACE_KIND',
            message: 'unknown interface kind: invalid_kind',
            name: 'DockerError',
          }),
        output: () => ({
          stdout: '',
          stderr: 'unknown interface kind: invalid_kind',
        }),
        state: () =>
          Promise.resolve({
            running: false,
            exitCode: 1,
          }),
      }),
    )

    expect(
      testModule?.services.appService.executeAppDockerJob({
        appIdentifier: await testModule.getAppIdentifierBySlug(TEST_APP_SLUG),
        profileIdentifier: 'dummy_profile',
        jobIdentifier: 'test_job',
        jobData: {},
      }),
    ).resolves.toEqual({
      jobId: expect.any(String),
      submitError: {
        code: 'SUBMISSION_ERROR',
        message:
          'Job submission failed with error: [UNKNOWN_INTERFACE_KIND] Message: unknown interface kind: invalid_kind',
      },
    })
  })

  it('should reject completion when the task has not been started', async () => {
    await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    const { taskId } = await insertTaskWithEvent(testModule!)

    execSpy.mockImplementation((_containerId, _options) => {
      return Promise.resolve({
        getError: () =>
          Promise.resolve(new DockerError('UNKNOWN_ERROR', 'Unknown error')),
        output: () => ({ stdout: '', stderr: '' }),
        state: () => Promise.resolve({ running: false, exitCode: 0 }),
      })
    })

    await testModule?.services.appService.executeAppDockerJob({
      appIdentifier: await testModule.getAppIdentifierBySlug(TEST_APP_SLUG),
      profileIdentifier: 'dummy_profile',
      jobIdentifier: 'test_job',
      jobData: {},
      asyncTaskId: taskId,
    })

    const payload = execSpy.mock.calls[0]![1].command.at(-1)
    const parsedPayload = parseJobPayload(payload ?? '')

    const completeAttempt = await _apiClient(parsedPayload.jobToken).POST(
      `/api/v1/docker/jobs/{jobId}/complete`,
      {
        params: {
          path: { jobId: parsedPayload.jobId },
        },
        body: {
          success: true,
          result: { message: 'should fail' },
          outputFiles: [],
        },
      },
    )

    expect(responseStatus(completeAttempt)).toBe(403)

    const task =
      await testModule!.services.ormService.db.query.tasksTable.findFirst({
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

    execSpy.mockImplementation((_containerId, _options) => {
      return Promise.resolve({
        getError: () =>
          Promise.resolve(new DockerError('UNKNOWN_ERROR', 'Unknown error')),
        output: () => ({
          stdout:
            _options.command[1] === 'job-state'
              ? `{"job_id": "${_options.command.at(-1)}", "job_class": "test_job", "status": "complete", "success": true, "started_at": "${new Date().toISOString()}"}`
              : '',
          stderr: '',
        }),
        state: () => Promise.resolve({ running: false, exitCode: 0 }),
      })
    })

    const { dockerRunTask } = await triggerAppDockerHandledTask(testModule!, {
      appIdentifier: await testModule!.getAppIdentifierBySlug(TEST_APP_SLUG),
      taskIdentifier: 'non_triggered_docker_worker_task',
      taskData: { myTaskData: 'test' },
    })

    const parsedPayload = parseJobPayload(
      execSpy.mock.calls[0]![1].command.at(-1) ?? '',
    )
    const claims = testModule!.services.workerJobService.verifyWorkerJobToken(
      parsedPayload.jobToken!,
      parsedPayload.jobId,
    )

    expect(claims.jobId).toBe(parsedPayload.jobId)
    expect(claims.taskId).toBe(dockerRunTask.id)
    expect(claims.storageAccessPolicy).toEqual([])
  })

  it('should create an unstarted app task when a docker handled app task is queued', async () => {
    await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    execSpy.mockImplementation((_containerId, _options) => {
      return Promise.resolve({
        getError: () =>
          Promise.resolve(new DockerError('UNKNOWN_ERROR', 'Unknown error')),
        output: () => ({
          stdout:
            _options.command[1] === 'job-state'
              ? `{"job_id": "${_options.command.at(-1)}", "job_class": "test_job", "status": "complete", "success": true, "started_at": "${new Date().toISOString()}"}`
              : '',
          stderr: '',
        }),
        state: () => Promise.resolve({ running: false, exitCode: 0 }),
      })
    })
    const { innerTask } = await triggerAppDockerHandledTask(testModule!, {
      appIdentifier: await testModule!.getAppIdentifierBySlug(TEST_APP_SLUG),
      taskIdentifier: 'non_triggered_docker_worker_task',
      taskData: { myTaskData: 'test' },
    })

    const appIdentifier =
      await testModule!.getAppIdentifierBySlug(TEST_APP_SLUG)
    expect(innerTask).toEqual({
      id: expect.any(String),
      ownerIdentifier: appIdentifier,
      taskIdentifier: 'non_triggered_docker_worker_task',
      taskDescription: 'Task that is handled by a docker worker.',
      data: { myTaskData: 'test' },
      storageAccessPolicy: [],
      dontStartBefore: null,
      systemLog: [],
      taskLog: [],
      trigger: {
        kind: 'app_action',
        invokeContext: {
          requestId: expect.any(String),
        },
      },
      idempotencyKey: expect.any(String),
      targetLocationFolderId: null,
      targetLocationObjectKey: null,
      targetUserId: null,
      attemptCount: 0,
      failureCount: 0,
      startedAt: null,
      completedAt: null,
      userVisible: true,
      success: null,
      error: null,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      handlerType: 'docker',
      handlerIdentifier: 'dummy_profile_two:test_job_other',
    })
  })

  it('should be accept and respect a provided storageAccessPolicy', async () => {
    await testModule!.installLocalAppBundles([TEST_APP_SLUG])
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

    await testModule!.services.ormService.db
      .update(appsTable)
      .set({
        userScopeEnabledDefault: true,
        folderScopeEnabledDefault: true,
      })
      .where(
        eq(
          appsTable.identifier,
          await testModule!.getAppIdentifierBySlug(TEST_APP_SLUG),
        ),
      )

    execSpy.mockImplementation((_containerId, _options) => {
      return Promise.resolve({
        getError: () =>
          Promise.resolve(new DockerError('UNKNOWN_ERROR', 'Unknown error')),
        output: () => ({
          stdout:
            _options.command[1] === 'job-state'
              ? `{"job_id": "${_options.command.at(-1)}", "job_class": "test_job", "status": "complete", "success": true, "started_at": "${new Date().toISOString()}"}`
              : '',
          stderr: '',
        }),
        state: () => Promise.resolve({ running: false, exitCode: 0 }),
      })
    })
    const { innerTask } = await triggerAppDockerHandledTask(testModule!, {
      appIdentifier: await testModule!.getAppIdentifierBySlug(TEST_APP_SLUG),
      taskIdentifier: 'non_triggered_docker_worker_task',
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
    })

    const appIdentifier =
      await testModule!.getAppIdentifierBySlug(TEST_APP_SLUG)
    expect(innerTask).toEqual({
      id: expect.any(String),
      ownerIdentifier: appIdentifier,
      taskIdentifier: 'non_triggered_docker_worker_task',
      taskDescription: 'Task that is handled by a docker worker.',
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
        kind: 'app_action',
        invokeContext: {
          requestId: expect.any(String),
        },
      },
      idempotencyKey: expect.any(String),
      userVisible: true,
      targetLocationFolderId: null,
      targetLocationObjectKey: null,
      targetUserId: null,
      attemptCount: 0,
      failureCount: 0,
      startedAt: null,
      completedAt: null,
      success: null,
      error: null,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      handlerType: 'docker',
      handlerIdentifier: 'dummy_profile_two:test_job_other',
    })

    const parsedPayload = parseJobPayload(
      execSpy.mock.calls[0]![1].command.at(-1) ?? '',
    )
    const jobToken = parsedPayload.jobToken
    const jobId = parsedPayload.jobId

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
        logger.error(
          `Presigned URL request, index[${presignedUrlRequests.indexOf(request)}], failed (expected ${request.expectedStatus}, got ${_responseStatus}):`,
          request,
          response,
        )
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

  it('should disallow triggering of an app task with an invalid access policy', async () => {
    await testModule!.installLocalAppBundles([TEST_APP_SLUG])
    const {
      session: { accessToken: folderOwnerAccessToken },
    } = await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    execSpy.mockImplementation((_containerId, _options) => {
      return Promise.resolve({
        getError: () =>
          Promise.resolve(new DockerError('UNKNOWN_ERROR', 'Unknown error')),
        output: () => ({
          stdout:
            _options.command[1] === 'job-state'
              ? `{"job_id": "${_options.command.at(-1)}", "job_class": "test_job", "status": "complete", "success": true, "started_at": "${new Date().toISOString()}"}`
              : '',
          stderr: '',
        }),
        state: () => Promise.resolve({ running: false, exitCode: 0 }),
      })
    })
    const testFolder = await createTestFolder({
      testModule: testModule!,
      folderName: 'test-folder',
      accessToken: folderOwnerAccessToken,
      mockFiles: [],
      apiClient: testModule!.apiClient,
    })

    const userSettings =
      await testModule!.services.ormService.db.query.appUserSettingsTable.findFirst(
        {
          where: eq(
            appUserSettingsTable.appIdentifier,
            await testModule!.getAppIdentifierBySlug(TEST_APP_SLUG),
          ),
        },
      )

    const folderSettings =
      await testModule!.services.ormService.db.query.appFolderSettingsTable.findFirst(
        {
          where: eq(
            appUserSettingsTable.appIdentifier,
            await testModule!.getAppIdentifierBySlug(TEST_APP_SLUG),
          ),
        },
      )

    expect(userSettings).toBeUndefined()
    expect(folderSettings).toBeUndefined()

    await testModule!.services.ormService.db
      .update(appsTable)
      .set({
        userScopeEnabledDefault: true,
        folderScopeEnabledDefault: true,
      })
      .where(
        eq(
          appsTable.identifier,
          await testModule!.getAppIdentifierBySlug(TEST_APP_SLUG),
        ),
      )

    const firstTry = await triggerAppDockerHandledTask(testModule!, {
      appIdentifier: await testModule!.getAppIdentifierBySlug(TEST_APP_SLUG),
      taskIdentifier: 'non_triggered_docker_worker_task',
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
    expect(firstTry.dockerRunTask.error).toBeNull()

    // set the app to not be allowed user access by default
    await testModule!.services.ormService.db
      .update(appsTable)
      .set({
        userScopeEnabledDefault: false,
        folderScopeEnabledDefault: true,
      })
      .where(
        eq(
          appsTable.identifier,
          await testModule!.getAppIdentifierBySlug(TEST_APP_SLUG),
        ),
      )
      .returning()

    await resetTestData()
    await testModule!.installLocalAppBundles([TEST_APP_SLUG])

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

    const triggerAppTask = triggerAppDockerHandledTask(testModule!, {
      appIdentifier: await testModule!.getAppIdentifierBySlug(TEST_APP_SLUG),
      taskIdentifier: 'non_triggered_docker_worker_task',
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
    expect(triggerAppTask).rejects.toThrow(
      `Unauthorized: app "${await testModule!.getAppIdentifierBySlug(TEST_APP_SLUG)}" is not enabled for folder "${testFolder2.folder.id}".`,
    )
  })

  it('should result in the storage access policy being encoded in the jobToken', async () => {
    await testModule!.installLocalAppBundles([TEST_APP_SLUG])
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

    await testModule!.services.ormService.db
      .update(appsTable)
      .set({
        userScopeEnabledDefault: true,
        folderScopeEnabledDefault: true,
      })
      .where(
        eq(
          appsTable.identifier,
          await testModule!.getAppIdentifierBySlug(TEST_APP_SLUG),
        ),
      )

    execSpy.mockImplementation((_containerId, _options) => {
      return Promise.resolve({
        getError: () =>
          Promise.resolve(new DockerError('UNKNOWN_ERROR', 'Unknown error')),
        output: () => ({
          stdout:
            _options.command[1] === 'job-state'
              ? `{"job_id": "${_options.command.at(-1)}", "job_class": "test_job", "status": "complete", "success": true, "started_at": "${new Date().toISOString()}"}`
              : '',
          stderr: '',
        }),
        state: () => Promise.resolve({ running: false, exitCode: 0 }),
      })
    })
    const { innerTask } = await triggerAppDockerHandledTask(testModule!, {
      appIdentifier: await testModule!.getAppIdentifierBySlug(TEST_APP_SLUG),
      taskIdentifier: 'non_triggered_docker_worker_task',
      taskData: { myTaskData: 'test' },
      storageAccessPolicy: [storageAccessPolicyRule],
    })

    const appIdentifier =
      await testModule!.getAppIdentifierBySlug(TEST_APP_SLUG)
    expect(innerTask).toEqual({
      id: expect.any(String),
      ownerIdentifier: appIdentifier,
      taskIdentifier: 'non_triggered_docker_worker_task',
      taskDescription: 'Task that is handled by a docker worker.',
      data: { myTaskData: 'test' },
      storageAccessPolicy: [storageAccessPolicyRule],
      dontStartBefore: null,
      systemLog: [],
      taskLog: [],
      trigger: {
        kind: 'app_action',
        invokeContext: {
          requestId: expect.any(String),
        },
      },
      idempotencyKey: expect.any(String),
      targetLocationFolderId: null,
      targetLocationObjectKey: null,
      userVisible: true,
      targetUserId: null,
      attemptCount: 0,
      failureCount: 0,
      startedAt: null,
      completedAt: null,
      success: null,
      error: null,
      createdAt: expect.any(Date),
      updatedAt: expect.any(Date),
      handlerType: 'docker',
      handlerIdentifier: 'dummy_profile_two:test_job_other',
    })

    const parsedPayload = parseJobPayload(
      execSpy.mock.calls[0]![1].command.at(-1) ?? '',
    )
    const jobToken = parsedPayload.jobToken
    const jobId = parsedPayload.jobId
    const claims = testModule!.services.workerJobService.verifyWorkerJobToken(
      jobToken ?? '',
      jobId,
    )

    expect(claims.storageAccessPolicy).toEqual([storageAccessPolicyRule])
  })

  it('should have docker task started automatically and allow inner task starting via lifecycle endpoints', async () => {
    await createTestUser(testModule!, {
      username: 'testuser',
      password: '123',
    })

    execSpy.mockImplementation((_containerId, _options) => {
      return Promise.resolve({
        getError: () =>
          Promise.resolve(new DockerError('UNKNOWN_ERROR', 'Unknown error')),
        output: () => ({
          stdout:
            _options.command[1] === 'job-state'
              ? `{"job_id": "${_options.command.at(-1)}", "job_class": "test_job", "status": "complete", "success": true, "started_at": "${new Date().toISOString()}"}`
              : '',
          stderr: '',
        }),
        state: () => Promise.resolve({ running: false, exitCode: 0 }),
      })
    })
    const { innerTask, dockerRunTask } = await triggerAppDockerHandledTask(
      testModule!,
      {
        appIdentifier: await testModule!.getAppIdentifierBySlug(TEST_APP_SLUG),
        taskIdentifier: 'non_triggered_docker_worker_task',
        taskData: { myTaskData: 'test' },
      },
    )

    const parsedPayload = parseJobPayload(
      execSpy.mock.calls[0]![1].command.at(-1) ?? '',
    )
    const jobToken = parsedPayload.jobToken
    const jobId = parsedPayload.jobId

    const startResponse = await _apiClient(jobToken).POST(
      `/api/v1/docker/jobs/{jobId}/start`,
      {
        params: { path: { jobId } },
      },
    )

    expect(responseStatus(startResponse)).toBe(200)

    const startedInnerTask =
      await testModule!.services.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.id, innerTask.id),
      })

    expect(startedInnerTask?.completedAt).toBeFalsy()
    expect(startedInnerTask?.startedAt).toBeDefined()
    expect(startedInnerTask?.systemLog.length).toBe(1)
    expect(startedInnerTask?.systemLog.at(0)).toEqual({
      at: expect.any(Date),
      logType: 'started',
      message: 'Task is started',
      payload: {
        __executor: {
          jobIdentifier: 'test_job_other',
          profileHash: '679f45ae',
          profileKey: `${await testModule!.getAppIdentifierBySlug(TEST_APP_SLUG)}:dummy_profile_two`,
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

    const completedInnerTask =
      await testModule!.services.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.id, innerTask.id),
      })

    expect(completedInnerTask?.completedAt).toBeDefined()
    expect(completedInnerTask?.systemLog.length).toEqual(2)
    expect(completedInnerTask?.systemLog).toEqual([
      {
        at: expect.any(Date),
        logType: 'started',
        message: 'Task is started',
        payload: {
          __executor: {
            jobIdentifier: 'test_job_other',
            profileHash: '679f45ae',
            profileKey: `${await testModule!.getAppIdentifierBySlug(TEST_APP_SLUG)}:dummy_profile_two`,
          },
        },
      },
      {
        at: expect.any(Date),
        logType: 'success',
        message: 'Task completed successfully',
        payload: {
          result: { message: 'done' },
        },
      },
    ])

    const completedDockerTask =
      await testModule!.services.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.id, dockerRunTask.id),
      })

    expect(completedDockerTask?.completedAt).toBeDefined()
    expect(completedDockerTask?.systemLog.length).toEqual(2)
    expect(completedDockerTask?.systemLog).toEqual([
      {
        at: expect.any(Date),
        logType: 'started',
        message: 'Task is started',
      },
      {
        at: expect.any(Date),
        logType: 'success',
        message: 'Task completed successfully',
        payload: {
          result: {
            message: 'done',
          },
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
        body: { success: true, result: {}, outputFiles: [] },
      },
    )
    expect([401, 403]).toContain(responseStatus(completeAttempt))
  })
  afterAll(async () => {
    await testModule?.shutdown()
  })
})

/* eslint-enable @typescript-eslint/no-unsafe-assignment */
