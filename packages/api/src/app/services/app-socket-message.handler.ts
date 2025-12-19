import type {
  AppSocketMessage,
  AppSocketMessageDataMap,
  AppSocketMessageResponseMap,
  JsonSerializableObject,
} from '@lombokapp/types'
import {
  appSocketMessageSchema,
  AppSocketMessageSchemaMap,
} from '@lombokapp/types'
import { HttpException } from '@nestjs/common'
import type { JWTService } from 'src/auth/services/jwt.service'
import type { EventService } from 'src/event/services/event.service'
import type { FolderService } from 'src/folders/services/folder.service'
import type { LogEntryService } from 'src/log/services/log-entry.service'
import type { OrmService } from 'src/orm/orm.service'
import type { TaskService } from 'src/task/services/task.service'
import { transformTaskToDTO } from 'src/task/transforms/task.transforms'
import type { z, ZodTypeAny } from 'zod'

import type { AppService } from './app.service'

export type AppSocketMessageName = z.infer<typeof AppSocketMessage>

export interface AppRequestByName<K extends AppSocketMessageName> {
  name: K
  data: AppSocketMessageDataMap[K]
}

export type ParsedRequest = {
  [K in AppSocketMessageName]: AppRequestByName<K>
}[AppSocketMessageName]

export interface ParseError {
  error: JsonSerializableObject
}

type AppSocketResponse<K extends AppSocketMessageName> =
  AppSocketMessageResponseMap[K]

export function parseAppSocketRequest(
  message: unknown,
): ParsedRequest | ParseError {
  const parsedMessage = appSocketMessageSchema.safeParse(message)
  if (!parsedMessage.success) {
    return {
      error: {
        fieldErrors: parsedMessage.error.flatten().fieldErrors,
      },
    }
  }
  const schema: ZodTypeAny | undefined =
    AppSocketMessageSchemaMap[parsedMessage.data.name]
  const parsed = schema.safeParse(parsedMessage.data.data)

  if (parsed.success) {
    return parsedMessage.data as ParsedRequest
  }

  return {
    error: {
      issues: parsed.error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path,
        message: issue.message,
      })),
    },
  }
}

