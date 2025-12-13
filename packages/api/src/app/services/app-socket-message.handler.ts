import type {
  AppSocketMessage,
  AppSocketMessageDataMap,
  AppSocketMessageResponseMap,
  JsonSerializableObject,
} from '@lombokapp/types'
import {
  appSocketMessageSchema,
  AppSocketMessageSchemaMap,
  CORE_APP_IDENTIFIER,
  SignedURLsRequestMethod,
} from '@lombokapp/types'
import { HttpException } from '@nestjs/common'
import type { JWTService } from 'src/auth/services/jwt.service'
import type { EventService } from 'src/event/services/event.service'
import type { FolderService } from 'src/folders/services/folder.service'
import type { LogEntryService } from 'src/log/services/log-entry.service'
import type { OrmService } from 'src/orm/orm.service'
import type { ServerConfigurationService } from 'src/server/services/server-configuration.service'
import type { S3Service } from 'src/storage/s3.service'
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
    serverConfigurationService,
    s3Service,
  }: {
    eventService: EventService
    ormService: OrmService
    logEntryService: LogEntryService
    folderService: FolderService
    taskService: TaskService
    jwtService: JWTService
    appService: AppService
    serverConfigurationService: ServerConfigurationService
    s3Service: S3Service
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

  const isCoreApp = requestingAppIdentifier === CORE_APP_IDENTIFIER
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
      const result = await ormService.executeExecForApp(
        requestingAppIdentifier,
        parsedRequest.data.sql,
        parsedRequest.data.params,
      )
      return { result: { rowCount: result.rowCount } }
    }
    case 'DB_BATCH': {
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
      return { result: undefined }
    case 'GET_CONTENT_SIGNED_URLS':
      return {
        result: await appService.createSignedContentUrls(parsedRequest.data),
      }
    case 'GET_METADATA_SIGNED_URLS':
      return {
        result: await appService.createSignedMetadataUrls(parsedRequest.data),
      }
    case 'UPDATE_CONTENT_METADATA':
      await folderService.updateFolderObjectMetadata(
        requestingAppIdentifier,
        parsedRequest.data,
      )
      return { result: undefined }
    case 'COMPLETE_HANDLE_TASK': {
      // TODO: check if the task is owned by the requesting app, or the app has permission to execute worker tasks (and it is a worker task)
      await taskService.registerTaskCompleted(
        parsedRequest.data.taskId,
        parsedRequest.data.success
          ? { success: true, result: parsedRequest.data.result }
          : { success: false, error: parsedRequest.data.error },
      )

      return { result: undefined }
    }
    case 'ATTEMPT_START_HANDLE_ANY_AVAILABLE_TASK': {
      try {
        const { task: securedTask } = await taskService.startAnyAvailableTask({
          appIdentifier: requestingAppIdentifier,
          taskIdentifiers: parsedRequest.data.taskIdentifiers,
          startContext: {
            ...(parsedRequest.data.startContext ?? {}),
            __executor: {
              appIdentifier: requestingAppIdentifier,
              handlerInstanceId,
            },
          },
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
      // TODO: check if the requesting app has permission to execute worker tasks (and it is a worker task)
      if (!isCoreApp) {
        return {
          error: {
            code: 403,
            message: 'Unauthorized to handle worker tasks',
          },
        }
      }

      const startContext = {
        __executor: {
          appIdentifier: requestingAppIdentifier,
          handlerId: handlerInstanceId,
        },
        ...(parsedRequest.data.startContext ?? {}),
      }

      try {
        const { task } = await taskService.registerTaskStarted({
          taskId: parsedRequest.data.taskId,
          startContext,
        })
        return { result: { task: transformTaskToDTO(task) } }
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
      // TODO: Move this to the app service and check a permission for the app
      return appService.getAppUIbundle(
        requestingAppIdentifier,
        parsedRequest.data,
      )
    case 'GET_WORKER_EXECUTION_DETAILS': {
      // TODO: Move this to the app service and check a permission for the app
      if (requestingAppIdentifier !== CORE_APP_IDENTIFIER) {
        return {
          error: { code: 403, message: 'Unauthorized.' },
        }
      }
      const workerApp = await appService.getApp(
        parsedRequest.data.appIdentifier,
        {
          enabled: true,
        },
      )
      if (!workerApp) {
        return {
          error: { code: 404, message: 'Worker app not found.' },
        }
      }
      if (
        !(parsedRequest.data.workerIdentifier in workerApp.workers.definitions)
      ) {
        return {
          error: { code: 404, message: 'Worker not found.' },
        }
      }
      const serverStorageLocation =
        await serverConfigurationService.getServerStorage()
      if (!serverStorageLocation) {
        return {
          error: {
            code: 500,
            message: 'Server storage location not available.',
          },
        }
      }
      const presignedGetURL = s3Service.createS3PresignedUrls([
        {
          method: SignedURLsRequestMethod.GET,
          objectKey: `${serverStorageLocation.prefix ? serverStorageLocation.prefix + '/' : ''}app-bundle-storage/${parsedRequest.data.appIdentifier}/workers/${workerApp.workers.hash}.zip`,
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
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          payloadUrl: presignedGetURL[0]!,
          entrypoint:
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            workerApp.workers.definitions[parsedRequest.data.workerIdentifier]!
              .entrypoint,
          environmentVariables:
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            workerApp.workers.definitions[parsedRequest.data.workerIdentifier]!
              .environmentVariables,
          workerToken: await jwtService.createAppWorkerToken(
            parsedRequest.data.appIdentifier,
          ),
          hash: workerApp.workers.hash,
        },
      }
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

      return { result: undefined }
    }
  }
}
