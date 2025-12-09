import {
  eventIdentifierSchema,
  EventTaskTrigger,
  FolderPushMessage,
  JsonSerializableObject,
  PLATFORM_IDENTIFIER,
  PlatformEvent,
} from '@lombokapp/types'
import {
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { and, arrayContains, count, eq, ilike, or, SQL, sql } from 'drizzle-orm'
import { appsTable } from 'src/app/entities/app.entity'
import { AppService } from 'src/app/services/app.service'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { FolderService } from 'src/folders/services/folder.service'
import { OrmService } from 'src/orm/orm.service'
import { normalizeSortParam, parseSort } from 'src/platform/utils/sort.util'
import { FolderSocketService } from 'src/socket/folder/folder-socket.service'
import {
  PLATFORM_EVENT_TRIGGERS_TO_TASKS_MAP,
  PLATFORM_TASKS,
} from 'src/task/constants/platform-tasks.constants'
import { type NewTask, tasksTable } from 'src/task/entities/task.entity'
import { PlatformTaskService } from 'src/task/services/platform-task.service'
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

  get platformTaskService(): PlatformTaskService {
    return this._platformTaskService as PlatformTaskService
  }

  constructor(
    private readonly ormService: OrmService,
    @Inject(forwardRef(() => PlatformTaskService))
    private readonly _platformTaskService,
    @Inject(forwardRef(() => FolderSocketService))
    private readonly _folderSocketService,
    @Inject(forwardRef(() => FolderService)) private readonly _folderService,
    @Inject(forwardRef(() => AppService)) private readonly _appService,
  ) {}

  async emitEvent(
    {
      emitterIdentifier,
      eventIdentifier,
      data,
      targetLocation,
      targetUserId,
    }: {
      emitterIdentifier: string
      eventIdentifier: string
      data: JsonSerializableObject
      targetLocation?: { folderId: string; objectKey?: string }
      targetUserId?: string
    },
    _db?: OrmService['db'],
  ) {
    if (!eventIdentifierSchema.safeParse(eventIdentifier).success) {
      throw new InternalServerErrorException(
        `Invalid event identifier: ${eventIdentifier}`,
      )
    }

    const db = _db ?? this.ormService.db
    const now = new Date()

    const isPlatformEmitter = emitterIdentifier === PLATFORM_IDENTIFIER
    const appIdentifier = !isPlatformEmitter ? emitterIdentifier : undefined

    const app = appIdentifier
      ? await this.appService.getApp(appIdentifier.toLowerCase(), {
          enabled: true,
        })
      : undefined

    if (appIdentifier && !app) {
      throw new InternalServerErrorException(
        `No app found for identifier "${appIdentifier}"`,
      )
    }

    // console.log('emitEvent:', {
    //   eventIdentifier,
    //   emitterIdentifier,
    //   data,
    //   authorized,
    //   subjectContext,
    //   userId,
    // })

    await db.transaction(async (tx) => {
      const [event] = await tx
        .insert(eventsTable)
        .values([
          {
            id: uuidV4(),
            eventIdentifier,
            emitterIdentifier,
            targetLocation,
            targetUserId,
            createdAt: now,
            data,
          },
        ])
        .returning()

      // regular event, so we should lookup apps that have subscribed to this event
      const eventTriggerIdentifier = isPlatformEmitter
        ? `${PLATFORM_IDENTIFIER}:${eventIdentifier}`
        : eventIdentifier

      const subscribedApps = isPlatformEmitter
        ? await tx.query.appsTable.findMany({
            where: and(
              arrayContains(appsTable.subscribedPlatformEvents, [
                eventTriggerIdentifier,
              ]),
              eq(appsTable.enabled, true),
            ),
            limit: 100, // TODO: manage this limit somehow
          })
        : app
          ? [app]
          : []

      const tasks: NewTask[] = []
      await Promise.all(
        subscribedApps.map(async (subscribedApp) => {
          return Promise.all(
            (subscribedApp.config.tasks ?? []).map(async (taskDefinition) => {
              if (
                taskDefinition.triggers?.find(
                  (trigger) => trigger === eventTriggerIdentifier,
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
                          handlerIdentifier: taskDefinition.handler.identifier,
                        }
                      : {
                          handlerType: 'external',
                          handlerIdentifier: undefined,
                        }
                const newTaskId = uuidV4()
                // Build the base task object
                const baseTask: NewTask = {
                  id: newTaskId,
                  trigger: this.buildEventTrigger(event),
                  targetLocation: targetLocation?.folderId
                    ? {
                        folderId: targetLocation.folderId,
                        objectKey: targetLocation.objectKey,
                      }
                    : undefined,
                  taskDescription: taskDefinition.description,
                  taskIdentifier: taskDefinition.identifier,
                  data: {},
                  ownerIdentifier: subscribedApp.identifier,
                  createdAt: now,
                  updatedAt: now,
                  handlerType,
                  handlerIdentifier,
                }
                tasks.push(baseTask)
                if (handlerType === 'worker' || handlerType === 'docker') {
                  // emit a runnable task enqueued event that will trigger the creation of a docker or worker runner task
                  await this.emitRunnableTaskEnqueuedEvent(baseTask, {
                    tx,
                  })
                }
                return Promise.resolve()
              }
            }),
          )
        }),
      )

      // Insert platform tasks that are subscribed to this event
      if (isPlatformEmitter) {
        // Collect platform tasks registered for the platform event that was emitted
        tasks.push(...this.gatherPlatformTasksForEvent(event, now))
      }

      if (tasks.length) {
        await tx.insert(tasksTable).values(tasks)
        // notify folder rooms of new tasks
        tasks.forEach((_task) => {
          if (_task.targetLocation?.folderId) {
            this.folderSocketService.sendToFolderRoom(
              _task.targetLocation.folderId,
              FolderPushMessage.TASK_ADDED,
              { task: _task },
            )
          }
        })
      }
      // Emit EVENT_CREATED to folder room if folderId is present
      if (targetLocation?.folderId) {
        this.folderSocketService.sendToFolderRoom(
          targetLocation.folderId,
          FolderPushMessage.EVENT_CREATED as FolderPushMessage,
          { event },
        )
      }
    })
    void this.platformTaskService.drainPlatformTasks()
  }

  private buildEventTrigger(event: Event): EventTaskTrigger {
    return {
      kind: 'event',
      data: {
        eventId: event.id,
        eventIdentifier: event.eventIdentifier,
        emitterIdentifier: event.emitterIdentifier,
        targetUserId: event.targetUserId ?? undefined,
        targetLocation: event.targetLocation ?? undefined,
        eventData: event.data ?? {},
      },
    }
  }

  gatherPlatformTasksForEvent(event: Event, timestamp: Date): NewTask[] {
    if (event.emitterIdentifier !== PLATFORM_IDENTIFIER) {
      return []
    }

    const platformTaskDefinitions =
      PLATFORM_EVENT_TRIGGERS_TO_TASKS_MAP[
        event.eventIdentifier as PlatformEvent
      ] ?? []

    const platformTasks: NewTask[] = platformTaskDefinitions.map(
      ({ taskIdentifier, buildData }) => ({
        id: uuidV4(),
        trigger: this.buildEventTrigger(event),
        taskIdentifier,
        taskDescription: PLATFORM_TASKS[taskIdentifier].description,
        data: buildData(event),
        ownerIdentifier: PLATFORM_IDENTIFIER,
        handlerType: PLATFORM_IDENTIFIER,
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    )

    return platformTasks
  }

  /**
   * Emits a task enqueued event for a worker or docker job, which
   * will trigger the creation of a docker or worker runner task.
   *
   * @param task - The runnable task (via worker or docker).
   * @param tx - The transaction to use.
   */
  async emitRunnableTaskEnqueuedEvent(
    task: NewTask,
    {
      tx,
    }: {
      tx: OrmService['db']
    },
  ) {
    if (task.handlerType === 'worker' || task.handlerType === 'docker') {
      const event = {
        emitterIdentifier: PLATFORM_IDENTIFIER,
        eventIdentifier:
          task.handlerType === 'worker'
            ? PlatformEvent.worker_task_enqueued
            : PlatformEvent.docker_task_enqueued,
        targetLocation: task.targetLocation ?? undefined,
        data: {
          innerTaskId: task.id,
          appIdentifier: task.ownerIdentifier,
          ...(task.handlerType === 'worker'
            ? {
                workerIdentifier: task.handlerIdentifier ?? null,
              }
            : {
                profileIdentifier:
                  task.handlerIdentifier?.split(':')[0] ?? null,
                jobClassIdentifier:
                  task.handlerIdentifier?.split(':')[1] ?? null,
              }),
        },
      }
      await this.emitEvent(event, tx)
    }
  }

  async getFolderEventAsUser(
    actor: User,
    { folderId, eventId }: { folderId: string; eventId: string },
  ): Promise<Event & { folder?: { name: string; ownerId: string } }> {
    const targetFolderId = sql<string>`(${eventsTable.targetLocation} ->> 'folderId')::uuid`
    const { folder } = await this.folderService.getFolderAsUser(actor, folderId)

    const result = await this.ormService.db
      .select({
        event: eventsTable,
        folderName: foldersTable.name,
        folderOwnerId: foldersTable.ownerId,
      })
      .from(eventsTable)
      .leftJoin(foldersTable, eq(foldersTable.id, targetFolderId))
      .where(and(eq(targetFolderId, folder.id), eq(eventsTable.id, eventId)))
      .limit(1)

    const record = result.at(0)

    if (!record) {
      // no event matching the given input
      throw new NotFoundException()
    }

    return {
      ...record.event,
      folder:
        record.event.targetLocation?.folderId &&
        record.folderName &&
        record.folderOwnerId
          ? { name: record.folderName, ownerId: record.folderOwnerId }
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
    const targetFolderId = sql<string>`(${eventsTable.targetLocation} ->> 'folderId')::uuid`
    const result = await this.ormService.db
      .select({
        event: eventsTable,
        folderName: foldersTable.name,
        folderOwnerId: foldersTable.ownerId,
      })
      .from(eventsTable)
      .leftJoin(foldersTable, eq(foldersTable.id, targetFolderId))
      .where(eq(eventsTable.id, eventId))
      .limit(1)
    const record = result.at(0)
    if (!record) {
      throw new NotFoundException()
    }
    return {
      ...record.event,
      folder:
        record.event.targetLocation?.folderId &&
        record.folderName &&
        record.folderOwnerId
          ? { name: record.folderName, ownerId: record.folderOwnerId }
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
    const targetFolderId = sql<string>`(${eventsTable.targetLocation} ->> 'folderId')::uuid`
    const targetObjectKey = sql<string>`${eventsTable.targetLocation} ->> 'objectKey'`
    const conditions: (SQL | undefined)[] = []
    if (folderId) {
      conditions.push(eq(targetFolderId, folderId))
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
      conditions.push(eq(targetObjectKey, objectKey))
    }

    const events = await this.ormService.db
      .select({
        event: eventsTable,
        folderName: foldersTable.name,
        folderOwnerId: foldersTable.ownerId,
      })
      .from(eventsTable)
      .leftJoin(
        foldersTable,
        sql`${foldersTable.id} = (${eventsTable.targetLocation} ->> 'folderId')::uuid`,
      )
      .where(conditions.length ? and(...conditions) : undefined)
      .offset(Math.max(0, offset ?? 0))
      .limit(Math.min(100, limit ?? 25))
      .orderBy(
        ...parseSort(
          eventsTable,
          normalizeSortParam(sort) ?? [EventSort.CreatedAtAsc],
        ),
      )

    const eventsCountResult = await this.ormService.db
      .select({
        count: count(),
      })
      .from(eventsTable)
      .where(conditions.length ? and(...conditions) : undefined)

    return {
      result: events.map(({ event, folderName, folderOwnerId }) => ({
        ...event,
        folder:
          event.targetLocation?.folderId && folderName && folderOwnerId
            ? { name: folderName, ownerId: folderOwnerId }
            : undefined,
      })),
      meta: { totalCount: eventsCountResult[0].count },
    }
  }
}