export async function handleAppSocketMessage(
  handlerInstanceId: string,
  requestingAppIdentifier: string,
  message: unknown,
  {
    eventService,
    ormService,
    logEntryService,
    taskService,
    folderService,
    appService,
    jwtService,
  }: {
    eventService: EventService
    ormService: OrmService
    logEntryService: LogEntryService
    folderService: FolderService
    taskService: TaskService
    jwtService: JWTService
    appService: AppService
  },
): Promise<AppSocketResponse<AppSocketMessageName>> {
  const parsedRequest = parseAppSocketRequest(message)
  if ('error' in parsedRequest) {
    return {
      error: {
        code: 400,
        message: 'Invalid request.',
        details: parsedRequest.error,
      },
    }
  }

  switch (parsedRequest.name) {
    case 'GET_APP_USER_ACCESS_TOKEN':
      return {
        result: await appService.createAppUserAccessTokenAsApp({
          actor: { appIdentifier: requestingAppIdentifier },
          userId: parsedRequest.data.userId,
        }),
      }
    case 'EMIT_EVENT':
      try {
        const app = await appService.getApp(requestingAppIdentifier, {
          enabled: true,
        })
        if (!app) {
          return {
            result: { success: false },
            error: { code: 404, message: 'App not found.' },
          }
        }
        await eventService.emitEvent({
          emitterIdentifier: requestingAppIdentifier,
          eventIdentifier: parsedRequest.data.eventIdentifier,
          data: parsedRequest.data.data,
        })
        return { result: { success: true } }
      } catch {
        return {
          result: { success: false },
          error: { code: 500, message: 'Internal server error.' },
        }
      }
    case 'DB_QUERY': {
      const app = await appService.getApp(requestingAppIdentifier, {
        enabled: true,
      })
      if (!app) {
        return {
          error: { code: 404, message: 'App not found.' },
        }
      }
      if (!app.database) {
        return {
          error: {
            code: 409,
            message: 'Database is not enabled for this app.',
          },
        }
      }
      const result = await ormService.executeQueryForApp(
        requestingAppIdentifier,
        parsedRequest.data.sql,
        parsedRequest.data.params,
        parsedRequest.data.rowMode,
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
    case 'DB_EXEC': {
      const app = await appService.getApp(requestingAppIdentifier, {
        enabled: true,
      })
      if (!app) {
        return {
          error: { code: 404, message: 'App not found.' },
        }
      }
      if (!app.database) {
        return {
          error: {
            code: 409,
            message: 'Database is not enabled for this app.',
          },
        }
      }
      const result = await ormService.executeExecForApp(
        requestingAppIdentifier,
        parsedRequest.data.sql,
        parsedRequest.data.params,
      )
      return { result: { rowCount: result.rowCount } }
    }
    case 'DB_BATCH': {
      const app = await appService.getApp(requestingAppIdentifier, {
        enabled: true,
      })
      if (!app) {
        return {
          error: { code: 404, message: 'App not found.' },
        }
      }
      if (!app.database) {
        return {
          error: {
            code: 409,
            message: 'Database is not enabled for this app.',
          },
        }
      }
      const result = await ormService.executeBatchForApp(
        requestingAppIdentifier,
        parsedRequest.data.steps,
        parsedRequest.data.atomic,
      )
      return { result: { results: result.results } }
    }
    case 'SAVE_LOG_ENTRY':
      await logEntryService.emitLog({
        emitterIdentifier: requestingAppIdentifier,
        logMessage: parsedRequest.data.message,
        data: parsedRequest.data.data,
        level: parsedRequest.data.level,
        targetLocation: parsedRequest.data.targetLocation,
      })
      return { result: null }
    case 'GET_CONTENT_SIGNED_URLS':
      return {
        result: await appService.createSignedContentUrlsAsApp(
          requestingAppIdentifier,
          parsedRequest.data,
        ),
      }
    case 'GET_METADATA_SIGNED_URLS':
      return {
        result: await appService.createSignedMetadataUrlsAsApp(
          requestingAppIdentifier,
          parsedRequest.data,
        ),
      }
    case 'UPDATE_CONTENT_METADATA':
      await folderService.updateFolderObjectMetadata(
        requestingAppIdentifier,
        parsedRequest.data,
      )
      return { result: null }
    case 'COMPLETE_HANDLE_TASK': {
      try {
        await appService.registerTaskCompletedAsApp(
          requestingAppIdentifier,
          parsedRequest.data,
        )
      } catch (error) {
        return {
          error:
            error instanceof HttpException
              ? { code: error.getStatus(), message: error.message }
              : {
                  code: 500,
                  message:
                    error instanceof Error
                      ? `Unexpected server error: ${error.message}`
                      : `Unexpected server error: ${String(error)}`,
                },
        }
      }

      return { result: null }
    }
    case 'ATTEMPT_START_HANDLE_ANY_AVAILABLE_TASK': {
      const startContext = {
        ...(parsedRequest.data.startContext ?? {}),
        __executor: {
          appIdentifier: requestingAppIdentifier,
          handlerInstanceId,
        },
      }
      try {
        const { task: securedTask } = await taskService.startAnyAvailableTask({
          appIdentifier: requestingAppIdentifier,
          taskIdentifiers: parsedRequest.data.taskIdentifiers,
          startContext,
        })
        return { result: { task: transformTaskToDTO(securedTask) } }
      } catch (error) {
        if (error instanceof HttpException) {
          return {
            error: { code: error.getStatus(), message: error.message },
          }
        }
        return {
          error: {
            code: 500,
            message:
              error instanceof Error
                ? `Unexpected server error: ${error.message}`
                : 'Unexpected server error',
          },
        }
      }
    }
    case 'ATTEMPT_START_HANDLE_WORKER_TASK_BY_ID': {
      const startContext = {
        __executor: {
          appIdentifier: requestingAppIdentifier,
          handlerId: handlerInstanceId,
        },
        ...(parsedRequest.data.startContext ?? {}),
      }
      try {
        const startedTask = await appService.startWorkerTaskByIdAsApp(
          requestingAppIdentifier,
          {
            taskId: parsedRequest.data.taskId,
            startContext,
          },
        )
        return { result: { task: transformTaskToDTO(startedTask) } }
      } catch (error) {
        if (error instanceof HttpException) {
          return {
            error: { code: error.getStatus(), message: error.message },
          }
        }
        return {
          error: {
            code: 500,
            message:
              error instanceof Error
                ? `Unexpected server error: ${error.message}`
                : 'Unexpected server error',
          },
        }
      }
    }

    case 'GET_APP_UI_BUNDLE':
      return appService.getAppUIbundleAsAppServer(
        requestingAppIdentifier,
        parsedRequest.data,
      )
    case 'GET_WORKER_EXECUTION_DETAILS': {
      return appService.getWorkerExecutionDetailsAsAppServer(
        requestingAppIdentifier,
        parsedRequest.data,
      )
    }
    case 'GET_APP_STORAGE_SIGNED_URLS':
      return {
        result: await appService.createSignedAppStorageUrls(
          requestingAppIdentifier,
          parsedRequest.data,
        ),
      }
    case 'AUTHENTICATE_USER': {
      try {
        const decodedJWT = jwtService.decodeJWT(parsedRequest.data.token)
        if (!decodedJWT.payload || typeof decodedJWT.payload === 'string') {
          return {
            error: { code: 401, message: 'Invalid token payload' },
          }
        }
        const subject = decodedJWT.payload.sub
        if (!subject || typeof subject !== 'string') {
          return {
            error: { code: 401, message: 'Invalid token subject' },
          }
        }
        const subjectParts = subject.split(':')
        if (subjectParts.length !== 3 || subjectParts[0] !== 'app_user') {
          return {
            error: { code: 401, message: 'Invalid token format' },
          }
        }
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const userId = subjectParts[1]!
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const tokenAppIdentifier = subjectParts[2]!
        if (tokenAppIdentifier !== parsedRequest.data.appIdentifier) {
          return {
            error: { code: 401, message: 'Token app identifier mismatch' },
          }
        }
        jwtService.verifyAppUserJWT({
          token: parsedRequest.data.token,
          userId,
          appIdentifier: parsedRequest.data.appIdentifier,
        })
        return { result: { userId, success: true } }
      } catch (error) {
        return {
          error: {
            code: 401,
            message:
              error instanceof Error ? error.message : 'Authentication failed',
          },
        }
      }
    }
    case 'EXECUTE_APP_DOCKER_JOB': {
      return {
        result: await appService.executeAppDockerJob({
          appIdentifier: requestingAppIdentifier,
          ...parsedRequest.data,
        }),
      }
    }
    case 'TRIGGER_APP_TASK': {
      await taskService.triggerAppActionTask({
        targetUserId: parsedRequest.data.targetUserId,
        targetLocation: parsedRequest.data.targetLocation,
        storageAccessPolicy: parsedRequest.data.storageAccessPolicy,
        appIdentifier: requestingAppIdentifier,
        taskIdentifier: parsedRequest.data.taskIdentifier,
        taskData: parsedRequest.data.inputData,
        dontStartBefore: parsedRequest.data.dontStartBefore
          ? 'timestamp' in parsedRequest.data.dontStartBefore
            ? {
                timestamp: new Date(
                  parsedRequest.data.dontStartBefore.timestamp,
                ),
              }
            : {
                delayMs: parsedRequest.data.dontStartBefore.delayMs,
              }
          : undefined,
      })

      return { result: null }
    }
  }
}
