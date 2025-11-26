import { PLATFORM_IDENTIFIER } from '@lombokapp/types'
import {
  forwardRef,
  Inject,
  Injectable,
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
import { EventService } from 'src/event/services/event.service'
import { FolderService } from 'src/folders/services/folder.service'
import { OrmService } from 'src/orm/orm.service'
import { normalizeSortParam, parseSort } from 'src/platform/utils/sort.util'
import { AppSocketService } from 'src/socket/app/app-socket.service'
import type { User } from 'src/users/entities/user.entity'

import { FolderTasksListQueryParamsDTO } from '../dto/folder-tasks-list-query-params.dto'
import { TasksListQueryParamsDTO } from '../dto/tasks-list-query-params.dto'
import type { Task } from '../entities/task.entity'
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
  ErrorAtAsc = 'errorAt-asc',
  ErrorAtDesc = 'errorAt-desc',
}

@Injectable()
export class TaskService {
  get appSocketService(): AppSocketService {
    return this._appSocketService as AppSocketService
  }

  constructor(
    private readonly ormService: OrmService,
    private readonly appService: AppService,
    private readonly eventService: EventService,
    @Inject(forwardRef(() => AppSocketService))
    private readonly _appSocketService,
    private readonly folderService: FolderService,
  ) {}

  async getFolderTaskAsUser(
    actor: User,
    { folderId, taskId }: { folderId: string; taskId: string },
  ): Promise<Task & { folder?: { name: string; ownerId: string } }> {
    await this.folderService.getFolderAsUser(actor, folderId)
    const task = await this.ormService.db.query.tasksTable.findFirst({
      where: and(
        eq(tasksTable.id, taskId),
        eq(tasksTable.subjectFolderId, folderId),
      ),
      with: {
        folder: true,
      },
    })
    if (!task) {
      throw new NotFoundException()
    }
    return {
      ...task,
      folder: task.folder
        ? { name: task.folder.name, ownerId: task.folder.ownerId }
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
    const task = await this.ormService.db.query.tasksTable.findFirst({
      where: eq(tasksTable.id, taskId),
      with: {
        folder: true,
      },
    })
    if (!task) {
      throw new NotFoundException()
    }
    return {
      ...task,
      folder: task.folder
        ? { name: task.folder.name, ownerId: task.folder.ownerId }
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
    const conditions: (SQL | undefined)[] = []
    if (folderId) {
      conditions.push(eq(tasksTable.subjectFolderId, folderId))
    }

    if (search) {
      conditions.push(
        or(
          ilike(tasksTable.taskIdentifier, `%${search}%`),
          ilike(tasksTable.errorMessage, `%${search}%`),
          ilike(tasksTable.errorCode, `%${search}%`),
        ),
      )
    }

    const statusFilters = ([] as (SQL | undefined)[])
      .concat(includeComplete ? [isNotNull(tasksTable.completedAt)] : [])
      .concat(includeFailed ? [isNotNull(tasksTable.errorAt)] : [])
      .concat(includeWaiting ? [isNull(tasksTable.startedAt)] : [])
      .concat(
        includeRunning
          ? [
              and(
                isNull(tasksTable.errorAt),
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
      conditions.push(eq(tasksTable.subjectObjectKey, objectKey))
    }

    const tasks = await this.ormService.db.query.tasksTable.findMany({
      ...(conditions.length ? { where: and(...conditions) } : {}),
      offset: Math.max(0, offset ?? 0),
      limit: Math.min(100, limit ?? 25),
      orderBy: parseSort(
        tasksTable,
        normalizeSortParam(sort) ?? [TaskSort.CreatedAtAsc],
      ),
      with: {
        folder: true,
      },
    })

    const tasksCountResult = await this.ormService.db
      .select({
        count: count(),
      })
      .from(tasksTable)
      .where(conditions.length ? and(...conditions) : undefined)

    return {
      result: tasks.map((task) => ({
        ...task,
        folder: task.folder
          ? { name: task.folder.name, ownerId: task.folder.ownerId }
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
          eq(tasksTable.handlerIdentifier, 'external'),
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

  /**
   * Trigger a task for a given app, using the platform event system.
   * This should be only be called by the respective app.
   *
   * @param appIdentifier - The identifier of the app to trigger the task for
   * @param taskIdentifier - The identifier of the task to trigger
   * @param inputParams - The input parameters for the task
   * @param subjectContext - The subject context for the task
   */
  async triggerAppTask(
    appIdentifier: string,
    taskIdentifier: string,
    data: unknown,
    actor: 'user' | 'app',
    subjectContext?: { folderId: string; objectKey?: string },
  ) {
    // TODO: validate the task exists for the app
    const app = await this.appService.getAppAsAdmin(appIdentifier, {
      enabled: true,
    })
    if (
      !app?.config.tasks?.find(
        (task) =>
          task.identifier === taskIdentifier && task.triggers.includes(actor),
      )
    ) {
      throw new NotFoundException(
        `Task "${taskIdentifier}" not found for app "${appIdentifier}".`,
      )
    }
    await this.eventService.emitEvent({
      emitterIdentifier: PLATFORM_IDENTIFIER,
      eventIdentifier: `${PLATFORM_IDENTIFIER}:${actor}_trigger_task_action:${appIdentifier}:${taskIdentifier}`,
      data,
      subjectContext,
    })
  }
}
