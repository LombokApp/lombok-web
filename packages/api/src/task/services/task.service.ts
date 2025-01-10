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
  or,
  SQL,
  sql,
} from 'drizzle-orm'
import { parseSort } from 'src/core/utils/sort.util'
import { FolderService } from 'src/folders/services/folder.service'
import { OrmService } from 'src/orm/orm.service'
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
}

@Injectable()
export class TaskService {
  get appSocketService(): AppSocketService {
    return this._appSocketService as AppSocketService
  }
  constructor(
    private readonly ormService: OrmService,
    @Inject(forwardRef(() => AppSocketService))
    private readonly _appSocketService,
    private readonly folderService: FolderService,
  ) {}

  async getFolderTaskAsUser(
    actor: User,
    { folderId, taskId }: { folderId: string; taskId: string },
  ): Promise<Task> {
    const { folder } = await this.folderService.getFolderAsUser(actor, folderId)

    const task = await this.ormService.db.query.tasksTable.findFirst({
      where: and(
        eq(tasksTable.subjectFolderId, folder.id),
        eq(tasksTable.id, taskId),
      ),
    })

    if (!task) {
      // no task matching the given input
      throw new NotFoundException()
    }

    return task
  }

  async listFolderTasksAsUser(
    actor: User,
    { folderId }: { folderId: string },
    queryParams: FolderTasksListQueryParamsDTO,
  ) {
    // ACL check
    const { folder } = await this.folderService.getFolderAsUser(actor, folderId)
    return this.listTasks({ ...queryParams, folderId: folder.id })
  }

  listTasksAsAdmin(actor: User, queryParams: TasksListQueryParamsDTO) {
    // ACL check
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    return this.listTasks(queryParams)
  }

  async getTaskAsAdmin(actor: User, taskId: string): Promise<Task> {
    // ACL check
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }

    const task = await this.ormService.db.query.tasksTable.findFirst({
      where: eq(tasksTable.id, taskId),
    })

    if (!task) {
      // no task matching the given input
      throw new NotFoundException()
    }

    return task
  }

  async listTasks({
    offset,
    limit,
    search,
    sort = TaskSort.CreatedAtAsc,
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
          ilike(tasksTable.taskKey, `%${search}%`),
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
      orderBy: parseSort(tasksTable, sort),
    })

    const tasksCountResult = await this.ormService.db
      .select({
        count: count(),
      })
      .from(tasksTable)
      .where(conditions.length ? and(...conditions) : undefined)

    return {
      result: tasks,
      meta: { totalCount: tasksCountResult[0].count },
    }
  }

  async notifyAllAppsOfPendingTasks() {
    const pendingTasks = await this.ormService.db
      .select({
        taskKey: tasksTable.taskKey,
        ownerIdentifier: tasksTable.ownerIdentifier,
        count: sql<number>`cast(count(${tasksTable.id}) as int)`,
      })
      .from(tasksTable)
      .where(isNull(tasksTable.startedAt))
      .groupBy(tasksTable.taskKey, tasksTable.ownerIdentifier)
    const pendingTasksByApp = pendingTasks.reduce<{
      [emitterIdentifier: string]: { [key: string]: number }
    }>((acc, next) => {
      const appIdentifier = next.ownerIdentifier.slice('APP:'.length)
      return {
        ...acc,
        [appIdentifier]: {
          ...(appIdentifier in acc ? acc[appIdentifier] : {}),
          [next.taskKey]: next.count,
        },
      }
    }, {})
    for (const appIdentifier of Object.keys(pendingTasksByApp)) {
      for (const taskKey of Object.keys(pendingTasksByApp[appIdentifier])) {
        const pendingTaskCount = pendingTasksByApp[appIdentifier][taskKey]
        this.appSocketService.notifyAppWorkersOfPendingTasks(
          appIdentifier,
          taskKey,
          pendingTaskCount,
        )
      }
    }
  }
}
