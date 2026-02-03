import { CORE_IDENTIFIER } from '@lombokapp/types'
import { Injectable } from '@nestjs/common'
import { OrmService } from 'src/orm/orm.service'
import { type NewTask, tasksTable } from 'src/task/entities/task.entity'
import { CoreTaskName } from 'src/task/task.constants'
import { withTaskIdempotencyKey } from 'src/task/util/task-idempotency-key.util'

@Injectable()
export class NotificationTaskQueueService {
  constructor(private readonly ormService: OrmService) {}

  /**
   * Queue a CreateEventNotificationsProcessor task for an aggregation key.
   * @param aggregationKey - The aggregation key to process
   * @param delayMs - Optional delay in milliseconds before the task should run
   */
  async queueCreateEventNotificationsTask(
    aggregationKey: string,
    delayMs?: number,
  ): Promise<void> {
    const now = new Date()
    const dontStartBefore = delayMs
      ? new Date(now.getTime() + delayMs)
      : undefined

    const task: NewTask = withTaskIdempotencyKey({
      id: crypto.randomUUID(),
      ownerIdentifier: CORE_IDENTIFIER,
      taskIdentifier: CoreTaskName.CreateEventNotifications,
      invocation: {
        kind: 'user_action',
        invokeContext: {
          userId: 'system',
          requestId: crypto.randomUUID(),
        },
      },
      taskDescription: 'Create event notifications',
      data: { aggregationKey },
      dontStartBefore,
      createdAt: now,
      updatedAt: now,
      handlerType: 'core',
    })

    await this.ormService.db.insert(tasksTable).values(task)
  }
}
