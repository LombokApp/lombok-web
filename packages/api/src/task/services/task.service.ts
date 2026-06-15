import {
  CORE_IDENTIFIER,
  CoreEvent,
  ExecutorMetadata,
  ExecutorStartMetadata,
  JsonSerializableObject,
  ReceivedTaskProgressReport,
  StorageAccessPolicy,
  SystemLogEntry,
  TaskCompletion,
  TaskErrorSystemLogPayload,
  TaskLogEntry,
  TaskOnCompleteConfig,
  TaskOnProgressConfig,
  TaskProgressReport,
  TaskStartedSystemLogPayload,
  TaskSuccessSystemLogPayload,
  TaskUpdateType,
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
  count,
  eq,
  ilike,
  isNotNull,
  isNull,
  or,
  SQL,
  sql,
} from 'drizzle-orm'
import { AppService } from 'src/app/services/app.service'
import { dataFromTemplate } from 'src/core/utils/data-template.util'
import { normalizeSortParam, parseSort } from 'src/core/utils/sort.util'
import { EventService } from 'src/event/services/event.service'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { FolderService } from 'src/folders/services/folder.service'
import { OrmService } from 'src/orm/orm.service'
import { getThreadId } from 'src/shared/thread-context'
import { AppSocketService } from 'src/socket/app/app-socket.service'
import { AppUserSocketService } from 'src/socket/app-user/app-user-socket.service'
import type { User } from 'src/users/entities/user.entity'

