import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { eq, sql } from 'drizzle-orm'
import { AppService } from 'src/app/services/app.service'
import { OrmService } from 'src/orm/orm.service'
import type { NewTask } from 'src/task/entities/task.entity'
import { tasksTable } from 'src/task/entities/task.entity'
import type { User } from 'src/users/entities/user.entity'
import { v4 as uuidV4 } from 'uuid'

import type { Event } from '../entities/event.entity'
import { eventsTable } from '../entities/event.entity'
import { FolderPushMessage } from '@stellariscloud/types'
import { FolderSocketService } from 'src/socket/folder/folder-socket.service'
import { AppDTO } from 'src/app/dto/app.dto'

@Injectable()
export class EventService {
  private readonly appService: AppService
  get folderSocketService(): FolderSocketService {
    return this._folderSocketService
  }

  constructor(
    @Inject(forwardRef(() => FolderSocketService))
    private readonly _folderSocketService,
    private readonly ormService: OrmService,
    @Inject(forwardRef(() => AppService)) _appService,
  ) {
    this.appService = _appService
  }

  async emitEvent({
    emitterIdentifier,
    eventKey,
    data,
    locationContext,
    userId,
  }: {
    emitterIdentifier: string // id of the inserting app
    eventKey: string
    data: any
    locationContext?: { folderId: string; objectKey?: string }
    userId?: string
  }) {
    const now = new Date()

    const authorized =
      (emitterIdentifier === 'CORE' ||
        (emitterIdentifier.startsWith('APP:') &&
          (
            await this.appService.getApp(emitterIdentifier)
          )?.emittableEvents.includes(eventKey))) ??
      false

    // console.log('emitEvent:', {
    //   eventKey,
    //   emitterIdentifier,
    //   data,
    //   authorized,
    // })

    if (!authorized) {
      throw new HttpException('ForbiddenEmitEvent', HttpStatus.FORBIDDEN)
    }

    await this.ormService.db.transaction(async (db) => {
      const [event] = await db
        .insert(eventsTable)
        .values([
          {
            id: uuidV4(),
            eventKey,
            emitterIdentifier,
            folderId: locationContext?.folderId,
            objectKey: locationContext?.objectKey,
            userId,
            createdAt: now,
            data,
          },
        ])
        .returning()

      const tasks: NewTask[] = await this.appService.getApps().then((apps) =>
        Object.keys(apps)
          .reduce<
            {
              appIdentifier: string
              taskDefinition: AppDTO['config']['tasks'][0]
            }[]
          >((acc, appIdentifier) => {
            return acc.concat(
              appIdentifier in apps
                ? apps[appIdentifier]?.config.tasks
                    .filter((taskDefinition) =>
                      taskDefinition.eventTriggers.includes(event.eventKey),
                    )
                    .map((taskDefinition) => ({
                      appIdentifier,
                      taskDefinition,
                    })) ?? []
                : [],
            )
          }, [])
          .map(
            ({ appIdentifier, taskDefinition }): NewTask => ({
              id: uuidV4(),
              triggeringEventId: event.id,
              subjectFolderId: locationContext?.folderId,
              subjectObjectKey: locationContext?.objectKey,
              taskDescription: {
                textKey: taskDefinition.key, // TODO: Determine task description based on app configs
                variables: {},
              },
              taskKey: taskDefinition.key, // TODO: determine task type based on app configs,
              inputData: {},
              ownerIdentifier: `APP:${appIdentifier}`,
              createdAt: now,
              updatedAt: now,
            }),
          ),
      )
      await db.insert(tasksTable).values(tasks)

      // notify folder rooms of new tasks
      tasks.map((task) => {
        if (task.subjectFolderId) {
          void this.folderSocketService.sendToFolderRoom(
            task.subjectFolderId,
            FolderPushMessage.TASK_ADDED,
            { task },
          )
        }
      })
    })
  }

  async notifyAllAppsOfPendingTasks() {
    // const pendingEventReceipts = await this.ormService.db
    //   .select({
    //     eventKey: eventReceiptsTable.eventKey,
    //     emitterIdentifier: eventReceiptsTable.emitterIdentifier,
    //     count: sql<number>`cast(count(${eventReceiptsTable.id}) as int)`,
    //   })
    //   .from(eventReceiptsTable)
    //   .where(isNull(eventReceiptsTable.startedAt))
    //   .groupBy(
    //     eventReceiptsTable.eventKey,
    //     eventReceiptsTable.emitterIdentifier,
    //   )
    // const pendingEventsByApp = pendingEventReceipts.reduce<{
    //   [emitterIdentifier: string]: { [key: string]: number }
    // }>(
    //   (acc, next) => ({
    //     ...acc,
    //     [next.emitterIdentifier]: {
    //       ...(next.emitterIdentifier in acc ? acc[next.emitterIdentifier] : {}),
    //       [next.eventKey]: next.count,
    //     },
    //   }),
    //   {},
    // )
    // for (const emitterIdentifier of Object.keys(pendingEventsByApp)) {
    //   for (const eventKey of Object.keys(
    //     pendingEventsByApp[emitterIdentifier],
    //   )) {
    //     const jobPayload = {
    //       emitterIdentifier,
    //       eventKey,
    //       eventCount: pendingEventsByApp[emitterIdentifier][eventKey],
    //     }
    //     // await this.queueService.addJob(
    //     //   AsyncTaskName.NotifyAppOfPendingEvents,
    //     //   jobPayload,
    //     // )
    //   }
    // }
  }

  async getEventAsAdmin(actor: User, eventId: string): Promise<Event> {
    const event = await this.ormService.db.query.eventsTable.findFirst({
      where: eq(eventsTable.id, eventId),
    })
    if (!event) {
      throw new NotFoundException()
    }
    return event
  }

  async listEventsAsAdmin(
    actor: User,
    {
      offset,
      limit,
    }: {
      offset?: number
      limit?: number
    },
  ): Promise<{ meta: { totalCount: number }; result: Event[] }> {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    const events: Event[] = await this.ormService.db.query.eventsTable.findMany(
      {
        offset: offset ?? 0,
        limit: limit ?? 25,
      },
    )
    const [eventsCount] = await this.ormService.db
      .select({ count: sql<string | null>`count(*)` })
      .from(eventsTable)

    return {
      result: events,
      meta: { totalCount: parseInt(eventsCount.count ?? '0', 10) },
    }
  }
}
