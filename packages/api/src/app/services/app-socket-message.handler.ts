import {
  type AppSocketMessage,
  appSocketMessageSchema,
  CORE_APP_IDENTIFIER,
  SignedURLsRequestMethod,
} from '@lombokapp/types'
import { and, eq, inArray, isNotNull, isNull, or } from 'drizzle-orm'
import type { JWTService } from 'src/auth/services/jwt.service'
import { eventsTable } from 'src/event/entities/event.entity'
import type { EventService } from 'src/event/services/event.service'
import type { FolderService } from 'src/folders/services/folder.service'
import type { LogEntryService } from 'src/log/services/log-entry.service'
import type { OrmService } from 'src/orm/orm.service'
import type { ServerConfigurationService } from 'src/server/services/server-configuration.service'
import type { S3Service } from 'src/storage/s3.service'
import type { Task } from 'src/task/entities/task.entity'
import { tasksTable } from 'src/task/entities/task.entity'
import type { z, ZodTypeAny } from 'zod'

import { appsTable } from '../entities/app.entity'
import type { AppService } from './app.service'
import type { AppSocketMessageDataMap } from './app-socket-message-schemas'
import { AppSocketMessageSchemaMap } from './app-socket-message-schemas'

export type AppSocketMessageName = z.infer<typeof AppSocketMessage>

export interface AppRequestByName<K extends AppSocketMessageName> {
  name: K
  data: AppSocketMessageDataMap[K]
}

export type ParsedRequest = {
  [K in AppSocketMessageName]: AppRequestByName<K>
}[AppSocketMessageName]

export interface ParseError {
  error: true
  details?: unknown
}

export function parseAppSocketRequest(
  message: unknown,
): ParsedRequest | ParseError {
  const parsedMessage = appSocketMessageSchema.safeParse(message)
  if (!parsedMessage.success) {
    return { error: true, details: parsedMessage.error }
  }
  const schema: ZodTypeAny | undefined =
    AppSocketMessageSchemaMap[parsedMessage.data.name]
  const parsed = schema.safeParse(parsedMessage.data.data)

  if (parsed.success) {
    return parsedMessage.data as ParsedRequest
  }

  return { error: true, details: parsed.error }
}

