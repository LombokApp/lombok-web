import {
  JsonSerializableObject,
  PLATFORM_IDENTIFIER,
  RequeueConfig,
  StorageAccessPolicy,
  SystemLogEntry,
  TaskOnCompleteConfig,
} from '@lombokapp/types'
import { addMs } from '@lombokapp/utils'
import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import {
  and,
  asc,
  count,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  ne,
  or,
  SQL,
  sql,
} from 'drizzle-orm'
import { appsTable } from 'src/app/entities/app.entity'
import { AppService } from 'src/app/services/app.service'
import { EventService } from 'src/event/services/event.service'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { FolderService } from 'src/folders/services/folder.service'
import { OrmService } from 'src/orm/orm.service'
import { dataFromTemplate } from 'src/platform/utils/data-template.util'
import { normalizeSortParam, parseSort } from 'src/platform/utils/sort.util'
import { AppSocketService } from 'src/socket/app/app-socket.service'
import type { User } from 'src/users/entities/user.entity'

import { FolderTasksListQueryParamsDTO } from '../dto/folder-tasks-list-query-params.dto'
import { TasksListQueryParamsDTO } from '../dto/tasks-list-query-params.dto'
import type { NewTask, Task } from '../entities/task.entity'
import { tasksTable } from '../entities/task.entity'
import {
  evalOnCompleteHandlerCondition,
  OnCompleteConditionTaskContext,
} from '../util/eval-oncomplete-condition.util'

export enum TaskSort {
  CreatedAtAsc = 'createdAt-asc',
  CreatedAtDesc = 'createdAt-desc',
  UpdatedAtAsc = 'updatedAt-asc',
  UpdatedAtDesc = 'updatedAt-desc',
  StartedAtAsc = 'startedAt-asc',
  StartedAtDesc = 'startedAt-desc',
  CompletedAtAsc = 'completedAt-asc',
  CompletedAtDesc = 'completedAt-desc',
}

@Injectable()
export class TaskService {
  appService: AppService
  appSocketService: AppSocketService
  folderService: FolderService
  eventService: EventService
  private readonly logger = new Logger(TaskService.name)

  constructor(
    private readonly ormService: OrmService,
    @Inject(forwardRef(() => AppSocketService))
    _appSocketService,
    @Inject(forwardRef(() => EventService))
    _eventService,
    @Inject(forwardRef(() => AppService))
    _appService,
    @Inject(forwardRef(() => FolderService))
    _folderService,
  ) {
    this.appService = _appService as AppService
    this.folderService = _folderService as FolderService
    this.appSocketService = _appSocketService as AppSocketService
    this.eventService = _eventService as EventService
  }

  async getFolderTaskAsUser(
    actor: User,
    { folderId, taskId }: { folderId: string; taskId: string },
  ): Promise<Task & { folder?: { name: string; ownerId: string } }> {
    await this.folderService.getFolderAsUser(actor, folderId)
    const targetFolderId = sql<string>`(${tasksTable.targetLocation} ->> 'folderId')::uuid`
    const result = await this.ormService.db
      .select({
        task: tasksTable,
        folderName: foldersTable.name,
        folderOwnerId: foldersTable.ownerId,
      })
      .from(tasksTable)
      .leftJoin(foldersTable, eq(foldersTable.id, targetFolderId))
      .where(and(eq(tasksTable.id, taskId), eq(targetFolderId, folderId)))
      .limit(1)

    const record = result.at(0)
    if (!record) {
      throw new NotFoundException()
    }
    return {
      ...record.task,
      folder: record.folderName
        ? { name: record.folderName, ownerId: record.folderOwnerId }
        : undefined,
    } as Task & { folder?: { name: string; ownerId: string } }
  }

  async listFolderTasksAsUser(
    actor: User,
    { folderId }: { folderId: string },
    queryParams: FolderTasksListQueryParamsDTO,
  ) {
    await this.folderService.getFolderAsUser(actor, folderId)
    return this.listTasks({
      ...queryParams,
      folderId,
    })
  }

