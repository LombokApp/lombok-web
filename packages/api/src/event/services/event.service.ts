import {
  DOCKER_TASK_ENQUEUED_EVENT_IDENTIFIER,
  FolderPushMessage,
  PLATFORM_IDENTIFIER,
  PlatformEvent,
  WORKER_TASK_ENQUEUED_EVENT_IDENTIFIER,
} from '@lombokapp/types'
import {
  forwardRef,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { and, arrayContains, count, eq, ilike, or, SQL } from 'drizzle-orm'
import { appsTable } from 'src/app/entities/app.entity'
import { AppService } from 'src/app/services/app.service'
import { FolderService } from 'src/folders/services/folder.service'
import { OrmService } from 'src/orm/orm.service'
import { normalizeSortParam, parseSort } from 'src/platform/utils/sort.util'
import { FolderSocketService } from 'src/socket/folder/folder-socket.service'
import { type NewTask, tasksTable } from 'src/task/entities/task.entity'
import { PlatformTaskService } from 'src/task/services/platform-task.service'
import { PlatformTaskName } from 'src/task/task.constants'
import { User } from 'src/users/entities/user.entity'
import { v4 as uuidV4 } from 'uuid'

import type { Event } from '../entities/event.entity'
import { eventsTable } from '../entities/event.entity'

export enum EventSort {
  CreatedAtAsc = 'createdAt-asc',
  CreatedAtDesc = 'createdAt-desc',
  EventIdentifierAsc = 'eventIdentifier-asc',
  EventIdentifierDesc = 'eventIdentifier-desc',
  EmitterIdentifierAsc = 'emitterIdentifier-asc',
  EmitterIdentifierDesc = 'emitterIdentifier-desc',
  ObjectKeyAsc = 'objectKey-asc',
  ObjectKeyDesc = 'objectKey-desc',
}

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name)
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
    private readonly platformTaskService: PlatformTaskService,
    @Inject(forwardRef(() => FolderSocketService))
    private readonly _folderSocketService,
    @Inject(forwardRef(() => FolderService)) private readonly _folderService,
    @Inject(forwardRef(() => AppService)) private readonly _appService,
  ) {}

  async emitEvent({
    emitterIdentifier,
    eventIdentifier,
    data = {},
    subjectContext,
    userId,
    _db,
  }: {
    emitterIdentifier: string
    eventIdentifier: PlatformEvent | string
    data?: unknown
    subjectContext?: { folderId: string; objectKey?: string }
    userId?: string
    _db?: OrmService['db']
  }) {
    const db = _db ?? this.ormService.db
    const now = new Date()

    const isPlatformEmitter = emitterIdentifier === PLATFORM_IDENTIFIER
    const isAppEmitter = !isPlatformEmitter
    const appIdentifier = isAppEmitter ? emitterIdentifier : undefined

    const app = appIdentifier
      ? await this.appService.getAppAsAdmin(appIdentifier.toLowerCase(), {
          enabled: true,
        })
      : undefined

    if (appIdentifier && !app) {
      throw new InternalServerErrorException(
        `No app found for identifier "${appIdentifier}"`,
      )
    }

    if (appIdentifier && !eventIdentifier.startsWith(`${appIdentifier}:`)) {
      throw new InternalServerErrorException(
        `Invalid eventIdentifier emitted by "${appIdentifier}" app. Event Identifier: '${appIdentifier}'`,
      )
    }

    const authorized = !!(
      isPlatformEmitter || app?.config.emittableEvents.includes(eventIdentifier)
    )

    // console.log('emitEvent:', {
    //   eventIdentifier,
    //   emitterIdentifier,
    //   data,
    //   authorized,
    //   subjectContext,
    //   userId,
    // })

    if (!authorized) {
      throw new HttpException('ForbiddenEmitEvent', HttpStatus.FORBIDDEN)
    }

    await db.transaction(async (tx) => {
      const [event] = await db
        .insert(eventsTable)
        .values([
          {
            id: uuidV4(),
            eventIdentifier,
            emitterIdentifier,
            subjectFolderId: subjectContext?.folderId,
            subjectObjectKey: subjectContext?.objectKey,
            userId,
            createdAt: now,
            data,
          },
        ])
        .returning()

      // regular event, so we should lookup apps that have subscribed to this event
      const subscribedApps = await tx.query.appsTable.findMany({
        where: and(
          arrayContains(appsTable.subscribedEvents, [eventIdentifier]),
          eq(appsTable.enabled, true),
        ),
        limit: 100, // TODO: manage this limit somehow
      })

      const tasks: NewTask[] = []

      await Promise.all(
        subscribedApps.map(async (subscribedApp) => {
          return Promise.all(
            (subscribedApp.config.tasks ?? []).map(async (taskDefinition) => {
              if (
                taskDefinition.triggers.find(
                  (trigger) => trigger === eventIdentifier,
                )
              ) {
                const { handlerType, handlerIdentifier } =
                  taskDefinition.handler.type === 'worker'
                    ? {
                        handlerType: 'worker',
                        handlerIdentifier: taskDefinition.handler.identifier,
                      }
                    : taskDefinition.handler.type === 'docker'
                      ? {
                          handlerType: 'docker',
                          handlerIdentifier: taskDefinition.handler.profile,
                        }
                      : {
                          handlerType: 'external',
                          handlerIdentifier: undefined,
                        }
                const newTaskId = uuidV4()
                // Build the base task object
                tasks.push({
                  id: newTaskId,
                  triggeringEventId: event.id,
                  subjectFolderId: subjectContext?.folderId,
                  subjectObjectKey: subjectContext?.objectKey,
                  taskDescription: taskDefinition.description,
                  taskIdentifier: taskDefinition.identifier,
                  inputData: {},
                  ownerIdentifier: subscribedApp.identifier,
                  createdAt: now,
                  updatedAt: now,
                  handlerType,
                  handlerIdentifier,
                })
                if (handlerType === 'worker') {
                  // Emit the run_worker_script event if the task is worker based
                  await this.emitEvent({
                    emitterIdentifier: PLATFORM_IDENTIFIER,
                    eventIdentifier: WORKER_TASK_ENQUEUED_EVENT_IDENTIFIER,
                    data: {
                      taskId: newTaskId,
                      appIdentifier: subscribedApp.identifier,
                      workerIdentifier: handlerIdentifier,
                    },
                    _db: tx,
                  })
                } else if (handlerType === 'docker') {
                  // Emit the docker_task_enqueued event if the task is docker based
                  await this.emitEvent({
                    emitterIdentifier: PLATFORM_IDENTIFIER,
                    eventIdentifier: DOCKER_TASK_ENQUEUED_EVENT_IDENTIFIER,
                    data: {
                      taskId: newTaskId,
                      appIdentifier: subscribedApp.identifier,
                      profile: handlerIdentifier,
                    },
                    _db: tx,
                  })
                }
                return Promise.resolve()
              }
            }),
          )
        }),
      )

      // Insert platform tasks that are subscribed to this event
      tasks.push(...this.gatherPlatformTasksForEvent(event, now))

      if (tasks.length) {
        await tx.insert(tasksTable).values(tasks)
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
      // Emit EVENT_CREATED to folder room if folderId is present
      if (subjectContext?.folderId) {
        this.folderSocketService.sendToFolderRoom(
          subjectContext.folderId,
          FolderPushMessage.EVENT_CREATED as FolderPushMessage,
          { event },
        )
      }
    })
    void this.platformTaskService.drainPlatformTasks()
  }

  gatherPlatformTasksForEvent(event: Event, timestamp: Date): NewTask[] {
    const platformEventSubscriptions = {
      [`${PLATFORM_IDENTIFIER}:user_action:${PlatformTaskName.ReindexFolder}`]:
        [
          {
            taskIdentifier: PlatformTaskName.ReindexFolder,
            taskDescription: 'Reindex folder on user request',
            shouldKeepEventSubjectContext: true,
          },
          {
            taskIdentifier: PlatformTaskName.RunDockerJob,
            taskDescription: 'Execute an async docker job',
            shouldKeepEventSubjectContext: true,
          },
        ],
    }

    const platformTasks =
      event.eventIdentifier in platformEventSubscriptions
        ? platformEventSubscriptions[
            event.eventIdentifier as keyof typeof platformEventSubscriptions
          ].map((taskDefinition) => ({
            id: uuidV4(),
            triggeringEventId: event.id,
            ...(taskDefinition.shouldKeepEventSubjectContext
              ? {
                  userId: event.userId,
                  subjectFolderId: event.subjectFolderId,
                  subjectObjectKey: event.subjectObjectKey,
                }
              : {}),
            taskDescription: taskDefinition.taskDescription,
            taskIdentifier: taskDefinition.taskIdentifier,
            inputData: {},
            ownerIdentifier: PLATFORM_IDENTIFIER,
            createdAt: timestamp,
            updatedAt: timestamp,
            handlerType: 'platform',
          }))
        : []

    return platformTasks
  }

  async getFolderEventAsUser(
    actor: User,
    { folderId, eventId }: { folderId: string; eventId: string },
  ): Promise<Event & { folder?: { name: string; ownerId: string } }> {
    const { folder } = await this.folderService.getFolderAsUser(actor, folderId)

    const event = await this.ormService.db.query.eventsTable.findFirst({
      where: and(
        eq(eventsTable.subjectFolderId, folder.id),
        eq(eventsTable.id, eventId),
      ),
      with: {
        folder: true,
      },
    })

    if (!event) {
      // no event matching the given input
      throw new NotFoundException()
    }

    return {
      ...event,
      folder: event.folder
        ? { name: event.folder.name, ownerId: event.folder.ownerId }
        : undefined,
    } as Event & { folder?: { name: string; ownerId: string } }
  }

  async listFolderEventsAsUser(
    actor: User,
    { folderId }: { folderId: string },
    queryParams: {
      search?: string
      offset?: number
      limit?: number
      sort?: EventSort[]
    },
  ) {
    // ACL check
    const { folder } = await this.folderService.getFolderAsUser(actor, folderId)
    return this.listEvents({ ...queryParams, folderId: folder.id })
  }

  async getEventAsAdmin(
    actor: User,
    eventId: string,
  ): Promise<Event & { folder?: { name: string; ownerId: string } }> {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    const event = await this.ormService.db.query.eventsTable.findFirst({
      where: eq(eventsTable.id, eventId),
      with: {
        folder: true,
      },
    })
    if (!event) {
      throw new NotFoundException()
    }
    return {
      ...event,
      folder: event.folder
        ? { name: event.folder.name, ownerId: event.folder.ownerId }
        : undefined,
    } as Event & { folder?: { name: string; ownerId: string } }
  }

  async listEventsAsAdmin(
    actor: User,
    {
      offset,
      limit,
      sort = [EventSort.CreatedAtDesc],
      search,
      folderId,
      objectKey,
    }: {
      folderId?: string
      objectKey?: string
      search?: string
      offset?: number
      limit?: number
      sort?: EventSort[]
    },
  ): Promise<{
    meta: { totalCount: number }
    result: (Event & { folder?: { name: string; ownerId: string } })[]
  }> {
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
    })
  }

  async listEvents({
    offset,
    limit,
    search,
    sort = [EventSort.CreatedAtAsc],
    objectKey,
    folderId,
  }: {
    folderId?: string
    objectKey?: string
    search?: string
    offset?: number
    limit?: number
    sort?: EventSort[]
  }) {
    const conditions: (SQL | undefined)[] = []
    if (folderId) {
      conditions.push(eq(eventsTable.subjectFolderId, folderId))
    }

    if (search) {
      conditions.push(
        or(
          ilike(eventsTable.eventIdentifier, `%${search}%`),
          ilike(eventsTable.emitterIdentifier, `%${search}%`),
        ),
      )
    }

    if (objectKey) {
      conditions.push(eq(eventsTable.subjectObjectKey, objectKey))
    }

    const events = await this.ormService.db.query.eventsTable.findMany({
      ...(conditions.length ? { where: and(...conditions) } : {}),
      offset: Math.max(0, offset ?? 0),
      limit: Math.min(100, limit ?? 25),
      orderBy: parseSort(
        eventsTable,
        normalizeSortParam(sort) ?? [EventSort.CreatedAtAsc],
      ),
      with: {
        folder: true,
      },
    })

    const eventsCountResult = await this.ormService.db
      .select({
        count: count(),
      })
      .from(eventsTable)
      .where(conditions.length ? and(...conditions) : undefined)

    return {
      result: events.map((event) => ({
        ...event,
        folder: event.folder
          ? { name: event.folder.name, ownerId: event.folder.ownerId }
          : undefined,
      })),
      meta: { totalCount: eventsCountResult[0].count },
    }
  }
}
