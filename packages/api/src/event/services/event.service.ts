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
import { CoreEvent, FolderPushMessage } from '@stellariscloud/types'
import { FolderSocketService } from 'src/socket/folder/folder-socket.service'
import { AppDTO } from 'src/app/dto/app.dto'

@Injectable()
export class EventService {
  get folderSocketService(): FolderSocketService {
    return this._folderSocketService
  }

  get appService(): AppService {
    return this._appService
  }

  constructor(
    @Inject(forwardRef(() => FolderSocketService))
    private readonly _folderSocketService,
    private readonly ormService: OrmService,
    @Inject(forwardRef(() => AppService)) private readonly _appService,
  ) {}

  async emitEvent({
    emitterIdentifier,
    eventKey,
    data,
    locationContext,
    userId,
  }: {
    emitterIdentifier: string // "CORE" for internally emitted events, and "APP:<appIdentifier>" for app emitted events
    eventKey: CoreEvent | string
    data: any
    locationContext?: { folderId: string; objectKey?: string }
    userId?: string
  }) {
    const now = new Date()
    const triggeringTaskKey = eventKey.startsWith('TRIGGER_TASK:')
      ? eventKey.split(':').at(-1)
      : undefined
    const isAppEmitter = emitterIdentifier.startsWith('APP:')
    const isCoreEmitter = emitterIdentifier === 'CORE'
    const appIdentifier = isAppEmitter
      ? emitterIdentifier.slice('APP:'.length)
      : undefined

    const app = appIdentifier
      ? await this.appService.getApp(appIdentifier.toLowerCase())
      : undefined
    const task = triggeringTaskKey
      ? app?.tasks.find((t) => t.key === triggeringTaskKey)
      : undefined

    const authorized =
      (isCoreEmitter ||
        (appIdentifier &&
          (triggeringTaskKey || app?.emittableEvents.includes(eventKey)))) ??
      false

    if (triggeringTaskKey && !task) {
      throw new HttpException(
        `No task in app "${appIdentifier}" by key "${triggeringTaskKey}"`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }

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

      if (triggeringTaskKey) {
        const triggeredTask: NewTask = {
          id: uuidV4(),
          triggeringEventId: event.id,
          subjectFolderId: locationContext?.folderId,
          subjectObjectKey: locationContext?.objectKey,
          taskDescription: {
            textKey: triggeringTaskKey, // TODO: Determine task description based on app configs
            variables: {},
          },
          taskKey: triggeringTaskKey,
          inputData: {},
          ownerIdentifier: `APP:${(appIdentifier as string).toUpperCase()}`,
          createdAt: now,
          updatedAt: now,
        }
        await db.insert(tasksTable).values([triggeredTask])
      } else {
        // regular event, so we should lookup apps that have subscribed to this event
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
                taskKey: taskDefinition.key,
                inputData: {},
                ownerIdentifier: `APP:${appIdentifier.toUpperCase()}`,
                createdAt: now,
                updatedAt: now,
              }),
            ),
        )
        if (tasks.length) {
          await db.insert(tasksTable).values(tasks)
        }

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
      }
    })
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
