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
import {
  CoreEvent,
  FolderPushMessage,
  TaskInputData,
} from '@stellariscloud/types'
import { and, arrayContains, count, eq, ilike, or, SQL } from 'drizzle-orm'
import { appsTable } from 'src/app/entities/app.entity'
import { AppService } from 'src/app/services/app.service'
import { normalizeSortParam, parseSort } from 'src/platform/utils/sort.util'
import { FolderService } from 'src/folders/services/folder.service'
import { OrmService } from 'src/orm/orm.service'
import { FolderSocketService } from 'src/socket/folder/folder-socket.service'
import { type NewTask, tasksTable } from 'src/task/entities/task.entity'
import { User } from 'src/users/entities/user.entity'
import { v4 as uuidV4 } from 'uuid'

import type { Event } from '../entities/event.entity'
import { eventsTable } from '../entities/event.entity'

export enum EventSort {
  CreatedAtAsc = 'createdAt-asc',
  CreatedAtDesc = 'createdAt-desc',
  EventKeyAsc = 'eventKey-asc',
  EventKeyDesc = 'eventKey-desc',
  EmitterIdentifierAsc = 'emitterIdentifier-asc',
  EmitterIdentifierDesc = 'emitterIdentifier-desc',
  ObjectKeyAsc = 'objectKey-asc',
  ObjectKeyDesc = 'objectKey-desc',
}

export const APP_NS_PREFIX = 'app:'
export const RUN_WORKER_SCRIPT_TASK_KEY = 'RUN_WORKER_SCRIPT'

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
    @Inject(forwardRef(() => FolderSocketService))
    private readonly _folderSocketService,
    @Inject(forwardRef(() => FolderService)) private readonly _folderService,
    @Inject(forwardRef(() => AppService)) private readonly _appService,
  ) {}

  async emitEvent({
    emitterIdentifier,
    eventKey,
    data,
    subjectContext,
    userId,
  }: {
    emitterIdentifier: string // "core" for internally emitted events, and "app:<appIdentifier>" for app emitted events
    eventKey: CoreEvent | string
    data: unknown
    subjectContext?: { folderId: string; objectKey?: string }
    userId?: string
  }) {
    const now = new Date()

    const isAppEmitter = emitterIdentifier.startsWith(APP_NS_PREFIX)
    const isCoreEmitter = emitterIdentifier === 'core'
    const appIdentifier = isAppEmitter
      ? emitterIdentifier.slice(APP_NS_PREFIX.length)
      : undefined

    const app = appIdentifier
      ? await this.appService.getApp(appIdentifier.toLowerCase())
      : undefined

    if (appIdentifier && !app) {
      throw new InternalServerErrorException(
        `No app found for identifier "${appIdentifier}"`,
      )
    }

    const authorized = !!(
      isCoreEmitter || app?.config.emittableEvents.includes(eventKey)
    )

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
            subjectFolderId: subjectContext?.folderId,
            subjectObjectKey: subjectContext?.objectKey,
            userId,
            createdAt: now,
            data,
          },
        ])
        .returning()

      // Emit EVENT_CREATED to folder room if folderId is present
      if (subjectContext?.folderId) {
        this.folderSocketService.sendToFolderRoom(
          subjectContext.folderId,
          FolderPushMessage.EVENT_CREATED as FolderPushMessage,
          { event },
        )
      }

      // regular event, so we should lookup apps that have subscribed to this event
      const subscribedApps = await this.ormService.db.query.appsTable.findMany({
        where: arrayContains(appsTable.subscribedEvents, [eventKey]),
        limit: 100, // TODO: manage this limit somehow
      })

      const tasks: NewTask[] = []

      await Promise.all(
        subscribedApps.map(async (subscribedApp) => {
          return Promise.all(
            subscribedApp.config.tasks.map(async (taskDefinition) => {
              if (
                taskDefinition.triggers?.find(
                  (trigger) =>
                    trigger.type === 'event' && trigger.event === eventKey,
                )
              ) {
                const isWorkerExecutedTask = !!taskDefinition.worker?.length
                const newTaskId = uuidV4()
                // Build the base task object
                // If the task has a worker property, add workerIdentifier
                tasks.push({
                  id: isWorkerExecutedTask ? newTaskId : uuidV4(),
                  triggeringEventId: event.id,
                  subjectFolderId: subjectContext?.folderId,
                  subjectObjectKey: subjectContext?.objectKey,
                  taskDescription: taskDefinition.identifier,
                  taskIdentifier: taskDefinition.identifier,
                  inputData: {},
                  ownerIdentifier: `${APP_NS_PREFIX}${subscribedApp.identifier.toLowerCase()}`,
                  createdAt: now,
                  updatedAt: now,
                  workerIdentifier: taskDefinition.worker,
                })
                // The RUN_WORKER_SCRIPT task (only if above task is worker based)
                if (isWorkerExecutedTask) {
                  // Load the app that implements the RUN_WORKER_SCRIPT task
                  const workerScriptRunnerApp =
                    await this.appService.getWorkerScriptRunnerApp()
                  const runWorkerScriptOwnerIdentifier = workerScriptRunnerApp
                    ? `${APP_NS_PREFIX}${workerScriptRunnerApp.identifier.toLowerCase()}`
                    : undefined

                  const inputData: TaskInputData = {
                    appIdentifier: subscribedApp.identifier,
                    workerIdentifier: taskDefinition.worker ?? '',
                    taskId: newTaskId,
                  }
                  if (runWorkerScriptOwnerIdentifier) {
                    tasks.push({
                      id: uuidV4(),
                      triggeringEventId: event.id,
                      subjectFolderId: subjectContext?.folderId,
                      subjectObjectKey: subjectContext?.objectKey,
                      taskDescription: RUN_WORKER_SCRIPT_TASK_KEY,
                      taskIdentifier: RUN_WORKER_SCRIPT_TASK_KEY,
                      inputData,
                      ownerIdentifier: runWorkerScriptOwnerIdentifier,
                      createdAt: now,
                      updatedAt: now,
                    })
                  } else {
                    this.logger.error(
                      `No installed app implements the "${RUN_WORKER_SCRIPT_TASK_KEY}" task, so this worker task will not be executed.`,
                    )
                    return Promise.resolve()
                  }
                }
                return Promise.resolve()
              }
            }),
          )
        }),
      )
      if (tasks.length) {
        await db.insert(tasksTable).values(tasks)
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
          ilike(eventsTable.eventKey, `%${search}%`),
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