export async function handleAppSocketMessage(
  handlerId: string,
  requestingAppIdentifier: string,
  message: unknown,
  {
    eventService,
    ormService,
    logEntryService,
    folderService,
    appService,
    jwtService,
    serverConfigurationService,
    s3Service,
  }: {
    eventService: EventService
    ormService: OrmService
    logEntryService: LogEntryService
    folderService: FolderService
    jwtService: JWTService
    appService: AppService
    serverConfigurationService: ServerConfigurationService
    s3Service: S3Service
  },
) {
  const parsed = parseAppSocketRequest(message)
  if ('error' in parsed) {
    return {
      result: undefined,
      error: {
        code: 400,
        message: 'Invalid request.',
        details: parsed.details,
      },
    }
  }
  const { name: messageName, data: requestData } = parsed
  const isCoreApp = requestingAppIdentifier === CORE_APP_IDENTIFIER
  switch (messageName) {
    case 'GET_APP_USER_ACCESS_TOKEN':
      return {
        result: await appService.createAppUserAccessTokenAsApp({
          actor: { appIdentifier: requestingAppIdentifier },
          userId: requestData.userId,
        }),
      }
    case 'EMIT_EVENT':
      try {
        const app = await appService.getAppAsAdmin(requestingAppIdentifier, {
          enabled: true,
        })
        if (!app) {
          return {
            result: { success: false },
            error: { code: 404, message: 'App not found.' },
          }
        }
        if (!app.config.emittableEvents.includes(requestData.eventIdentifier)) {
          return {
            result: { success: false },
            error: { code: 403, message: 'Event not emittable.' },
          }
        }
        await eventService.emitEvent({
          emitterIdentifier: requestingAppIdentifier,
          eventIdentifier: requestData.eventIdentifier,
          data: requestData.data,
        })
        return { result: { success: true } }
      } catch {
        return {
          result: { success: false },
          error: { code: 500, message: 'Internal server error.' },
        }
      }
    case 'DB_QUERY': {
      const result = await ormService.executeQueryForApp(
        requestingAppIdentifier,
        requestData.sql,
        requestData.params,
        requestData.rowMode,
      )
      return {
        result: {
          command: result.command,
          rowCount: result.rowCount,
          oid: result.oid,
          rows: result.rows,
          fields: result.fields,
        },
      }
    }
    case 'DB_EXEC':
      return {
        result: await ormService.executeExecForApp(
          requestingAppIdentifier,
          requestData.sql,
          requestData.params,
        ),
      }
    case 'DB_BATCH':
      return {
        result: await ormService.executeBatchForApp(
          requestingAppIdentifier,
          requestData.steps,
          requestData.atomic,
        ),
      }
    case 'SAVE_LOG_ENTRY':
      await logEntryService.emitLog({
        emitterIdentifier: requestingAppIdentifier,
        logMessage: requestData.message,
        data: requestData.data,
        level: requestData.level,
        subjectContext: requestData.subjectContext,
      })
      return { result: undefined }
    case 'GET_CONTENT_SIGNED_URLS':
      return { result: await appService.createSignedContentUrls(requestData) }
    case 'GET_METADATA_SIGNED_URLS':
      return { result: await appService.createSignedMetadataUrls(requestData) }
    case 'UPDATE_CONTENT_METADATA':
      await folderService.updateFolderObjectMetadata(
        requestingAppIdentifier,
        requestData.updates,
      )
      return { result: undefined }
    case 'COMPLETE_HANDLE_TASK': {
      const task = await ormService.db.query.tasksTable.findFirst({
        where: and(
          eq(tasksTable.id, requestData.taskId),
          isNull(tasksTable.completedAt),
          isNull(tasksTable.errorAt),
          eq(tasksTable.handlerId, `${requestingAppIdentifier}:${handlerId}`),
          ...(isCoreApp
            ? [
                or(
                  eq(tasksTable.handlerIdentifier, 'worker'),
                  eq(tasksTable.ownerIdentifier, requestingAppIdentifier),
                ),
              ]
            : [
                eq(tasksTable.handlerIdentifier, 'external'),
                eq(tasksTable.ownerIdentifier, requestingAppIdentifier),
              ]),
        ),
      })
      if (!task) {
        return {
          error: {
            code: 400,
            message: 'Invalid request.',
            details: 'No task found.',
          },
        }
      }
      const now = new Date()
      return {
        result: await ormService.db
          .update(tasksTable)
          .set({ completedAt: now, updatedAt: now })
          .where(eq(tasksTable.id, task.id)),
      }
    }
    case 'ATTEMPT_START_HANDLE_ANY_AVAILABLE_TASK': {
      let securedTask: Task | undefined = undefined
      for (let attempt = 0; attempt < 5; attempt++) {
        const task = await ormService.db.query.tasksTable.findFirst({
          where: and(
            eq(tasksTable.ownerIdentifier, requestingAppIdentifier),
            inArray(tasksTable.taskIdentifier, requestData.taskIdentifiers),
            isNull(tasksTable.startedAt),
          ),
        })
        if (!task || task.completedAt || task.handlerId || task.startedAt) {
          break
        }
        const now = new Date()
        const securedTasks = await ormService.db
          .update(tasksTable)
          .set({
            startedAt: now,
            updatedAt: now,
            handlerId: `${requestingAppIdentifier}:${handlerId}`,
          })
          .where(and(eq(tasksTable.id, task.id), isNull(tasksTable.startedAt)))
          .returning()

        if (securedTasks.length > 0) {
          securedTask = securedTasks[0]
          break
        }
      }
      if (!securedTask) {
        return {
          result: undefined,
          error: {
            code: 409,
            message:
              'Task already started by another handler after 5 attempts.',
          },
        }
      }
      const event = await ormService.db.query.eventsTable.findFirst({
        where: eq(eventsTable.id, securedTask.triggeringEventId),
      })
      return { result: { ...securedTask, event } }
    }
    case 'ATTEMPT_START_HANDLE_WORKER_TASK_BY_ID': {
      if (!isCoreApp) {
        return {
          result: undefined,
          error: {
            code: 403,
            message: 'Unauthorized to handle worker tasks.',
          },
        }
      }
      const rows = await ormService.db
        .select({ task: tasksTable, app: appsTable })
        .from(tasksTable)
        .innerJoin(
          appsTable,
          eq(tasksTable.ownerIdentifier, appsTable.identifier),
        )
        .where(eq(tasksTable.id, requestData.taskId))
        .limit(1)
      if (rows.length === 0) {
        return {
          result: undefined,
          error: {
            code: 400,
            message: 'Invalid request (no task found by id).',
          },
        }
      }
      const { task } = rows[0]
      if (task.startedAt || task.completedAt || task.handlerId) {
        return {
          result: undefined,
          error: { code: 400, message: 'Task already started.' },
        }
      }
      const now = new Date()
      const updatedTask = (
        await ormService.db
          .update(tasksTable)
          .set({
            startedAt: now,
            updatedAt: now,
            handlerId: `${requestingAppIdentifier}:${handlerId}`,
          })
          .where(eq(tasksTable.id, task.id))
          .returning()
      )[0]
      const event = await ormService.db.query.eventsTable.findFirst({
        where: eq(eventsTable.id, updatedTask.triggeringEventId),
      })
      return { result: { ...updatedTask, event } }
    }
    case 'FAIL_HANDLE_TASK': {
      const taskWithApp = await ormService.db
        .select({ task: tasksTable, app: appsTable })
        .from(tasksTable)
        .innerJoin(
          appsTable,
          eq(tasksTable.ownerIdentifier, appsTable.identifier),
        )
        .where(
          and(
            eq(tasksTable.id, requestData.taskId),
            isNotNull(tasksTable.startedAt),
            isNull(tasksTable.completedAt),
            isNull(tasksTable.errorAt),
            eq(tasksTable.handlerId, `${requestingAppIdentifier}:${handlerId}`),
            ...(isCoreApp
              ? [
                  or(
                    eq(tasksTable.handlerIdentifier, 'worker'),
                    eq(tasksTable.ownerIdentifier, requestingAppIdentifier),
                  ),
                ]
              : [
                  eq(tasksTable.handlerIdentifier, 'external'),
                  eq(tasksTable.ownerIdentifier, requestingAppIdentifier),
                ]),
          ),
        )
        .limit(1)
      const task = taskWithApp[0]?.task as Task | undefined
      if (!task) {
        return {
          result: undefined,
          error: { code: 400, message: 'Invalid request.' },
        }
      }
      const now = new Date()
      return {
        result: await ormService.db
          .update(tasksTable)
          .set({
            errorCode: requestData.error.code,
            errorMessage: requestData.error.message,
            errorDetails: requestData.error.details,
            errorAt: now,
            updatedAt: now,
          })
          .where(eq(tasksTable.id, task.id)),
      }
    }
    case 'GET_APP_UI_BUNDLE':
      return {
        result: await appService.getAppUIbundle(
          requestingAppIdentifier,
          requestData,
        ),
      }
    case 'GET_WORKER_EXECUTION_DETAILS': {
      if (requestingAppIdentifier !== CORE_APP_IDENTIFIER) {
        return {
          result: undefined,
          error: { code: 403, message: 'Unauthorized.' },
        }
      }
      const workerApp = await appService.getAppAsAdmin(
        requestData.appIdentifier,
        {
          enabled: true,
        },
      )
      if (!workerApp) {
        return {
          result: undefined,
          error: { code: 404, message: 'Worker app not found.' },
        }
      }
      if (!(requestData.workerIdentifier in workerApp.workers.definitions)) {
        return {
          result: undefined,
          error: { code: 404, message: 'Worker not found.' },
        }
      }
      const serverStorageLocation =
        await serverConfigurationService.getServerStorage()
      if (!serverStorageLocation) {
        return {
          result: undefined,
          error: {
            code: 500,
            message: 'Server storage location not available.',
          },
        }
      }
      const presignedGetURL = s3Service.createS3PresignedUrls([
        {
          method: SignedURLsRequestMethod.GET,
          objectKey: `${serverStorageLocation.prefix ? serverStorageLocation.prefix + '/' : ''}app-bundle-storage/${requestData.appIdentifier}/workers/${workerApp.workers.hash}.zip`,
          accessKeyId: serverStorageLocation.accessKeyId,
          secretAccessKey: serverStorageLocation.secretAccessKey,
          bucket: serverStorageLocation.bucket,
          endpoint: serverStorageLocation.endpoint,
          expirySeconds: 3600,
          region: serverStorageLocation.region,
        },
      ])
      return {
        result: {
          payloadUrl: presignedGetURL[0],
          entrypoint:
            workerApp.workers.definitions[requestData.workerIdentifier]
              .entrypoint,
          environmentVariables:
            workerApp.workers.definitions[requestData.workerIdentifier]
              .environmentVariables,
          workerToken: await jwtService.createAppWorkerToken(
            requestData.appIdentifier,
          ),
          hash: workerApp.workers.hash,
        },
      }
    }
    case 'GET_APP_STORAGE_SIGNED_URLS':
      return {
        result: await appService.createSignedAppStorageUrls(
          requestingAppIdentifier,
          requestData,
        ),
      }
    case 'AUTHENTICATE_USER': {
      try {
        const decodedJWT = jwtService.decodeJWT(requestData.token)
        if (!decodedJWT.payload || typeof decodedJWT.payload === 'string') {
          return {
            result: { userId: '', success: false },
            error: { code: 401, message: 'Invalid token payload' },
          }
        }
        const subject = decodedJWT.payload.sub
        if (!subject || typeof subject !== 'string') {
          return {
            result: { userId: '', success: false },
            error: { code: 401, message: 'Invalid token subject' },
          }
        }
        const subjectParts = subject.split(':')
        if (subjectParts.length !== 3 || subjectParts[0] !== 'app_user') {
          return {
            result: { userId: '', success: false },
            error: { code: 401, message: 'Invalid token format' },
          }
        }
        const userId = subjectParts[1]
        const tokenAppIdentifier = subjectParts[2]
        if (tokenAppIdentifier !== requestData.appIdentifier) {
          return {
            result: { userId: '', success: false },
            error: { code: 401, message: 'Token app identifier mismatch' },
          }
        }
        jwtService.verifyAppUserJWT({
          token: requestData.token,
          userId,
          appIdentifier: requestData.appIdentifier,
        })
        return { result: { userId, success: true } }
      } catch (error) {
        return {
          result: { userId: '', success: false },
          error: {
            code: 401,
            message:
              error instanceof Error ? error.message : 'Authentication failed',
          },
        }
      }
    }
  }
  return {
    result: undefined,
    error: { code: 400, message: 'Request unrecognized or malformed.' },
  }
}
