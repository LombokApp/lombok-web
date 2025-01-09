import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { CoreEvent, FolderPushMessage } from '@stellariscloud/types'
import { and, eq, ilike, inArray, or, SQL, sql } from 'drizzle-orm'
import { AppDTO } from 'src/app/dto/app.dto'
import { AppService } from 'src/app/services/app.service'
import { parseSort } from 'src/core/utils/sort.util'
import { OrmService } from 'src/orm/orm.service'
import { FolderSocketService } from 'src/socket/folder/folder-socket.service'
import type { NewTask } from 'src/task/entities/task.entity'
import { tasksTable } from 'src/task/entities/task.entity'
import type { User } from 'src/users/entities/user.entity'
import { v4 as uuidV4 } from 'uuid'

import { EventsListQueryParamsDTO } from '../dto/events-list-query-params.dto'
import type { Event } from '../entities/event.entity'
import { EventLevel, eventsTable } from '../entities/event.entity'

export enum EventSort {
  CreatedAtAsc = 'createdAt-asc',
  CreatedAtDesc = 'createdAt-desc',
  UpdatedAtAsc = 'updatedAt-asc',
  UpdatedAtDesc = 'updatedAt-desc',
}

@Injectable()
export class EventService {
  get folderSocketService(): FolderSocketService {
    return this._folderSocketService as FolderSocketService
  }

  get appService(): AppService {
    return this._appService as AppService
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
    level = EventLevel.INFO,
    locationContext,
    userId,
  }: {
    emitterIdentifier: string // "CORE" for internally emitted events, and "APP:<appIdentifier>" for app emitted events
    eventKey: CoreEvent | string
    data: unknown
    level: EventLevel
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
      ? app?.config.tasks.find((t) => t.key === triggeringTaskKey)
      : undefined

    const authorized =
      (isCoreEmitter ||
        (appIdentifier &&
          (triggeringTaskKey ||
            app?.config.emittableEvents.includes(eventKey)))) ??
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
            level,
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
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          ownerIdentifier: `APP:${appIdentifier!.toUpperCase()}`,
          createdAt: now,
          updatedAt: now,
        }
        await db.insert(tasksTable).values([triggeredTask])
      } else {
        // regular event, so we should lookup apps that have subscribed to this event
        const tasks: NewTask[] = await this.appService.listApps().then((apps) =>
          apps
            .reduce<
              {
                appIdentifier: string
                taskDefinition: AppDTO['config']['tasks'][0]
              }[]
            >(
              (acc, _app) =>
                acc.concat(
                  _app.config.tasks
                    .filter((taskDefinition) =>
                      taskDefinition.eventTriggers.includes(event.eventKey),
                    )
                    .map((taskDefinition) => ({
                      appIdentifier: _app.identifier,
                      taskDefinition,
                    })),
                ),
              [],
            )
            .map(
              (taskRequest): NewTask => ({
                id: uuidV4(),
                triggeringEventId: event.id,
                subjectFolderId: locationContext?.folderId,
                subjectObjectKey: locationContext?.objectKey,
                taskDescription: {
                  textKey: taskRequest.taskDefinition.key, // TODO: Determine task description based on app configs
                  variables: {},
                },
                taskKey: taskRequest.taskDefinition.key,
                inputData: {},
                ownerIdentifier: `APP:${taskRequest.appIdentifier.toUpperCase()}`,
                createdAt: now,
                updatedAt: now,
              }),
            ),
        )
        if (tasks.length) {
          await db.insert(tasksTable).values(tasks)
        }

        // notify folder rooms of new tasks
        tasks.map((_task) => {
          if (_task.subjectFolderId) {
            this.folderSocketService.sendToFolderRoom(
              _task.subjectFolderId,
              FolderPushMessage.TASK_ADDED,
              { task: _task },
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
      sort = EventSort.CreatedAtDesc,
      search,
      folderId,
      objectKey,
      includeDebug,
      includeError,
      includeInfo,
      includeTrace,
      includeWarning,
    }: EventsListQueryParamsDTO,
  ): Promise<{ meta: { totalCount: number }; result: Event[] }> {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }

    const levelFilters: EventLevel[] = []
    if (includeDebug) {
      levelFilters.push(EventLevel.DEBUG)
    }
    if (includeTrace) {
      levelFilters.push(EventLevel.TRACE)
    }
    if (includeInfo) {
      levelFilters.push(EventLevel.INFO)
    }
    if (includeWarning) {
      levelFilters.push(EventLevel.WARN)
    }
    if (includeError) {
      levelFilters.push(EventLevel.ERROR)
    }
    const conditions: (SQL | undefined)[] = []
    if (search) {
      conditions.push(
        or(
          ilike(eventsTable.eventKey, `%${search}%`),
          ilike(eventsTable.emitterIdentifier, `%${search}%`),
        ),
      )
    }

    if (levelFilters.length) {
      conditions.push(inArray(eventsTable.level, levelFilters))
    }

    if (folderId) {
      conditions.push(eq(tasksTable.subjectFolderId, folderId))
      if (objectKey) {
        conditions.push(eq(tasksTable.subjectObjectKey, objectKey))
      }
    }

    const events: Event[] = await this.ormService.db.query.eventsTable.findMany(
      {
        offset: Math.max(offset ?? 0, 0),
        limit: Math.min(100, limit ?? 25),
        orderBy: parseSort(eventsTable, sort),
        where: and(...conditions),
      },
    )
    const [eventsCount] = await this.ormService.db
      .select({ count: sql<string | null>`count(*)` })
      .from(eventsTable)
      .where(and(...conditions))

    return {
      result: events,
      meta: { totalCount: parseInt(eventsCount.count ?? '0', 10) },
    }
  }
}
