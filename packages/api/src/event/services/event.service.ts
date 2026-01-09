import {
  AppTaskConfig,
  CORE_IDENTIFIER,
  CoreEvent,
  eventIdentifierSchema,
  FolderPushMessage,
  JsonSerializableObject,
  ScheduleTaskTriggerConfig,
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
import {
  and,
  arrayContains,
  count,
  desc,
  eq,
  gte,
  ilike,
  or,
  SQL,
} from 'drizzle-orm'
import { appsTable } from 'src/app/entities/app.entity'
import { AppService } from 'src/app/services/app.service'
import { normalizeSortParam, parseSort } from 'src/core/utils/sort.util'
import { evalTriggerHandlerCondition } from 'src/event/util/eval-trigger-condition.util'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { FolderService } from 'src/folders/services/folder.service'
import { OrmService } from 'src/orm/orm.service'
import { FolderSocketService } from 'src/socket/folder/folder-socket.service'
import {
  CORE_EVENT_TRIGGERS_TO_TASKS_MAP,
  CORE_TASKS,
} from 'src/task/constants/core-tasks.constants'
import { type NewTask, tasksTable } from 'src/task/entities/task.entity'
import { CoreTaskService } from 'src/task/services/core-task.service'
import { getUtcScheduleBucket } from 'src/task/util/schedule-bucket.util'
import { withTaskIdempotencyKey } from 'src/task/util/task-idempotency-key.util'
import { User } from 'src/users/entities/user.entity'
import { v4 as uuidV4 } from 'uuid'

import type { Event } from '../entities/event.entity'
import { eventsTable } from '../entities/event.entity'
import { parseDataFromEventWithTrigger } from './event-template.util'

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
  private isProcessingScheduleTriggers = false
  get folderService(): FolderService {
    return this._folderService as FolderService
  }
  get folderSocketService(): FolderSocketService {
    return this._folderSocketService as FolderSocketService
  }

  get appService(): AppService {
    return this._appService as AppService
  }

  get coreTaskService(): CoreTaskService {
    return this._coreTaskService as CoreTaskService
  }

  constructor(
    private readonly ormService: OrmService,
    @Inject(forwardRef(() => CoreTaskService))
    private readonly _coreTaskService,
    @Inject(forwardRef(() => FolderSocketService))
    private readonly _folderSocketService,
    @Inject(forwardRef(() => FolderService)) private readonly _folderService,
    @Inject(forwardRef(() => AppService)) private readonly _appService,
  ) {}

  private getScheduleIntervalMs(scheduleTrigger: ScheduleTaskTriggerConfig) {
    if (scheduleTrigger.config.unit === 'minutes') {
      return scheduleTrigger.config.interval * 60 * 1000
    }
    if (scheduleTrigger.config.unit === 'hours') {
      return scheduleTrigger.config.interval * 60 * 60 * 1000
    }
    return scheduleTrigger.config.interval * 24 * 60 * 60 * 1000
  }

  private resolveTaskHandler(taskDefinition: AppTaskConfig): {
    handlerType: NewTask['handlerType']
    handlerIdentifier?: NewTask['handlerIdentifier']
  } {
    return {
      handlerType: taskDefinition.handler.type,
      handlerIdentifier: taskDefinition.handler.identifier,
    }
  }

  async processScheduledTaskTriggers() {
    if (this.isProcessingScheduleTriggers) {
      this.logger.warn(
        'Skipping scheduled trigger processing; previous run still in progress',
      )
      return
    }

    this.isProcessingScheduleTriggers = true
    try {
      const now = new Date()
      const nowMs = now.getTime()
      const enabledApps = await this.ormService.db.query.appsTable.findMany({
        where: eq(appsTable.enabled, true),
        columns: {
          identifier: true,
          config: true,
        },
      })

      const tasksToInsert: NewTask[] = []

      for (const app of enabledApps) {
        const scheduleTriggers = (app.config.triggers ?? []).filter(
          (trigger) => trigger.kind === 'schedule',
        )

        if (!scheduleTriggers.length) {
          continue
        }

        for (const scheduleTrigger of scheduleTriggers) {
          const intervalMs = this.getScheduleIntervalMs(scheduleTrigger)
          const earliestAllowed = new Date(nowMs - intervalMs)

          const taskDefinition = app.config.tasks?.find(
            (task) => task.identifier === scheduleTrigger.taskIdentifier,
          )

          if (!taskDefinition) {
            this.logger.error(
              `Task definition not found: ${scheduleTrigger.taskIdentifier}`,
            )
            continue
          }

          const { handlerType, handlerIdentifier } =
            this.resolveTaskHandler(taskDefinition)

          const newTask = withTaskIdempotencyKey({
            id: uuidV4(),
            trigger: {
              kind: 'schedule',
              invokeContext: {
                timestampBucket: getUtcScheduleBucket(
                  scheduleTrigger.config,
                  now,
                ).bucketStart.toISOString(),
                name: scheduleTrigger.name,
                config: {
                  interval: scheduleTrigger.config.interval,
                  unit: scheduleTrigger.config.unit,
                },
              },
            },
            taskIdentifier: taskDefinition.identifier,
            storageAccessPolicy: [],
            taskDescription: taskDefinition.description,
            data: {},
            ownerIdentifier: app.identifier,
            createdAt: now,
            updatedAt: now,
            handlerType,
            handlerIdentifier,
          })

          const existingTask =
            await this.ormService.db.query.tasksTable.findFirst({
              columns: { id: true, createdAt: true },
              where: and(
                eq(tasksTable.ownerIdentifier, app.identifier),
                eq(tasksTable.taskIdentifier, newTask.taskIdentifier),
                eq(tasksTable.idempotencyKey, newTask.idempotencyKey),
                gte(tasksTable.createdAt, earliestAllowed),
              ),
              orderBy: desc(tasksTable.createdAt),
            })

          if (existingTask) {
            continue
          }
          tasksToInsert.push(newTask)
        }
      }

      if (!tasksToInsert.length) {
        return
      }

      await this.ormService.db.transaction(async (tx) => {
        await tx.insert(tasksTable).values(tasksToInsert)

        for (const task of tasksToInsert) {
          if (task.handlerType === 'runtime' || task.handlerType === 'docker') {
            await this.emitRunnableTaskEnqueuedEvent(task, tx)
          }
        }
      })
    } catch (error) {
      this.logger.error(
        'Failed to process scheduled task triggers',
        error as Error,
      )
    } finally {
      this.isProcessingScheduleTriggers = false
    }
  }

  async _emitEventInTx(
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
    tx: OrmService['db'],
  ) {
    if (!eventIdentifierSchema.safeParse(eventIdentifier).success) {
      throw new InternalServerErrorException(
        `Invalid event identifier: ${eventIdentifier}`,
      )
    }

    const now = new Date()

    const isCoreEmitter = emitterIdentifier === CORE_IDENTIFIER
    const appIdentifier = !isCoreEmitter ? emitterIdentifier : undefined

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

    if (appIdentifier) {
      try {
        if (targetLocation) {
          await this.appService.validateAppFolderAccess({
            appIdentifier,
            folderId: targetLocation.folderId,
          })
        } else if (targetUserId) {
          await this.appService.validateAppUserAccess({
            appIdentifier,
            userId: targetUserId,
          })
        }
      } catch (error) {
        if (error instanceof UnauthorizedException) {
          this.logger.warn('Unauthorized to emit event', {
            eventIdentifier,
            emitterIdentifier,
            data,
            target: {
              location: targetLocation,
              userId: targetUserId,
            },
          })
          return
        }
        throw error
      }
    }

    this.logger.debug(
      `EventService.emitEvent identifier=${eventIdentifier} emitterIdentifier=${emitterIdentifier} targetLocation=${JSON.stringify(targetLocation)} targetUserId=${targetUserId}`,
    )

    const events = await tx
      .insert(eventsTable)
      .values([
        {
          id: uuidV4(),
          eventIdentifier,
          emitterIdentifier,
          targetLocationFolderId: targetLocation?.folderId,
          targetLocationObjectKey: targetLocation?.objectKey,
          targetUserId,
          createdAt: now,
          data,
        },
      ])
      .returning()

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const event = events[0]!

    // regular event, so we should lookup apps that have subscribed to this event
    const eventTriggerIdentifier = isCoreEmitter
      ? `${CORE_IDENTIFIER}:${eventIdentifier}`
      : eventIdentifier

    const subscribedApps = isCoreEmitter
      ? await tx.query.appsTable.findMany({
          where: and(
            arrayContains(appsTable.subscribedCoreEvents, [
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
        try {
          if (targetLocation) {
            await this.appService.validateAppFolderAccess({
              appIdentifier: subscribedApp.identifier,
              folderId: targetLocation.folderId,
            })
          } else if (targetUserId) {
            await this.appService.validateAppUserAccess({
              appIdentifier: subscribedApp.identifier,
              userId: targetUserId,
            })
          }
        } catch (error) {
          if (error instanceof UnauthorizedException) {
            // App is not enabled for this user or folder
            return Promise.resolve()
          }
        }
        return Promise.all(
          (subscribedApp.config.triggers ?? []).map(
            async (trigger, eventTriggerConfigIndex) => {
              if (
                trigger.kind === 'event' &&
                trigger.eventIdentifier === eventTriggerIdentifier
              ) {
                const taskDefinition = subscribedApp.config.tasks?.find(
                  (task) => task.identifier === trigger.taskIdentifier,
                )
                if (!taskDefinition) {
                  this.logger.error(
                    `Task definition not found for app "${subscribedApp.identifier}" and trigger "${trigger.kind}": ${trigger.taskIdentifier}`,
                  )
                  return Promise.resolve()
                }

                const triggerConditionResult = trigger.condition
                  ? evalTriggerHandlerCondition(trigger.condition, event)
                  : undefined

                if (trigger.condition && triggerConditionResult === false) {
                  this.logger.debug(
                    `Trigger condition failed for app "${subscribedApp.identifier}" and trigger "${trigger.kind}": ${trigger.taskIdentifier}, on event: ${event.id} (${event.eventIdentifier})`,
                  )
                  return Promise.resolve()
                }

                // Build the base task object
                const task: NewTask = withTaskIdempotencyKey({
                  id: uuidV4(),
                  trigger: {
                    ...trigger,
                    invokeContext: this.buildEventInvocation(
                      event,
                      eventTriggerConfigIndex,
                    ),
                  },
                  targetLocationFolderId: targetLocation?.folderId,
                  targetLocationObjectKey: targetLocation?.objectKey,
                  taskDescription: taskDefinition.description,
                  taskIdentifier: taskDefinition.identifier,
                  data: trigger.dataTemplate
                    ? await parseDataFromEventWithTrigger(
                        trigger.dataTemplate,
                        event,
                        {
                          createPresignedUrl:
                            this.folderService.dataTemplateFunctions.buildCreatePresignedUrlFunction(
                              subscribedApp.identifier,
                            ),
                        },
                      )
                    : {},
                  storageAccessPolicy: [],
                  ownerIdentifier: subscribedApp.identifier,
                  systemLog: [
                    {
                      at: new Date(),
                      logType: 'started',
                      message: 'Task is started',
                    },
                  ],
                  createdAt: now,
                  updatedAt: now,
                  handlerType: taskDefinition.handler.type,
                  handlerIdentifier: (
                    taskDefinition.handler as { identifier: string } | undefined
                  )?.identifier,
                })
                tasks.push(task)
                // emit a runnable task enqueued event that will trigger the creation of a docker or worker runner task
                await this.emitRunnableTaskEnqueuedEvent(task, tx)
              }
              return Promise.resolve()
            },
          ),
        )
      }),
    )

    // Insert core tasks that are subscribed to this core emitted event
    if (isCoreEmitter) {
      // Collect core tasks registered for the core event that was emitted
      tasks.push(...this.gatherCoreTasksForEvent(event, now))
    }

    if (tasks.length) {
      await tx.insert(tasksTable).values(tasks)
      // notify folder rooms of new tasks
      tasks.forEach((_task) => {
        if (_task.targetLocationFolderId) {
          this.folderSocketService.sendToFolderRoom(
            _task.targetLocationFolderId,
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

    void this.coreTaskService.startDrainCoreTasks()
  }

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
    options: { tx?: OrmService['db'] } = {},
  ) {
    const args = {
      emitterIdentifier,
      eventIdentifier,
      data,
      targetLocation,
      targetUserId,
    }
    if (options.tx) {
      return this._emitEventInTx(args, options.tx)
    } else {
      return this.ormService.db.transaction(async (tx) => {
        return this._emitEventInTx(args, tx)
      })
    }
  }

  private buildEventInvocation(event: Event, eventTriggerConfigIndex: number) {
    return {
      eventId: event.id,
      eventTriggerConfigIndex,
      emitterIdentifier: event.emitterIdentifier,
      eventIdentifier: event.eventIdentifier,
      targetUserId: event.targetUserId ?? undefined,
      targetLocation: event.targetLocationFolderId
        ? {
            folderId: event.targetLocationFolderId,
            objectKey: event.targetLocationObjectKey ?? undefined,
          }
        : undefined,
      eventData: event.data ?? {},
    }
  }

  gatherCoreTasksForEvent(event: Event, timestamp: Date): NewTask[] {
    if (event.emitterIdentifier !== CORE_IDENTIFIER) {
      return []
    }

    const coreTaskDefinitions =
      CORE_EVENT_TRIGGERS_TO_TASKS_MAP[event.eventIdentifier as CoreEvent] ?? []

    const coreTasks: NewTask[] = coreTaskDefinitions.map(
      (
        {
          taskIdentifier,
          buildData,
          buildTargetLocation,
          calculateDontStartBefore,
        },
        eventTriggerConfigIndex,
      ) => {
        const targetLocation = buildTargetLocation?.(event)
        return withTaskIdempotencyKey({
          id: crypto.randomUUID(),
          trigger: {
            kind: 'event',
            invokeContext: this.buildEventInvocation(
              event,
              eventTriggerConfigIndex,
            ),
          },
          storageAccessPolicy: [],
          taskIdentifier,
          dontStartBefore: calculateDontStartBefore?.(event),
          targetLocationFolderId: targetLocation?.folderId ?? null,
          targetLocationObjectKey: targetLocation?.objectKey ?? null,
          taskDescription: CORE_TASKS[taskIdentifier].description,
          data: buildData(event),
          ownerIdentifier: CORE_IDENTIFIER,
          handlerType: CORE_IDENTIFIER,
          createdAt: timestamp,
          updatedAt: timestamp,
        })
      },
    )

    return coreTasks
  }

  /**
   * Emits a task enqueued event for a worker or docker job, which
   * will trigger the creation of a docker or worker runner task.
   *
   * @param task - The runnable task (via worker or docker).
   * @param tx - The transaction to use.
   */
  async emitRunnableTaskEnqueuedEvent(
    task: {
      id: string
      handlerType: string
      handlerIdentifier?: string | null
      ownerIdentifier: string
      dontStartBefore?: Date | null
    },
    tx: OrmService['db'],
  ) {
    if (task.handlerType === 'runtime' || task.handlerType === 'docker') {
      const event = {
        emitterIdentifier: CORE_IDENTIFIER,
        eventIdentifier:
          task.handlerType === 'runtime'
            ? CoreEvent.serverless_task_enqueued
            : CoreEvent.docker_task_enqueued,
        data: {
          dontStartBefore: task.dontStartBefore?.toISOString() ?? null,
          innerTaskId: task.id,
          appIdentifier: task.ownerIdentifier,
          ...(task.handlerType === 'runtime'
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
      await this.emitEvent(event, { tx })
    }
  }

  async getFolderEventAsUser(
    actor: User,
    { folderId, eventId }: { folderId: string; eventId: string },
  ): Promise<Event & { folder?: { name: string; ownerId: string } }> {
    const { folder } = await this.folderService.getFolderAsUser(actor, folderId)

    const result = await this.ormService.db
      .select({
        event: eventsTable,
        folderName: foldersTable.name,
        folderOwnerId: foldersTable.ownerId,
      })
      .from(eventsTable)
      .leftJoin(
        foldersTable,
        eq(foldersTable.id, eventsTable.targetLocationFolderId),
      )
      .where(
        and(
          eq(eventsTable.targetLocationFolderId, folder.id),
          eq(eventsTable.id, eventId),
        ),
      )
      .limit(1)

    const record = result.at(0)

    if (!record) {
      // no event matching the given input
      throw new NotFoundException()
    }

    return {
      ...record.event,
      targetLocation: record.event.targetLocationFolderId
        ? {
            folderId: record.event.targetLocationFolderId,
            objectKey: record.event.targetLocationObjectKey ?? undefined,
          }
        : undefined,
      folder:
        record.event.targetLocationFolderId &&
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
    const result = await this.ormService.db
      .select({
        event: eventsTable,
        folderName: foldersTable.name,
        folderOwnerId: foldersTable.ownerId,
      })
      .from(eventsTable)
      .leftJoin(
        foldersTable,
        eq(foldersTable.id, eventsTable.targetLocationFolderId),
      )
      .where(eq(eventsTable.id, eventId))
      .limit(1)
    const record = result.at(0)
    if (!record) {
      throw new NotFoundException()
    }
    return {
      ...record.event,
      targetLocation: record.event.targetLocationFolderId
        ? {
            folderId: record.event.targetLocationFolderId,
            objectKey: record.event.targetLocationObjectKey ?? undefined,
          }
        : undefined,
      folder:
        record.event.targetLocationFolderId &&
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
    const conditions: (SQL | undefined)[] = []
    if (folderId) {
      conditions.push(eq(eventsTable.targetLocationFolderId, folderId))
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
      conditions.push(eq(eventsTable.targetLocationObjectKey, objectKey))
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
        eq(foldersTable.id, eventsTable.targetLocationFolderId),
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
        targetLocation: event.targetLocationFolderId
          ? {
              folderId: event.targetLocationFolderId,
              objectKey: event.targetLocationObjectKey ?? undefined,
            }
          : undefined,
        folder:
          event.targetLocationFolderId && folderName && folderOwnerId
            ? { name: folderName, ownerId: folderOwnerId }
            : undefined,
      })),
      meta: { totalCount: eventsCountResult[0]?.count ?? 0 },
    }
  }
}
