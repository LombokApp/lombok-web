import { Injectable, NotFoundException } from '@nestjs/common'
import { and, count, eq } from 'drizzle-orm'
import { FolderService } from 'src/folders/services/folder.service'
import { OrmService } from 'src/orm/orm.service'
import type { User } from 'src/users/entities/user.entity'

import type { Task } from '../entities/task.entity'
import { tasksTable } from '../entities/task.entity'

@Injectable()
export class TaskService {
  constructor(
    private readonly ormService: OrmService,
    private readonly folderService: FolderService,
  ) {}

  async getTaskAsUser(
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

  async listTasksAsUser(
    actor: User,
    { folderId }: { folderId: string },
    {
      offset,
      limit,
      objectKey,
    }: {
      offset?: number
      limit?: number
      objectKey?: string
    },
  ) {
    const { folder } = await this.folderService.getFolderAsUser(actor, folderId)

    const folderEqCondition = eq(tasksTable.subjectFolderId, folder.id)
    const tasks = await this.ormService.db.query.tasksTable.findMany({
      where: objectKey
        ? and(eq(tasksTable.subjectObjectKey, objectKey), folderEqCondition)
        : folderEqCondition,
      offset: offset ?? 0,
      limit: limit ?? 25,
    })

    const tasksCountResult = await this.ormService.db
      .select({
        count: count(),
      })
      .from(tasksTable)
      .where(
        objectKey
          ? and(eq(tasksTable.subjectObjectKey, objectKey), folderEqCondition)
          : folderEqCondition,
      )

    return {
      result: tasks,
      meta: { totalCount: tasksCountResult[0].count },
    }
  }
}