import { FolderTasksListQueryParamsDTO } from '../dto/folder-tasks-list-query-params.dto'
import { TasksListQueryParamsDTO } from '../dto/tasks-list-query-params.dto'
import type { Task } from '../entities/task.entity'
import { tasksTable } from '../entities/task.entity'
import { MAX_TASK_ATTEMPTS } from '../task.constants'
import {
  evalOnCompleteHandlerCondition,
  OnCompleteConditionTaskContext,
} from '../util/eval-oncomplete-condition.util'
import { evalProgressHandlerCondition } from '../util/eval-progress-condition.util'
import { serializeLogEntry } from '../util/log-encoder.util'
import { withTaskIdempotencyKey } from '../util/task-idempotency-key.util'
import { TaskUpdateBroadcasterService } from './task-update-broadcaster.service'

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
  appUserSocketService: AppUserSocketService
  folderService: FolderService
  eventService: EventService
  private readonly logger = new Logger(TaskService.name)

  constructor(
    private readonly ormService: OrmService,
    @Inject(forwardRef(() => AppSocketService))
    _appSocketService,
    @Inject(forwardRef(() => AppUserSocketService))
    _appUserSocketService,
    @Inject(forwardRef(() => EventService))
    _eventService,
    @Inject(forwardRef(() => AppService))
    _appService,
    @Inject(forwardRef(() => FolderService))
    _folderService,
    private readonly asyncTaskUpdateBroadcasterService: TaskUpdateBroadcasterService,
  ) {
    this.appService = _appService as AppService
    this.folderService = _folderService as FolderService
    this.appSocketService = _appSocketService as AppSocketService
    this.appUserSocketService = _appUserSocketService as AppUserSocketService
    this.eventService = _eventService as EventService
  }

  async getFolderTaskAsUser(
    actor: User,
    { folderId, taskId }: { folderId: string; taskId: string },
  ): Promise<Task & { folder?: { name: string; ownerId: string } }> {
    await this.folderService.getFolderAsUser(actor, folderId)
    const result = await this.ormService.db
      .select({
        task: tasksTable,
        folderName: foldersTable.name,
        folderOwnerId: foldersTable.ownerId,
      })
      .from(tasksTable)
      .leftJoin(
        foldersTable,
        eq(foldersTable.id, tasksTable.targetLocationFolderId),
      )
      .where(and(eq(tasksTable.id, taskId), eq(foldersTable.id, folderId)))
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
    const result = await this.ormService.db
      .select({
        task: tasksTable,
        folderName: foldersTable.name,
        folderOwnerId: foldersTable.ownerId,
      })
      .from(tasksTable)
      .leftJoin(
        foldersTable,
        eq(foldersTable.id, tasksTable.targetLocationFolderId),
      )
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

  async getTaskAsApp(
    appIdentifier: string,
    taskId: string,
    options?: { targetUserId?: string },
  ): Promise<Task | null> {
    if (options?.targetUserId) {
      await this.appService.validateAppUserAccess({
        appIdentifier,
        userId: options.targetUserId,
      })
    }

    const conditions: SQL[] = [
      eq(tasksTable.id, taskId),
      eq(tasksTable.ownerId, appIdentifier),
    ]
    if (options?.targetUserId) {
      conditions.push(eq(tasksTable.targetUserId, options.targetUserId))
    }
    const result = await this.ormService.db
      .select()
      .from(tasksTable)
      .where(and(...conditions))
      .limit(1)
    return result.at(0) ?? null
  }

  async listTasks({
    offset,
    limit,
    search,
    sort = [TaskSort.CreatedAtDesc],
    objectKey,
    includeComplete,
    includeFailed,
    includeRunning,
    includeWaiting,
    folderId,
  }: TasksListQueryParamsDTO) {
    const conditions: (SQL | undefined)[] = []
    if (folderId) {
      conditions.push(eq(tasksTable.targetLocationFolderId, folderId))
    }

    if (search) {
      conditions.push(
        or(
          ilike(sql<string>`${tasksTable.id}::text`, `%${search}%`),
          ilike(tasksTable.taskIdentifier, `%${search}%`),
          ilike(tasksTable.taskDescription, `%${search}%`),
          ilike(sql<string>`${tasksTable.error} ->> 'details'`, `%${search}%`),
          ilike(sql<string>`${tasksTable.error} ->> 'message'`, `%${search}%`),
          ilike(sql<string>`${tasksTable.error} ->> 'code'`, `%${search}%`),
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
      conditions.push(eq(tasksTable.targetLocationObjectKey, objectKey))
    }

    const tasks = await this.ormService.db
      .select({
        task: {
          id: tasksTable.id,
          ownerId: tasksTable.ownerId,
          taskIdentifier: tasksTable.taskIdentifier,
          taskDescription: tasksTable.taskDescription,
          invocation: tasksTable.invocation,
          idempotencyKey: tasksTable.idempotencyKey,
          targetUserId: tasksTable.targetUserId,
          targetLocationFolderId: tasksTable.targetLocationFolderId,
          targetLocationObjectKey: tasksTable.targetLocationObjectKey,
          startedAt: tasksTable.startedAt,
          dontStartBefore: tasksTable.dontStartBefore,
          latestHeartbeatAt: tasksTable.latestHeartbeatAt,
          completedAt: tasksTable.completedAt,
          taskLog: tasksTable.taskLog,
          storageAccessPolicy: tasksTable.storageAccessPolicy,
          success: tasksTable.success,
          userVisible: tasksTable.userVisible,
          error: tasksTable.error,
          attemptCount: tasksTable.attemptCount,
          failureCount: tasksTable.failureCount,
          createdAt: tasksTable.createdAt,
          updatedAt: tasksTable.updatedAt,
          handlerType: tasksTable.handlerType,
          handlerIdentifier: tasksTable.handlerIdentifier,
          progressReports: tasksTable.progressReports,
          correlationKey: tasksTable.correlationKey,
          progress: tasksTable.progress,
        },
        folderName: foldersTable.name,
        folderOwnerId: foldersTable.ownerId,
      })
      .from(tasksTable)
      .leftJoin(
        foldersTable,
        eq(foldersTable.id, tasksTable.targetLocationFolderId),
      )
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
        targetLocation: task.targetLocationFolderId
          ? {
              folderId: task.targetLocationFolderId,
              objectKey: task.targetLocationObjectKey ?? undefined,
            }
          : undefined,
        folder:
          task.targetLocationFolderId && folderName
            ? { name: folderName, ownerId: folderOwnerId }
            : undefined,
      })),
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      meta: { totalCount: tasksCountResult[0]!.count },
    }
  }

  // Trigger a platform (core) task on request from a user.
  async triggerCoreUserActionTask({
    userId,
    taskIdentifier,
    taskData,
    targetUserId,
    targetLocation,
    storageAccessPolicy,
  }: {
    userId: string
    taskIdentifier: string
    taskData: JsonSerializableObject
    targetUserId?: string
    targetLocation?: { folderId: string; objectKey?: string }
    storageAccessPolicy?: StorageAccessPolicy
  }) {
    const now = new Date()
    const newTask = withTaskIdempotencyKey({
      id: crypto.randomUUID(),
      ownerId: CORE_IDENTIFIER,
      taskIdentifier,
      invocation: {
        kind: 'user_action',
        invokeContext: {
          userId,
          requestId: getThreadId(),
        },
      },
      taskDescription: 'Core task on user request',
      data: taskData,
      createdAt: now,
      updatedAt: now,
      handlerType: CORE_IDENTIFIER,
      storageAccessPolicy,
      targetLocationFolderId: targetLocation?.folderId ?? null,
      targetLocationObjectKey: targetLocation?.objectKey ?? null,
      targetUserId: targetUserId ?? null,
    })

    const [task] = await this.ormService.db
      .insert(tasksTable)
      .values(newTask)
      .returning()

    return task
  }

  // Trigger an app's task on request from a user.
  async triggerAppUserActionTask({
    userId,
    appIdentifier,
    taskIdentifier,
    taskData,
    targetUserId,
    targetLocation,
    storageAccessPolicy,
  }: {
    userId: string
    appIdentifier: string
    taskIdentifier: string
    taskData: JsonSerializableObject
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

    const newTask = withTaskIdempotencyKey({
      id: crypto.randomUUID(),
      ownerId: appIdentifier,
      taskIdentifier,
      invocation: {
        kind: 'user_action',
        invokeContext: {
          userId,
          requestId: getThreadId(),
        },
      },
      taskDescription: taskDefinition.description,
      data: taskData,
      createdAt: now,
      updatedAt: now,
      handlerType: CORE_IDENTIFIER,
      storageAccessPolicy,
      targetLocationFolderId: targetLocation?.folderId,
      targetLocationObjectKey: targetLocation?.objectKey,
      targetUserId,
    })

    return this.ormService.db.transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const task = (await tx.insert(tasksTable).values(newTask).returning())[0]!

      await this.eventService.emitRunnableTaskEnqueuedEvent(task, tx)
      return task
    })
  }

  // Trigger an app's own task.
  async triggerAppActionTask({
    appIdentifier,
    taskIdentifier,
    taskData,
    correlationKey,
    dontStartBefore,
    targetUserId,
    targetLocation,
    storageAccessPolicy,
    onComplete,
    onProgress,
  }: {
    appIdentifier: string
    taskIdentifier: string
    taskData: JsonSerializableObject
    correlationKey?: string
    dontStartBefore?: { timestamp: Date } | { delayMs: number }
    targetUserId?: string
    targetLocation?: { folderId: string; objectKey?: string }
    storageAccessPolicy?: StorageAccessPolicy
    onComplete?: TaskOnCompleteConfig[]
    onProgress?: TaskOnProgressConfig[]
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

    if (storageAccessPolicy) {
      await this.appService.validateAppStorageAccessPolicy({
        appIdentifier,
        storageAccessPolicy,
      })
    }

    const now = new Date()
    const newTask = withTaskIdempotencyKey({
      id: crypto.randomUUID(),
      ownerId: appIdentifier,
      taskIdentifier,
      invocation: {
        kind: 'app_action',
        invokeContext: {
          requestId: getThreadId(),
        },
        onComplete: onComplete ?? undefined,
        onProgress: onProgress ?? undefined,
      },
      data: taskData,
      handlerType: taskDefinition.handler.type,
      handlerIdentifier: taskDefinition.handler.identifier,
      createdAt: now,
      updatedAt: now,
      dontStartBefore:
        dontStartBefore && 'timestamp' in dontStartBefore
          ? dontStartBefore.timestamp
          : dontStartBefore && 'delayMs' in dontStartBefore
            ? addMs(now, dontStartBefore.delayMs)
            : undefined,
      storageAccessPolicy,
      taskDescription: taskDefinition.description,
      correlationKey,
      targetUserId,
      targetLocationFolderId: targetLocation?.folderId,
      targetLocationObjectKey: targetLocation?.objectKey,
    })

    return this.ormService.db.transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const task = (await tx.insert(tasksTable).values(newTask).returning())[0]!
      await this.eventService.emitRunnableTaskEnqueuedEvent(task, tx)
      return task
    })
  }

  // Trigger a task as a completion handler for another task.
  async executeOnCompleteHandler({
    parentTask,
    parentTaskSuccess,
    taskIdentifier,
    correlationKey,
    taskDataTemplate,
    dontStartBefore,
    targetUserId,
    targetLocation,
    onComplete = [],
    onProgress = [],
    storageAccessPolicy,
    handlerIndex,
    options = {},
  }: {
    parentTaskSuccess: boolean
    parentTask: Task
    correlationKey?: string
    taskIdentifier: string
    taskDataTemplate?: JsonSerializableObject // interpolated, e.g. {{task.result.someKey}}
    dontStartBefore?: { timestamp: Date } | { delayMs: number }
    targetUserId?: string
    targetLocation?: { folderId: string; objectKey?: string }
    onComplete?: TaskOnCompleteConfig[]
    onProgress?: TaskOnProgressConfig[]
    storageAccessPolicy?: StorageAccessPolicy
    handlerIndex: number
    options: { tx?: OrmService['db'] }
  }) {
    const app = await this.appService.getApp(parentTask.ownerId, {
      enabled: true,
    })
    if (!app) {
      throw new NotFoundException(`App not found: ${parentTask.ownerId}`)
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
      .find((log) => log.logType === 'success')?.payload as
      | TaskSuccessSystemLogPayload
      | undefined

    const parentTaskErrorLog = parentTask.systemLog
      .reverse()
      .find((log) => log.logType === 'error')?.payload as
      | TaskErrorSystemLogPayload
      | undefined

    const now = new Date()
    const childTask = withTaskIdempotencyKey({
      id: crypto.randomUUID(),
      ownerId: parentTask.ownerId,
      taskIdentifier,
      correlationKey,
      invocation: {
        kind: 'task_complete_child',
        invokeContext: {
          parentTask: {
            id: parentTask.id,
            identifier: parentTask.taskIdentifier,
            success: parentTaskSuccess,
            result: parentTaskSuccessLog?.result ?? {},
          },
          onCompleteHandlerIndex: handlerIndex,
        },
        onComplete: onComplete.length > 0 ? onComplete : undefined,
        onProgress: onProgress.length > 0 ? onProgress : undefined,
      },
      data: taskDataTemplate
        ? await dataFromTemplate(taskDataTemplate, {
            objects: {
              task: {
                id: parentTask.id,
                success: parentTaskSuccess,
                result: parentTaskSuccess
                  ? (parentTaskSuccessLog?.result ?? {})
                  : undefined,
                error: parentTaskSuccess
                  ? undefined
                  : (parentTaskErrorLog?.error ?? {}),
                targetLocation: parentTask.targetLocationFolderId
                  ? {
                      folderId: parentTask.targetLocationFolderId,
                      objectKey:
                        parentTask.targetLocationObjectKey ?? undefined,
                    }
                  : {},
                data: parentTask.data,
                startedAt: parentTask.startedAt,
                completedAt: parentTask.completedAt,
                createdAt: parentTask.createdAt,
                updatedAt: parentTask.updatedAt,
              },
              executorMetadata: parentTaskSuccess
                ? parentTaskSuccessLog?.executorMetadata
                : parentTaskErrorLog?.executorMetadata,
            },
            functions: {
              createPresignedUrl:
                this.folderService.dataTemplateFunctions.buildCreatePresignedUrlFunction(
                  parentTask.ownerId,
                ),
            },
          })
        : {},
      handlerType: taskDefinition.handler.type,
      handlerIdentifier: taskDefinition.handler.identifier,
      createdAt: now,
      updatedAt: now,
      dontStartBefore:
        dontStartBefore && 'timestamp' in dontStartBefore
          ? dontStartBefore.timestamp
          : dontStartBefore && 'delayMs' in dontStartBefore
            ? addMs(now, dontStartBefore.delayMs)
            : undefined,
      storageAccessPolicy,
      taskDescription: taskDefinition.description,
      targetUserId,
      targetLocationFolderId: targetLocation?.folderId,
      targetLocationObjectKey: targetLocation?.objectKey,
    })

    this.logger.debug('onComplete handler task queued', {
      id: childTask.id,
      taskIdentifier: childTask.taskIdentifier,
      ...(childTask.invocation.kind === 'task_complete_child'
        ? { parent: childTask.invocation.invokeContext.parentTask.id }
        : {}),
      onComplete:
        childTask.invocation.kind === 'task_complete_child'
          ? childTask.invocation.onComplete
          : undefined,
    })

    if (options.tx) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const task = (
        await options.tx.insert(tasksTable).values(childTask).returning()
      )[0]!
      await this.eventService.emitRunnableTaskEnqueuedEvent(task, options.tx)
      return task
    } else {
      return this.ormService.db.transaction(async (tx) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const task = (
          await tx.insert(tasksTable).values(childTask).returning()
        )[0]!
        await this.eventService.emitRunnableTaskEnqueuedEvent(task, tx)
        return task
      })
    }
  }

  // Trigger a task as an onProgress handler for another task.
  async executeOnProgressHandler({
    parentTask,
    parentProgressReport,
    taskIdentifier,
    correlationKey,
    taskDataTemplate,
    dontStartBefore,
    targetUserId,
    targetLocation,
    storageAccessPolicy,
    handlerIndex,
    options = {},
  }: {
    parentTask: Task
    parentProgressReport: TaskProgressReport
    correlationKey?: string
    taskIdentifier: string
    taskDataTemplate?: JsonSerializableObject // interpolated, e.g. {{task.result.someKey}}
    dontStartBefore?: { timestamp: Date } | { delayMs: number }
    targetUserId?: string
    targetLocation?: { folderId: string; objectKey?: string }
    storageAccessPolicy?: StorageAccessPolicy
    handlerIndex: number
    options: { tx?: OrmService['db'] }
  }) {
    const app = await this.appService.getApp(parentTask.ownerId, {
      enabled: true,
    })
    if (!app) {
      throw new NotFoundException(`App not found: ${parentTask.ownerId}`)
    }
    const taskDefinition = app.config.tasks?.find(
      (t) => t.identifier === taskIdentifier,
    )
    if (!taskDefinition) {
      throw new NotFoundException(
        `Task definition not found: ${taskIdentifier}`,
      )
    }

    const now = new Date()

    const childTask = withTaskIdempotencyKey({
      id: crypto.randomUUID(),
      ownerId: parentTask.ownerId,
      taskIdentifier,
      correlationKey,
      invocation: {
        kind: 'task_progress_child',
        invokeContext: {
          parentTask: {
            id: parentTask.id,
            identifier: parentTask.taskIdentifier,
            progressReport: parentProgressReport,
          },
          onProgressHandlerIndex: handlerIndex,
        },
      },
      data: taskDataTemplate
        ? await dataFromTemplate(taskDataTemplate, {
            objects: {
              task: {
                id: parentTask.id,
                targetLocation: parentTask.targetLocationFolderId
                  ? {
                      folderId: parentTask.targetLocationFolderId,
                      objectKey:
                        parentTask.targetLocationObjectKey ?? undefined,
                    }
                  : {},
                data: parentTask.data,
                startedAt: parentTask.startedAt,
                completedAt: parentTask.completedAt,
                createdAt: parentTask.createdAt,
                updatedAt: parentTask.updatedAt,
              },
              progressReport: parentProgressReport,
              executorMetadata: parentProgressReport.executorMetadata,
            },
            functions: {
              createPresignedUrl:
                this.folderService.dataTemplateFunctions.buildCreatePresignedUrlFunction(
                  parentTask.ownerId,
                ),
            },
          })
        : {},
      handlerType: taskDefinition.handler.type,
      handlerIdentifier: taskDefinition.handler.identifier,
      createdAt: now,
      updatedAt: now,
      dontStartBefore:
        dontStartBefore && 'timestamp' in dontStartBefore
          ? dontStartBefore.timestamp
          : dontStartBefore && 'delayMs' in dontStartBefore
            ? addMs(now, dontStartBefore.delayMs)
            : undefined,
      storageAccessPolicy,
      taskDescription: taskDefinition.description,
      targetUserId,
      targetLocationFolderId: targetLocation?.folderId,
      targetLocationObjectKey: targetLocation?.objectKey,
    })

    this.logger.debug('onProgress handler task queued', {
      id: childTask.id,
      taskIdentifier: childTask.taskIdentifier,
      ...(childTask.invocation.kind === 'task_progress_child'
        ? { parent: childTask.invocation.invokeContext.parentTask.id }
        : {}),
    })

    if (options.tx) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const task = (
        await options.tx.insert(tasksTable).values(childTask).returning()
      )[0]!
      await this.eventService.emitRunnableTaskEnqueuedEvent(task, options.tx)
      return task
    } else {
      return this.ormService.db.transaction(async (tx) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const task = (
          await tx.insert(tasksTable).values(childTask).returning()
        )[0]!
        await this.eventService.emitRunnableTaskEnqueuedEvent(task, tx)
        return task
      })
    }
  }

  async registerTaskStarted({
    taskId,
    executorMetadata,
    options = {},
  }: {
    taskId: string
    executorMetadata: ExecutorStartMetadata
    options?: { tx?: OrmService['db'] }
  }) {
    const args = { taskId, executorMetadata }
    if (options.tx) {
      return this._registerTaskStartedInTx(args, options.tx)
    }
    return this.ormService.db.transaction(async (tx) => {
      return this._registerTaskStartedInTx(args, tx)
    })
  }

  async _registerTaskStartedInTx(
    {
      taskId,
      executorMetadata,
    }: {
      taskId: string
      executorMetadata: ExecutorStartMetadata
    },
    tx: OrmService['db'],
  ) {
    const task = await tx.query.tasksTable.findFirst({
      where: eq(tasksTable.id, taskId),
    })
    if (!task) {
      throw new NotFoundException('Invalid request (no task found by id).')
    } else if (task.completedAt || task.startedAt) {
      throw new ConflictException('Task not in a state to be started.')
    }

    const now = new Date()

    const startPayload: TaskStartedSystemLogPayload = { executorMetadata }
    const startSystemLog: SystemLogEntry = {
      at: now,
      logType: 'started',
      message: 'Task is started',
      payload: startPayload,
    }

    const updatedTask = (
      await tx
        .update(tasksTable)
        .set({
          startedAt: now,
          updatedAt: now,
          systemLog: sql<
            SystemLogEntry[]
          >`coalesce(${tasksTable.systemLog}, '[]'::jsonb) || ${JSON.stringify(serializeLogEntry(startSystemLog))}::jsonb`,
        })
        .where(and(eq(tasksTable.id, task.id), isNull(tasksTable.startedAt)))
        .returning()
    )[0]

    if (!updatedTask) {
      throw new ConflictException(`Failed to secure task: ${taskId}`)
    }

    // Broadcast update
    this.asyncTaskUpdateBroadcasterService.handleTaskUpdate(
      updatedTask,
      TaskUpdateType.task_started,
      now,
    )

    return { task: updatedTask }
  }

  async registerHeartbeat({
    taskId,
    heartbeatContext,
    executorMetadata,
    options = {},
  }: {
    taskId: string
    heartbeatContext?: {
      message: string
      payload?: JsonSerializableObject
    }
    // Runtime-observed metadata (e.g. containerId, hostId); on the first heartbeat it upgrades the `started` log's ExecutorStartMetadata to full ExecutorMetadata.
    executorMetadata?: ExecutorMetadata
    options?: { tx?: OrmService['db'] }
  }) {
    const args = { taskId, heartbeatContext, executorMetadata }
    if (options.tx) {
      return this._registerHeartbeatInTx(args, options.tx)
    }
    return this.ormService.db.transaction(async (tx) => {
      return this._registerHeartbeatInTx(args, tx)
    })
  }

  async _registerHeartbeatInTx(
    {
      taskId,
      heartbeatContext,
      executorMetadata,
    }: {
      taskId: string
      heartbeatContext?: {
        message: string
        payload?: JsonSerializableObject
      }
      executorMetadata?: ExecutorMetadata
    },
    tx: OrmService['db'],
  ) {
    const task = await tx.query.tasksTable.findFirst({
      where: eq(tasksTable.id, taskId),
    })
    if (!task) {
      throw new NotFoundException('Invalid request (no task found by id).')
    } else if (task.completedAt || !task.startedAt) {
      throw new ConflictException('Task not in a state to register heartbeat.')
    }

    const now = new Date()

    const heartbeatLog: TaskLogEntry | undefined = heartbeatContext
      ? {
          at: now,
          logType: 'heartbeat',
          message: heartbeatContext.message,
          payload: heartbeatContext.payload,
        }
      : undefined

    // First heartbeat with full metadata upgrades the `started` log in place; safe to rebuild the array since heartbeats are serialized per task.
    const shouldUpgradeStartLog =
      executorMetadata !== undefined && task.latestHeartbeatAt === null
    const upgradedSystemLog = shouldUpgradeStartLog
      ? task.systemLog.map((entry) =>
          entry.logType === 'started'
            ? {
                ...entry,
                payload: {
                  ...(entry.payload ?? {}),
                  executorMetadata,
                } satisfies TaskStartedSystemLogPayload,
              }
            : entry,
        )
      : undefined

    const updatedTask = (
      await tx
        .update(tasksTable)
        .set({
          updatedAt: now,
          latestHeartbeatAt: now,
          ...(heartbeatLog
            ? {
                taskLog: sql<
                  TaskLogEntry[]
                >`coalesce(${tasksTable.taskLog}, '[]'::jsonb) || ${JSON.stringify(serializeLogEntry(heartbeatLog))}::jsonb`,
              }
            : {}),
          ...(upgradedSystemLog
            ? {
                systemLog: sql<
                  SystemLogEntry[]
                >`${JSON.stringify(upgradedSystemLog.map(serializeLogEntry))}::jsonb`,
              }
            : {}),
        })
        .where(
          and(
            eq(tasksTable.id, task.id),
            isNull(tasksTable.completedAt),
            isNotNull(tasksTable.startedAt),
          ),
        )
        .returning()
    )[0]

    if (!updatedTask) {
      throw new ConflictException(
        `Failed to register heartbeat for task: ${taskId}`,
      )
    }

    return { task: updatedTask }
  }

  async registerTaskCompleted(
    taskId: string,
    completion: TaskCompletion,
    options: { tx?: OrmService['db'] } = { tx: undefined },
  ) {
    const args = { taskId, completion }
    // If a transaction is already provided, use it directly instead of starting a new one
    const updatedTask = options.tx
      ? await this._registerTaskCompletedInTx(args, options.tx)
      : await this.ormService.db.transaction(async (tx) => {
          return this._registerTaskCompletedInTx(args, tx)
        })
    // Fire-and-forget, outside the tx, so telemetry failure can't break task completion.
    void this.emitTaskCompletionTelemetry(updatedTask)
    return updatedTask
  }

  // Synthetic task_completed/task_failed event for activity charts; requeues (success === null) are skipped so retries aren't recorded as failures.
  private async emitTaskCompletionTelemetry(task: Task) {
    if (task.success === null) {
      return
    }
    try {
      await this.eventService.emitEvent({
        emitterIdentifier: task.ownerId,
        eventIdentifier: task.success
          ? CoreEvent.task_completed
          : CoreEvent.task_failed,
        data: {
          taskIdentifier: task.taskIdentifier,
          durationMs:
            task.startedAt && task.completedAt
              ? task.completedAt.getTime() - task.startedAt.getTime()
              : null,
          attemptCount: task.attemptCount,
        },
      })
    } catch (error) {
      this.logger.warn(
        `Failed to emit task completion telemetry for task ${task.id}`,
        error as Error,
      )
    }
  }

  private async _registerTaskCompletedInTx(
    {
      taskId,
      completion,
    }: {
      taskId: string
      completion: TaskCompletion
    },
    tx: OrmService['db'],
  ) {
    const now = new Date()
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

    const completionPayload:
      | TaskSuccessSystemLogPayload
      | TaskErrorSystemLogPayload = completion.success
      ? {
          ...(completion.result ? { result: completion.result } : {}),
          executorMetadata: completion.executorMetadata,
        }
      : {
          error: completion.error,
          executorMetadata: completion.executorMetadata,
        }
    const completionSystemLog: SystemLogEntry = {
      at: now,
      logType: completion.success ? 'success' : 'error',
      message: completion.success
        ? 'Task completed successfully'
        : 'Task failed',
      payload: completionPayload,
    }

    const requeueRequested =
      !completion.success && typeof completion.requeueDelayMs !== 'undefined'
    const hasAlreadyReachedMaxRequeues = task.attemptCount >= MAX_TASK_ATTEMPTS
    const shouldRequeue =
      !completion.success && requeueRequested && !hasAlreadyReachedMaxRequeues
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const requeueDelayMs = shouldRequeue ? completion.requeueDelayMs! : 0
    const requeueTimestamp =
      requeueDelayMs === 0 ? now : addMs(now, requeueDelayMs)
    const requeueConfigSystemLog = shouldRequeue
      ? ({
          at: now,
          logType: 'requeue',
          message: 'Task is requeued',
          payload: {
            requeueDelayMs,
            dontStartBefore: requeueTimestamp.toISOString(),
          },
        } as const)
      : undefined
    const systemLogs = [completionSystemLog].concat(
      requeueConfigSystemLog ? [requeueConfigSystemLog] : [],
    )
    const updatedTask = (
      await tx
        .update(tasksTable)
        .set({
          attemptCount: sql<number>`coalesce(${tasksTable.attemptCount}, 0) + 1`,
          ...(!completion.success
            ? {
                failureCount: sql<number>`coalesce(${tasksTable.failureCount}, 0) + 1`,
              }
            : {}),
          updatedAt: now,
          ...(completion.success
            ? {
                success: true,
                completedAt: now,
                error: null,
              }
            : {
                error: {
                  code: completion.error.code,
                  name: completion.error.name ?? 'Error',
                  message: completion.error.message,
                  details: completion.error.details,
                },
                ...(shouldRequeue
                  ? {
                      dontStartBefore: requeueTimestamp,
                      success: null,
                      completedAt: null,
                      startedAt: null,
                    }
                  : requeueRequested && hasAlreadyReachedMaxRequeues
                    ? { maxRequeuesReached: true }
                    : {
                        success: false,
                        completedAt: now,
                      }),
              }),
          systemLog: sql<
            SystemLogEntry[]
          >`coalesce(${tasksTable.systemLog}, '[]'::jsonb) || ${JSON.stringify(systemLogs.map(serializeLogEntry))}::jsonb`,
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

    if (updatedTask && shouldRequeue) {
      await this.eventService.emitRunnableTaskEnqueuedEvent(updatedTask, tx)
    }

    if (!updatedTask) {
      throw new ConflictException('Failed to register task completion task.')
    }

    // `in` check narrows away invocation kinds (task_update_child) that have no onComplete slot.
    if ('onComplete' in task.invocation && task.invocation.onComplete?.length) {
      for (let i = 0; i < task.invocation.onComplete.length; i++) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const onCompleteHandler = task.invocation.onComplete[i]!
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
            ownerId: updatedTask.ownerId,
            taskIdentifier: onCompleteHandler.taskIdentifier,
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
            correlationKey: updatedTask.correlationKey ?? undefined,
            taskIdentifier: onCompleteHandler.taskIdentifier,
            taskDataTemplate: onCompleteHandler.dataTemplate ?? {},
            targetUserId: updatedTask.targetUserId ?? undefined,
            targetLocation: updatedTask.targetLocationFolderId
              ? {
                  folderId: updatedTask.targetLocationFolderId,
                  objectKey: updatedTask.targetLocationObjectKey ?? undefined,
                }
              : undefined,
            storageAccessPolicy: updatedTask.storageAccessPolicy ?? undefined,
            handlerIndex: i,
            options: { tx },
          })
        }
      }
    }

    this.asyncTaskUpdateBroadcasterService.handleTaskUpdate(
      updatedTask,
      completion.success
        ? TaskUpdateType.task_completed
        : TaskUpdateType.task_failed,
      now,
    )

    if (shouldRequeue) {
      this.asyncTaskUpdateBroadcasterService.handleTaskUpdate(
        updatedTask,
        TaskUpdateType.task_requeued,
        now,
      )
    }

    return updatedTask
  }

  async registerTaskProgress(
    taskId: string,
    progressReport: TaskProgressReport,
    tx?: OrmService['db'],
  ): Promise<{
    task: Task
    storedProgressReport: ReceivedTaskProgressReport
  } | null> {
    const now = new Date()
    const storedProgressReport: ReceivedTaskProgressReport = {
      ...progressReport,
      receivedAt: now.toISOString(),
    }

    const db = tx ?? this.ormService.db
    const updatedTask = (
      await db
        .update(tasksTable)
        .set({
          updatedAt: now,
          latestHeartbeatAt: now,
          progressReports: sql`coalesce(${tasksTable.progressReports}, '[]'::jsonb) || ${JSON.stringify(storedProgressReport)}::jsonb`,
          ...(progressReport.details
            ? { progress: progressReport.details }
            : {}),
        })
        .where(
          and(
            eq(tasksTable.id, taskId),
            isNull(tasksTable.completedAt),
            isNotNull(tasksTable.startedAt),
          ),
        )
        .returning()
    )[0]

    if (!updatedTask) {
      return null // task not in running state
    }

    this.asyncTaskUpdateBroadcasterService.handleTaskUpdate(
      updatedTask,
      TaskUpdateType.task_progress,
      now,
      storedProgressReport,
    )

    const onProgressHandlers =
      'onProgress' in updatedTask.invocation
        ? (updatedTask.invocation.onProgress ?? [])
        : []
    for (let i = 0; i < onProgressHandlers.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const handler = onProgressHandlers[i]!
      const conditionResult = handler.condition
        ? evalProgressHandlerCondition(
            handler.condition,
            progressReport,
            updatedTask.data,
          )
        : true // no condition means always fire

      if (conditionResult) {
        await this.executeOnProgressHandler({
          parentTask: updatedTask,
          parentProgressReport: storedProgressReport,
          correlationKey: updatedTask.correlationKey ?? undefined,
          taskIdentifier: handler.taskIdentifier,
          taskDataTemplate: handler.dataTemplate ?? {},
          targetUserId: updatedTask.targetUserId ?? undefined,
          targetLocation: updatedTask.targetLocationFolderId
            ? {
                folderId: updatedTask.targetLocationFolderId,
                objectKey: updatedTask.targetLocationObjectKey ?? undefined,
              }
            : undefined,
          storageAccessPolicy: updatedTask.storageAccessPolicy ?? undefined,
          handlerIndex: i,
          options: { tx: db },
        })
      }
    }

    return { task: updatedTask, storedProgressReport }
  }
}
