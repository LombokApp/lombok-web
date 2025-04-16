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
import { and, count, eq, ilike, inArray, or, SQL } from 'drizzle-orm'
import { AppDTO } from 'src/app/dto/app.dto'
import { AppService } from 'src/app/services/app.service'
import { parseSort } from 'src/core/utils/sort.util'
import { FolderService } from 'src/folders/services/folder.service'
import { OrmService } from 'src/orm/orm.service'
import { FolderSocketService } from 'src/socket/folder/folder-socket.service'
import { type NewTask, tasksTable } from 'src/task/entities/task.entity'
import type { User } from 'src/users/entities/user.entity'
import { v4 as uuidV4 } from 'uuid'

import { EventsListQueryParamsDTO } from '../dto/events-list-query-params.dto'
import { FolderEventsListQueryParamsDTO } from '../dto/folder-events-list-query-params.dto'
import type { Event } from '../entities/event.entity'
import { EventLevel, eventsTable } from '../entities/event.entity'

export enum EventSort {
  CreatedAtAsc = 'createdAt-asc',
  CreatedAtDesc = 'createdAt-desc',
  UpdatedAtAsc = 'updatedAt-asc',
  UpdatedAtDesc = 'updatedAt-desc',
}

export const APP_NS_PREFIX = 'app:'

@Injectable()
export class EventService {
  get folderService(): FolderService {
    return this._folderService as FolderService
  }
  get folderSocketService(): FolderSocketService {
    return this._folderSocketService as FolderSocketService
  }

  get appService(): AppService {
    return this._appService as AppService
  }

  constructor(
    private readonly ormService: OrmService,
    @Inject(forwardRef(() => FolderSocketService))
    private readonly _folderSocketService,
    @Inject(forwardRef(() => FolderService)) private readonly _folderService,
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
    emitterIdentifier: string // "core" for internally emitted events, and "app:<appIdentifier>" for app emitted events
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
    const isAppEmitter = emitterIdentifier.startsWith(APP_NS_PREFIX)
    const isCoreEmitter = emitterIdentifier === 'core'
    const appIdentifier = isAppEmitter
      ? emitterIdentifier.slice(APP_NS_PREFIX.length)
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

      // Emit EVENT_CREATED to folder room if folderId is present
      if (locationContext?.folderId) {
        this.folderSocketService.sendToFolderRoom(
          locationContext.folderId,
          FolderPushMessage.EVENT_CREATED as FolderPushMessage,
          { event },
        )
      }

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
          ownerIdentifier: `${APP_NS_PREFIX}${appIdentifier!.toUpperCase()}`,
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
                ownerIdentifier: `${APP_NS_PREFIX}${taskRequest.appIdentifier.toUpperCase()}`,
                createdAt: now,
                updatedAt: now,
              }),
            ),
        )
        if (tasks.length) {
          await db.insert(tasksTable).values(tasks)
        }

        // notify folder rooms of new tasks
        tasks.forEach((_task) => {
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

  async getFolderEventAsUser(
    actor: User,
    { folderId, eventId }: { folderId: string; eventId: string },
  ): Promise<Event> {
    const { folder } = await this.folderService.getFolderAsUser(actor, folderId)

    const event = await this.ormService.db.query.eventsTable.findFirst({
      where: and(
        eq(eventsTable.folderId, folder.id),
        eq(eventsTable.id, eventId),
      ),
    })

    if (!event) {
      // no event matching the given input
      throw new NotFoundException()
    }

    return event
  }

  async listFolderEventsAsUser(
    actor: User,
    { folderId }: { folderId: string },
    queryParams: FolderEventsListQueryParamsDTO,
  ) {
    // ACL check
    const { folder } = await this.folderService.getFolderAsUser(actor, folderId)
    return this.listEvents({ ...queryParams, folderId: folder.id })
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
    return this.listEvents({
      offset,
      limit,
      sort,
      search,
      folderId,
      objectKey,
      includeDebug,
      includeError,
      includeTrace,
      includeWarning,
      includeInfo,
    })
  }

  async listEvents({
    offset,
    limit,
    search,
    sort = EventSort.CreatedAtAsc,
    objectKey,
    folderId,
    includeDebug,
    includeError,
    includeInfo,
    includeTrace,
    includeWarning,
  }: EventsListQueryParamsDTO) {
    const conditions: (SQL | undefined)[] = []
    if (folderId) {
      conditions.push(eq(eventsTable.folderId, folderId))
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

    if (objectKey) {
      conditions.push(eq(eventsTable.objectKey, objectKey))
    }

    const events = await this.ormService.db.query.eventsTable.findMany({
      ...(conditions.length ? { where: and(...conditions) } : {}),
      offset: Math.max(0, offset ?? 0),
      limit: Math.min(100, limit ?? 25),
      orderBy: parseSort(eventsTable, sort),
    })

    const eventsCountResult = await this.ormService.db
      .select({
        count: count(),
      })
      .from(eventsTable)
      .where(conditions.length ? and(...conditions) : undefined)

    return {
      result: events,
      meta: { totalCount: eventsCountResult[0].count },
    }
  }
}
