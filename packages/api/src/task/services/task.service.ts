import {
  JsonSerializableObject,
  PLATFORM_IDENTIFIER,
  StorageAccessPolicy,
} from '@lombokapp/types'
import { addMs } from '@lombokapp/utils'
import {
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
  ne,
  or,
  SQL,
  sql,
} from 'drizzle-orm'
import { appsTable } from 'src/app/entities/app.entity'
import { AppService } from 'src/app/services/app.service'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { FolderService } from 'src/folders/services/folder.service'
import { OrmService } from 'src/orm/orm.service'
import { normalizeSortParam, parseSort } from 'src/platform/utils/sort.util'
import { AppSocketService } from 'src/socket/app/app-socket.service'
import type { User } from 'src/users/entities/user.entity'

import { FolderTasksListQueryParamsDTO } from '../dto/folder-tasks-list-query-params.dto'
import { TasksListQueryParamsDTO } from '../dto/tasks-list-query-params.dto'
import type { NewTask, Task } from '../entities/task.entity'
import { tasksTable } from '../entities/task.entity'

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
  private readonly logger = new Logger(TaskService.name)
  get appSocketService(): AppSocketService {
    return this._appSocketService as AppSocketService
  }

  constructor(
    private readonly ormService: OrmService,
    @Inject(forwardRef(() => AppSocketService))
    private readonly _appSocketService,
    @Inject(forwardRef(() => AppService))
    private readonly _appService,
    private readonly folderService: FolderService,
  ) {
    this.appService = _appService as AppService
  }

  async getFolderTaskAsUser(
    actor: User,
    { folderId, taskId }: { folderId: string; taskId: string },
  ): Promise<Task & { folder?: { name: string; ownerId: string } }> {
    await this.folderService.getFolderAsUser(actor, folderId)
    const targetFolderId = sql<string>`${tasksTable.targetLocation} ->> 'folderId'`
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
    const targetFolderId = sql<string>`${tasksTable.targetLocation} ->> 'folderId'`
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
    const targetFolderId = sql<string>`${tasksTable.targetLocation} ->> 'folderId'`
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
      meta: { totalCount: tasksCountResult[0].count },
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
        pendingTasksByApp[appIdentifier],
      )) {
        const pendingTaskCount =
          pendingTasksByApp[appIdentifier][taskIdentifier]
        this.appSocketService.notifyAppWorkersOfPendingTasks(
          appIdentifier,
          taskIdentifier,
          pendingTaskCount,
        )
      }
    }
  }

  async triggerAppActionTask({
    appIdentifier,
    taskIdentifier,
    taskData,
    dontStartBefore,
    targetUserId,
    targetLocation,
    storageAccessPolicy,
  }: {
    appIdentifier: string
    taskIdentifier: string
    taskData: JsonSerializableObject
    dontStartBefore?: { timestamp: Date } | { delayMs: number }
    targetUserId?: string
    targetLocation?: { folderId: string; objectKey?: string }
    storageAccessPolicy?: StorageAccessPolicy
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
      trigger: { kind: 'app_action' },
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
    }

    await this.ormService.db.insert(tasksTable).values(newTask)
  }
}