  listTasksAsAdmin(actor: User, queryParams: TasksListQueryParamsDTO) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    return this.listTasks(queryParams)
  }

  async getTaskAsAdmin(
    actor: User,
    taskId: string,
  ): Promise<Task & { folder?: { name: string; ownerId: string } }> {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    const targetFolderId = sql<string>`(${tasksTable.targetLocation} ->> 'folderId')::uuid`
    const result = await this.ormService.db
      .select({
        task: tasksTable,
        folderName: foldersTable.name,
        folderOwnerId: foldersTable.ownerId,
      })
      .from(tasksTable)
      .leftJoin(foldersTable, eq(foldersTable.id, targetFolderId))
      .where(eq(tasksTable.id, taskId))
      .limit(1)
    const record = result.at(0)
    if (!record) {
      throw new NotFoundException()
    }
    return {
      ...record.task,
      folder: record.folderName
        ? { name: record.folderName, ownerId: record.folderOwnerId }
        : undefined,
    } as Task & { folder?: { name: string; ownerId: string } }
  }

  async listTasks({
    offset,
    limit,
    search,
    sort = [TaskSort.CreatedAtAsc],
    objectKey,
    includeComplete,
    includeFailed,
    includeRunning,
    includeWaiting,
    folderId,
  }: TasksListQueryParamsDTO) {
    const targetFolderId = sql<string>`(${tasksTable.targetLocation} ->> 'folderId')::uuid`
    const targetObjectKey = sql<string>`${tasksTable.targetLocation} ->> 'objectKey'`
    const conditions: (SQL | undefined)[] = []
    if (folderId) {
      conditions.push(eq(targetFolderId, folderId))
    }

    if (search) {
      conditions.push(
        or(
          ilike(tasksTable.taskIdentifier, `%${search}%`),
          ilike(tasksTable.error, `%${search}%`),
        ),
      )
    }

    const statusFilters = ([] as (SQL | undefined)[])
      .concat(
        includeComplete
          ? [
              and(
                isNotNull(tasksTable.completedAt),
                eq(tasksTable.success, true),
              ),
            ]
          : [],
      )
      .concat(
        includeFailed
          ? [and(isNotNull(tasksTable.error), eq(tasksTable.success, false))]
          : [],
      )
      .concat(includeWaiting ? [isNull(tasksTable.startedAt)] : [])
      .concat(
        includeRunning
          ? [
              and(
                isNull(tasksTable.completedAt),
                isNotNull(tasksTable.startedAt),
              ),
            ]
          : [],
      )
    if (statusFilters.length) {
      conditions.push(or(...statusFilters))
    }

    if (objectKey) {
      conditions.push(eq(targetObjectKey, objectKey))
    }

    const tasks = await this.ormService.db
      .select({
        task: tasksTable,
        folderName: foldersTable.name,
        folderOwnerId: foldersTable.ownerId,
      })
      .from(tasksTable)
      .leftJoin(foldersTable, eq(foldersTable.id, targetFolderId))
      .where(conditions.length ? and(...conditions) : undefined)
      .offset(Math.max(0, offset ?? 0))
      .limit(Math.min(100, limit ?? 25))
      .orderBy(
        ...parseSort(
          tasksTable,
          normalizeSortParam(sort) ?? [TaskSort.CreatedAtAsc],
        ),
      )

    const tasksCountResult = await this.ormService.db
      .select({
        count: count(),
      })
      .from(tasksTable)
      .where(conditions.length ? and(...conditions) : undefined)

    return {
      result: tasks.map(({ task, folderName, folderOwnerId }) => ({
        ...task,
        folder:
          task.targetLocation?.folderId && folderName
            ? { name: folderName, ownerId: folderOwnerId }
            : undefined,
      })),
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      meta: { totalCount: tasksCountResult[0]!.count },
    }
  }

  async handlePendingTasks() {
    const pendingTasks = await this.ormService.db
      .select({
        taskIdentifier: tasksTable.taskIdentifier,
        ownerIdentifier: tasksTable.ownerIdentifier,
        count: sql<number>`cast(count(${tasksTable.id}) as int)`,
      })
      .from(tasksTable)
      .innerJoin(
        appsTable,
        eq(tasksTable.ownerIdentifier, appsTable.identifier),
      )
      .where(
        and(
          isNull(tasksTable.startedAt),
          eq(tasksTable.handlerType, 'external'),
          ne(tasksTable.ownerIdentifier, PLATFORM_IDENTIFIER),
          eq(appsTable.enabled, true),
        ),
      )
      .groupBy(tasksTable.taskIdentifier, tasksTable.ownerIdentifier)
    const pendingTasksByApp = pendingTasks.reduce<
      Record<string, Record<string, number>>
    >((acc, next) => {
      return {
        ...acc,
        [next.ownerIdentifier]: {
          ...(next.ownerIdentifier in acc ? acc[next.ownerIdentifier] : {}),
          [next.taskIdentifier]: next.count,
        },
      }
    }, {})

    for (const appIdentifier of Object.keys(pendingTasksByApp)) {
      for (const taskIdentifier of Object.keys(
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        pendingTasksByApp[appIdentifier]!,
      )) {
        const pendingTaskCount =
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          pendingTasksByApp[appIdentifier]![taskIdentifier]!
        this.appSocketService.notifyAppWorkersOfPendingTasks(
          appIdentifier,
          taskIdentifier,
          pendingTaskCount,
        )
      }
    }
  }

  /**
   * Used to trigger a platform task on request from a user.
   *
   * @param userId - The user ID triggering the task.
   * @param taskIdentifier - The identifier of the platform task to trigger.
   * @param taskData - The data to pass to the task (must be serializable).
   * @param dontStartBefore - The time before which the task should not start.
   * @param targetUserId - The user ID to relate the task to.
   * @param targetLocation - The folderId and possibly objectKey to relate the task to.
   *
   ** @returns The created task record.
   */
  async triggerPlatformUserActionTask({
    userId,
    taskIdentifier,
    taskData,
    dontStartBefore,
    targetUserId,
    targetLocation,
    storageAccessPolicy,
  }: {
    userId: string
    taskIdentifier: string
    taskData: JsonSerializableObject
    dontStartBefore?: { timestamp: Date } | { delayMs: number }
    targetUserId?: string
    targetLocation?: { folderId: string; objectKey?: string }
    storageAccessPolicy?: StorageAccessPolicy
  }) {
    const now = new Date()
    const newTask: NewTask = {
      id: crypto.randomUUID(),
      ownerIdentifier: PLATFORM_IDENTIFIER,
      taskIdentifier,
      trigger: {
        kind: 'user_action',
        invokeContext: {
          userId,
        },
      },
      taskDescription: 'Platform task on user request',
      data: taskData,
      dontStartBefore:
        dontStartBefore instanceof Date
          ? dontStartBefore
          : typeof dontStartBefore === 'number'
            ? addMs(now, dontStartBefore)
            : undefined,
      createdAt: now,
      updatedAt: now,
      handlerType: 'platform',
      storageAccessPolicy,
      targetLocation,
      targetUserId,
    }

    const [task] = await this.ormService.db
      .insert(tasksTable)
      .values(newTask)
      .returning()

    return task
  }

  /**
   * Used to trigger an app's task on request from a user.
   *
   * @param userId - The user ID triggering the task.
   * @param appIdentifier - The identifier of the app that owns the task.
   * @param taskIdentifier - The identifier of the task to trigger (must be defined in the app's config).
   * @param taskData - The data to pass to the task (must be serializable).
   * @param dontStartBefore - The time before which the task should not start.
   * @param targetUserId - The user ID to relate the task to.
   * @param targetLocation - The folderId and possibly objectKey to relate the task to.
   *
   ** @returns The created task record.
   */
  async triggerAppUserActionTask({
    userId,
    appIdentifier,
    taskIdentifier,
    taskData,
    dontStartBefore,
    targetUserId,
    targetLocation,
    storageAccessPolicy,
  }: {
    userId: string
    appIdentifier: string
    taskIdentifier: string
    taskData: JsonSerializableObject
    dontStartBefore?: { timestamp: Date } | { delayMs: number }
    targetUserId: string
    targetLocation?: { folderId: string; objectKey?: string }
    storageAccessPolicy?: StorageAccessPolicy
  }) {
    const now = new Date()

    const app = await this.appService.getApp(appIdentifier, { enabled: true })
    if (!app) {
      throw new NotFoundException(`App not found: ${appIdentifier}`)
    }
    const taskDefinition = app.config.tasks?.find(
      (task) => task.identifier === taskIdentifier,
    )
    if (!taskDefinition) {
      throw new NotFoundException(
        `Task definition not found: ${taskIdentifier}`,
      )
    }

    const newTask: NewTask = {
      id: crypto.randomUUID(),
      ownerIdentifier: appIdentifier,
      taskIdentifier,
      trigger: {
        kind: 'user_action',
        invokeContext: {
          userId,
        },
      },
      taskDescription: taskDefinition.description,
      data: taskData,
      dontStartBefore:
        dontStartBefore instanceof Date
          ? dontStartBefore
          : typeof dontStartBefore === 'number'
            ? addMs(now, dontStartBefore)
            : undefined,
      createdAt: now,
      updatedAt: now,
      handlerType: 'platform',
      storageAccessPolicy,
      targetLocation,
      targetUserId,
    }

    return this.ormService.db.transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const task = (await tx.insert(tasksTable).values(newTask).returning())[0]!

      await this.eventService.emitRunnableTaskEnqueuedEvent(task, { tx })
      return task
    })
  }

  /**
   * Used to trigger an app's own tasks.
   *
   * @param appIdentifier - The identifier of the app triggering the task.
   * @param taskIdentifier - The identifier of the task to trigger (must be defined in the app's config).
   * @param taskData - The data to pass to the task (must be serializable).
   * @param dontStartBefore - The time before which the task should not start.
   * @param targetUserId - The user ID to relate the task to.
   * @param targetLocation - The folderId and possibly objectKey to relate the task to.
   * @param storageAccessPolicy - The storage access policy to use for the task.
   * @param onComplete - Optional onComplete handler(s) to trigger when this task completes.
   * @returns The created task record.
   */
  async triggerAppActionTask({
    appIdentifier,
    taskIdentifier,
    taskData,
    dontStartBefore,
    targetUserId,
    targetLocation,
    storageAccessPolicy,
    onComplete,
  }: {
    appIdentifier: string
    taskIdentifier: string
    taskData: JsonSerializableObject
    dontStartBefore?: { timestamp: Date } | { delayMs: number }
    targetUserId?: string
    targetLocation?: { folderId: string; objectKey?: string }
    storageAccessPolicy?: StorageAccessPolicy
    onComplete?: TaskOnCompleteConfig[]
  }) {
    const app = await this.appService.getApp(appIdentifier, { enabled: true })
    if (!app) {
      throw new NotFoundException(`App not found: ${appIdentifier}`)
    }
    const taskDefinition = app.config.tasks?.find(
      (task) => task.identifier === taskIdentifier,
    )
    if (!taskDefinition) {
      throw new NotFoundException(
        `Task definition not found: ${taskIdentifier}`,
      )
    }

    // validate user and folder access if task is scoped as such
    if (targetUserId) {
      await this.appService.validateAppUserAccess({
        appIdentifier,
        userId: targetUserId,
      })
    }

    if (targetLocation?.folderId) {
      await this.appService.validateAppFolderAccess({
        appIdentifier,
        folderId: targetLocation.folderId,
      })
    }

    // validate the entire storage access policy if one is provided
    if (storageAccessPolicy?.length) {
      await this.appService.validateAppStorageAccessPolicy({
        appIdentifier,
        storageAccessPolicy,
      })
    }

    const now = new Date()

    const newTask: NewTask = {
      id: crypto.randomUUID(),
      ownerIdentifier: appIdentifier,
      taskIdentifier,
      trigger: {
        kind: 'app_action',
        ...(onComplete && { onComplete }),
      },
      data: taskData,
      handlerType: taskDefinition.handler.type,
      handlerIdentifier:
        taskDefinition.handler.type === 'external'
          ? null
          : taskDefinition.handler.identifier,
      createdAt: now,
      updatedAt: now,
      dontStartBefore:
        dontStartBefore instanceof Date
          ? dontStartBefore
          : typeof dontStartBefore === 'number'
            ? addMs(now, dontStartBefore)
            : undefined,
      storageAccessPolicy,
      taskDescription: taskDefinition.description,
      targetUserId,
      targetLocation,
    }

    return this.ormService.db.transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const task = (await tx.insert(tasksTable).values(newTask).returning())[0]!
      await this.eventService.emitRunnableTaskEnqueuedEvent(task, { tx })
      return task
    })
  }

  /**
   * Used to trigger an task as a completion handler for another task.
   *
   * @param appIdentifier - The identifier of the app triggering the task.
   * @param taskIdentifier - The identifier of the task to trigger (must be defined in the app's config).
   * @param taskData - The data to pass to the task (must be serializable).
   * @param dontStartBefore - The time before which the task should not start.
   * @param targetUserId - The user ID to relate the task to.
   * @param targetLocation - The folderId and possibly objectKey to relate the task to.
   * @param storageAccessPolicy - The storage access policy to use for the task.
   * @returns The created task record.
   */
  async executeOnCompleteHandler({
    parentTask,
    parentTaskSuccess,
    taskIdentifier,
    taskDataTemplate,
    dontStartBefore,
    targetUserId,
    targetLocation,
    onComplete = [],
    storageAccessPolicy,
    tx,
  }: {
    parentTaskSuccess: boolean
    parentTask: Task
    taskIdentifier: string
    taskDataTemplate?: JsonSerializableObject // parse this to interpolate variables, e.g. {{task.result.someKey}} or {{task.error.someKey}}
    dontStartBefore?: { timestamp: Date } | { delayMs: number }
    targetUserId?: string
    targetLocation?: { folderId: string; objectKey?: string }
    onComplete?: TaskOnCompleteConfig[]
    storageAccessPolicy?: StorageAccessPolicy
    tx?: OrmService['db']
  }) {
    const app = await this.appService.getApp(parentTask.ownerIdentifier, {
      enabled: true,
    })
    if (!app) {
      throw new NotFoundException(
        `App not found: ${parentTask.ownerIdentifier}`,
      )
    }
    const taskDefinition = app.config.tasks?.find(
      (t) => t.identifier === taskIdentifier,
    )
    if (!taskDefinition) {
      throw new NotFoundException(
        `Task definition not found: ${taskIdentifier}`,
      )
    }

    const parentTaskSuccessLog = parentTask.systemLog
      .reverse()
      .find((log) => log.payload.logType === 'success')?.payload.data as
      | { result: JsonSerializableObject }
      | undefined

    const parentTaskErrorLog = parentTask.systemLog
      .reverse()
      .find((log) => log.payload.logType === 'error')?.payload.data as
      | {
          error: {
            code: string
            message: string
            details: JsonSerializableObject
          }
        }
      | undefined

    const now = new Date()
    const newTask: NewTask = {
      id: crypto.randomUUID(),
      ownerIdentifier: parentTask.ownerIdentifier,
      taskIdentifier,
      trigger: {
        kind: 'task_child',
        invokeContext: {
          parentTask: {
            id: parentTask.id,
            identifier: parentTask.taskIdentifier,
            ...(parentTaskSuccess
              ? {
                  success: true,
                  result: parentTaskSuccessLog?.result ?? {},
                }
              : {
                  success: false,
                  error: parentTaskErrorLog?.error ?? {
                    code: 'UNKNOWN_ERROR',
                    message: 'Parent task failed',
                    details: {},
                  },
                }),
          },
        },
        onComplete: onComplete.length > 0 ? onComplete : undefined,
      },
      data: taskDataTemplate
        ? await dataFromTemplate(taskDataTemplate, {
            objects: {
              task: {
                id: parentTask.id,
                success: true,
                result: parentTaskSuccessLog?.result ?? {},
                targetLocation: parentTask.targetLocation ?? {},
                data: parentTask.data,
              },
            },
            functions: {
              createPresignedUrl:
                this.folderService.dataTemplateFunctions.buildCreatePresignedUrlFunction(
                  parentTask.ownerIdentifier,
                ),
            },
          })
        : {},
      handlerType: taskDefinition.handler.type,
      handlerIdentifier:
        taskDefinition.handler.type === 'external'
          ? null
          : taskDefinition.handler.identifier,
      createdAt: now,
      updatedAt: now,
      dontStartBefore:
        dontStartBefore instanceof Date
          ? dontStartBefore
          : typeof dontStartBefore === 'number'
            ? addMs(now, dontStartBefore)
            : undefined,
      storageAccessPolicy,
      taskDescription: taskDefinition.description,
      targetUserId,
      targetLocation,
    }

    const db = tx ?? this.ormService.db

    this.logger.debug('onComplete handler task queued', newTask)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const task = (await db.insert(tasksTable).values(newTask).returning())[0]!

    await this.eventService.emitRunnableTaskEnqueuedEvent(task, { tx: db })
    return task
  }

  async registerTaskStarted({
    taskId,
    startContext,
    tx,
  }: {
    taskId: string
    startContext: {
      __executor: JsonSerializableObject
    } & JsonSerializableObject
    tx?: OrmService['db']
  }) {
    const db = tx ?? this.ormService.db
    const task = await db.query.tasksTable.findFirst({
      where: eq(tasksTable.id, taskId),
    })
    if (!task) {
      throw new NotFoundException('Invalid request (no task found by id).')
    } else if (task.completedAt || task.startedAt) {
      throw new ConflictException('Task not in a state to be started.')
    }

    const now = new Date()

    const startSystemLog: SystemLogEntry = {
      at: now,
      payload: {
        logType: 'started',
        data: startContext,
      },
    }

    const updatedTask = (
      await db
        .update(tasksTable)
        .set({
          startedAt: now,
          updatedAt: now,
          systemLog: sql<
            SystemLogEntry[]
          >`coalesce(${tasksTable.systemLog}, '[]'::jsonb) || ${JSON.stringify(startSystemLog)}::jsonb`,
        })
        .where(and(eq(tasksTable.id, task.id), isNull(tasksTable.startedAt)))
        .returning()
    )[0]

    if (!updatedTask) {
      throw new ConflictException('Failed to secure task.')
    }

    return { task: updatedTask }
  }

  async startAnyAvailableTask({
    appIdentifier,
    taskIdentifiers,
    startContext,
    maxAttempts = 5,
    tx = undefined,
  }: {
    appIdentifier: string
    taskIdentifiers: string[]
    startContext: {
      __executor: JsonSerializableObject
    } & JsonSerializableObject
    maxAttempts?: number
    tx?: OrmService['db']
  }) {
    const db = tx ?? this.ormService.db

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const task = await db.query.tasksTable.findFirst({
        where: and(
          eq(tasksTable.ownerIdentifier, appIdentifier),
          inArray(tasksTable.taskIdentifier, taskIdentifiers),
          isNull(tasksTable.startedAt),
        ),
        orderBy: [asc(tasksTable.createdAt)],
      })
      if (!task || task.completedAt || task.startedAt) {
        break
      }

      const { task: securedTask } = await this.registerTaskStarted({
        taskId: task.id,
        startContext,
        tx: db,
      })
      return { task: securedTask }
    }

    throw new ConflictException(
      `Failed to secure a task after ${maxAttempts} attempts.`,
    )
  }

  async registerTaskCompleted(
    taskId: string,
    completion:
      | {
          success: false
          requeue?: { delayMs: number }
          error: {
            code: string
            message: string
            details?: JsonSerializableObject
          }
        }
      | {
          success: true
          result?: JsonSerializableObject
        },
    options: { tx?: OrmService['db'] } = { tx: undefined },
  ) {
    const db = options.tx ?? this.ormService.db
    const now = new Date()
    return db.transaction(async (tx) => {
      const task = await tx.query.tasksTable.findFirst({
        where: and(eq(tasksTable.id, taskId)),
      })

      if (!task) {
        throw new Error(`Task not found by ID "${taskId}".`)
      }

      if (!task.startedAt) {
        throw new Error(`Task "${taskId}" has not been started.`)
      }

      if (task.completedAt) {
        throw new Error(`Task "${taskId}"  has already been completed.`)
      }

      // build the task system log
      const completionSystemLog: SystemLogEntry = {
        at: now,
        payload: completion.success
          ? {
              logType: 'success',
              data: completion.result
                ? {
                    result: completion.result,
                  }
                : undefined,
            }
          : {
              logType: 'error',
              data: {
                error: completion.error,
              },
            },
      }

      const requeueConfig: RequeueConfig =
        !completion.success && completion.requeue
          ? ({
              shouldRequeue: true,
              delayMs: Math.max(completion.requeue.delayMs, 0),
              notBefore:
                completion.requeue.delayMs > 0
                  ? new Date(now.getTime() + completion.requeue.delayMs)
                  : undefined,
            } as const)
          : { shouldRequeue: false }

      const systemLogs = [completionSystemLog].concat(
        requeueConfig.shouldRequeue
          ? [
              {
                at: now,
                payload: {
                  logType: 'requeue',
                  data: {
                    delayMs: requeueConfig.delayMs,
                    dontStartBefore:
                      requeueConfig.notBefore?.toISOString() ?? null,
                  },
                },
              },
            ]
          : [],
      )

      const updatedTask = (
        await tx
          .update(tasksTable)
          .set({
            updatedAt: now,
            ...(completion.success
              ? {
                  success: true,
                  completedAt: now,
                  error: null,
                }
              : {
                  success: false,
                  completedAt: now,
                  error: {
                    code: completion.error.code,
                    message: completion.error.message,
                    details: completion.error.details,
                  },
                  ...(requeueConfig.shouldRequeue
                    ? {
                        dontStartBefore: requeueConfig.notBefore,
                        success: null,
                        completedAt: null,
                        startedAt: null,
                      }
                    : {}),
                }),
            systemLog: sql<
              SystemLogEntry[]
            >`coalesce(${tasksTable.systemLog}, '[]'::jsonb) || ${JSON.stringify(systemLogs)}::jsonb`,
          })
          .where(
            and(
              eq(tasksTable.id, taskId),
              isNull(tasksTable.success),
              isNull(tasksTable.completedAt),
              isNotNull(tasksTable.startedAt),
            ),
          )
          .returning()
      )[0]
      if (!updatedTask) {
        throw new ConflictException('Failed to register task completion task.')
      }

      // Enqueue the completion handler task if one was configured for this task
      for (const onCompleteHandler of task.trigger.onComplete ?? []) {
        const conditionInput: OnCompleteConditionTaskContext = {
          id: updatedTask.id,
          ...(completion.success
            ? { success: true, result: completion.result ?? {} }
            : {
                success: false,
                error: completion.error,
              }),
        }
        const onCompleteConditionResult = onCompleteHandler.condition
          ? evalOnCompleteHandlerCondition(
              onCompleteHandler.condition,
              conditionInput,
            )
          : undefined
        if (onCompleteHandler.condition && !conditionInput.success) {
          this.logger.debug('Task onComplete condition evaluation failed:', {
            condition: onCompleteHandler.condition,
            input: conditionInput,
          })
        }
        if (
          !onCompleteHandler.condition ||
          onCompleteConditionResult === true
        ) {
          await this.executeOnCompleteHandler({
            parentTaskSuccess: completion.success,
            parentTask: updatedTask,
            onComplete: onCompleteHandler.onComplete ?? [],
            taskIdentifier: onCompleteHandler.taskIdentifier,
            taskDataTemplate: onCompleteHandler.dataTemplate ?? {},
            targetUserId: updatedTask.targetUserId ?? undefined,
            targetLocation: updatedTask.targetLocation ?? undefined,
            storageAccessPolicy: updatedTask.storageAccessPolicy,
            tx,
          })
        }
      }

      return updatedTask
    })
  }
}
