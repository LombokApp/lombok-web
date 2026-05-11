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
import { AsyncWorkError, buildUnexpectedError } from '@lombokapp/worker-utils'
import type { EventService } from 'src/event/services/event.service'
import type { FolderService } from 'src/folders/services/folder.service'
import type { LogEntryService } from 'src/log/services/log-entry.service'
import type { OrmService } from 'src/orm/orm.service'
import type { TaskService } from 'src/task/services/task.service'
import { transformTaskToDTO } from 'src/task/transforms/task.transforms'
import { z } from 'zod'

import type { AppService } from './app.service'
import type { AppCustomSettingsService } from './app-custom-settings.service'

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
    const flattenedError = z.flattenError(parsedMessage.error)
    return {
      error: {
        fieldErrors: flattenedError.fieldErrors,
        formErrors: flattenedError.formErrors,
      },
    }
  }
  const schema: z.ZodType | undefined =
    AppSocketMessageSchemaMap[parsedMessage.data.name]
  const parsed = schema.safeParse(parsedMessage.data.data)

  if (parsed.success) {
    return parsedMessage.data as ParsedRequest
  }

  return {
    error: {
      issues: parsed.error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path.map((p) => (typeof p === 'symbol' ? String(p) : p)),
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
    customSettingsService,
  }: {
    eventService: EventService
    ormService: OrmService
    logEntryService: LogEntryService
    folderService: FolderService
    taskService: TaskService
    appService: AppService
    customSettingsService: AppCustomSettingsService
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
    case 'GET_LATEST_DB_CREDENTIALS':
      return appService.getApp(requestingAppIdentifier).then((_app) => {
        if (!_app?.database) {
          return {
            error: { code: 409, message: 'App does not have database access.' },
          }
        }
        return (
          ormService
            .getLatestDbCredentials(_app.identifier)
            // eslint-disable-next-line promise/no-nesting
            .then((creds) => ({
              result: creds,
            }))
        )
      })
    case 'MINT_APP_USER_TOKEN': {
      const session = await appService.mintAppUserToken({
        actor: { appIdentifier: requestingAppIdentifier },
        userId: parsedRequest.data.userId,
        ...(typeof parsedRequest.data.platformAccess === 'boolean'
          ? { platformAccess: parsedRequest.data.platformAccess }
          : {}),
        ...(parsedRequest.data.extra
          ? { extra: parsedRequest.data.extra }
          : {}),
      })
      return {
        result: {
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        },
      }
    }
    case 'EMIT_EVENT':
      try {
        const app = await appService.getApp(requestingAppIdentifier, {
          enabled: true,
        })
        if (!app) {
          return {
            error: { code: 404, message: 'App not found.' },
          }
        }
        await eventService.emitEvent({
          emitterIdentifier: requestingAppIdentifier,
          eventIdentifier: parsedRequest.data.eventIdentifier,
          data: parsedRequest.data.data,
          ...(parsedRequest.data.targetLocation
            ? { targetLocation: parsedRequest.data.targetLocation }
            : parsedRequest.data.targetUserId
              ? { targetUserId: parsedRequest.data.targetUserId }
              : {}),
        })
        return { result: { success: true } }
      } catch {
        return {
          error: { code: 500, message: 'Internal server error.' },
        }
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
    case 'GET_APP_STORAGE_SIGNED_URLS':
      return {
        result: await appService.createSignedAppStorageUrls(
          requestingAppIdentifier,
          parsedRequest.data,
        ),
      }
    case 'EXECUTE_APP_DOCKER_JOB_ASYNC':
      try {
        const dockerJobExecuteAsyncResult =
          await appService.executeAppDockerJob(
            { appIdentifier: requestingAppIdentifier, ...parsedRequest.data },
            false,
          )
        if ('submitError' in dockerJobExecuteAsyncResult) {
          return {
            result: {
              jobId: dockerJobExecuteAsyncResult.jobId,
              submitSuccess: false,
              containerId: dockerJobExecuteAsyncResult.containerId ?? null,
              submitError: dockerJobExecuteAsyncResult.submitError,
            },
          }
        } else {
          return {
            result: {
              jobId: dockerJobExecuteAsyncResult.jobId,
              submitSuccess: true,
              containerId: dockerJobExecuteAsyncResult.containerId,
            },
          }
        }
      } catch (error) {
        const normalizedError =
          error instanceof AsyncWorkError
            ? error
            : buildUnexpectedError({
                code: 'UNEXPECTED_APP_DOCKER_JOB_ERROR',
                message: `Unexpected error during executeAppDockerJob`,
                error,
              })

        return {
          error: {
            code: normalizedError.code,
            message: normalizedError.message,
            details: normalizedError.toEnvelope(),
          },
        }
      }
    case 'EXECUTE_APP_DOCKER_JOB':
      try {
        const dockerJobExecuteResult = await appService.executeAppDockerJob(
          { appIdentifier: requestingAppIdentifier, ...parsedRequest.data },
          true,
        )
        if ('submitError' in dockerJobExecuteResult) {
          return {
            result: {
              jobId: dockerJobExecuteResult.jobId,
              submitSuccess: false,
              containerId: dockerJobExecuteResult.containerId ?? null,
              execution: null,
              submitError: {
                code: dockerJobExecuteResult.submitError.code,
                message: dockerJobExecuteResult.submitError.message,
                details: dockerJobExecuteResult.submitError.details ?? {},
              },
            },
          }
        } else if ('executeError' in dockerJobExecuteResult) {
          return {
            result: {
              jobId: dockerJobExecuteResult.jobId,
              submitSuccess: true,
              containerId: dockerJobExecuteResult.containerId,
              execution: {
                success: false,
                error: {
                  code: dockerJobExecuteResult.executeError.code,
                  message: dockerJobExecuteResult.executeError.message,
                  details: dockerJobExecuteResult.executeError.details ?? {},
                },
                result: null,
              },
            },
          }
        } else {
          return {
            result: {
              jobId: dockerJobExecuteResult.jobId,
              submitSuccess: true,
              containerId: dockerJobExecuteResult.containerId,
              execution: {
                success: true,
                result: dockerJobExecuteResult.result,
              },
            },
          }
        }
      } catch (error) {
        const normalizedError =
          error instanceof AsyncWorkError
            ? error
            : buildUnexpectedError({
                code: 'UNEXPECTED_APP_DOCKER_JOB_ERROR',
                message: `Unexpected error during executeAppDockerJob`,
                error,
              })

        return {
          error: {
            code: normalizedError.code,
            message: normalizedError.message,
            details: normalizedError.toEnvelope(),
          },
        }
      }

    case 'GET_APP_TASK': {
      const task = await taskService.getTaskAsApp(
        requestingAppIdentifier,
        parsedRequest.data.taskId,
        { targetUserId: parsedRequest.data.targetUserId },
      )
      if (!task) {
        return { error: { code: 404, message: 'Task not found.' } }
      }
      return { result: transformTaskToDTO(task) }
    }
    case 'TRIGGER_APP_TASK': {
      const task = await taskService.triggerAppActionTask({
        targetUserId: parsedRequest.data.targetUserId,
        targetLocation: parsedRequest.data.targetLocation,
        storageAccessPolicy: parsedRequest.data.storageAccessPolicy,
        correlationKey: parsedRequest.data.correlationKey,
        appIdentifier: requestingAppIdentifier,
        taskIdentifier: parsedRequest.data.taskIdentifier,
        taskData: parsedRequest.data.inputData,
        onComplete: parsedRequest.data.onComplete,
        onProgress: parsedRequest.data.onProgress,
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

      return { result: { taskId: task.id } }
    }
    case 'REPORT_TASK_PROGRESS': {
      // Runtime workers connect with
      //   instanceId = `worker-daemon--{workerIdentifier}--{executionId}`.
      // Parse it to stamp the progress report with structured
      // executorMetadata so onProgress handlers can address
      // `{{executorMetadata.metadata.workerIdentifier}}` uniformly with
      // the docker-originated progress path.
      const instanceParts = handlerInstanceId.split('--')
      const runtimeWorkerIdentifier =
        instanceParts[0] === 'worker-daemon' && instanceParts[1]
          ? instanceParts[1]
          : undefined
      const progressReport = runtimeWorkerIdentifier
        ? {
            ...parsedRequest.data.progressReport,
            executorMetadata: {
              type: 'runtime' as const,
              metadata: { workerIdentifier: runtimeWorkerIdentifier },
            },
          }
        : parsedRequest.data.progressReport
      const result = await taskService.registerTaskProgress(
        parsedRequest.data.taskId,
        progressReport,
      )
      if (!result) {
        return {
          error: {
            code: 409,
            message:
              'Task is not in a running state (may be completed or not started)',
          },
        }
      }
      return { result: { success: true } }
    }
    case 'GET_APP_CUSTOM_SETTINGS': {
      const app = await appService.getApp(requestingAppIdentifier)
      if (!app) {
        return { error: { code: 404, message: 'App not found.' } }
      }
      const settingsConfig = app.config.settings
      if (!settingsConfig?.user) {
        return { result: { values: {} } }
      }
      const settingsResult =
        await customSettingsService.getUserCustomSettingsUnmasked(
          parsedRequest.data.userId,
          app,
        )
      return { result: { values: settingsResult.values } }
    }
    case 'PATCH_APP_CUSTOM_SETTINGS': {
      const app = await appService.getApp(requestingAppIdentifier)
      if (!app) {
        return { error: { code: 404, message: 'App not found.' } }
      }
      if (!app.config.settings?.user) {
        return {
          error: {
            code: 400,
            message: 'App does not define user-level custom settings.',
          },
        }
      }
      try {
        await customSettingsService.patchUserCustomSettings(
          parsedRequest.data.userId,
          app,
          parsedRequest.data.values,
        )
        return { result: { success: true } }
      } catch (err: unknown) {
        // Surface schema-validation failures with their structured `details`
        // so the calling app can render which fields/keys broke. NestJS's
        // BadRequestException stores the body on `err.response`.
        if (
          err != null &&
          typeof err === 'object' &&
          'status' in err &&
          (err as { status?: number }).status === 400
        ) {
          const response = (err as { response?: unknown }).response
          const body =
            response != null && typeof response === 'object'
              ? (response as Record<string, unknown>)
              : null
          const errMessage =
            typeof body?.message === 'string' ? body.message : 'Bad request'
          const details =
            body?.details != null && typeof body.details === 'object'
              ? (body.details as JsonSerializableObject)
              : undefined
          return {
            error: {
              code: 400,
              message: errMessage,
              ...(details ? { details } : {}),
            },
          }
        }
        throw err
      }
    }
    case 'CREATE_BRIDGE_TUNNEL': {
      try {
        const result = await appService.createTunnelSessionAsApp(
          requestingAppIdentifier,
          parsedRequest.data,
        )
        return { result }
      } catch (error: unknown) {
        return {
          error: {
            code:
              error instanceof Error && 'statusCode' in error
                ? (error as { statusCode: number }).statusCode
                : 500,
            message:
              error instanceof Error
                ? error.message
                : 'Bridge tunnel creation failed',
          },
        }
      }
    }
    case 'DELETE_BRIDGE_TUNNEL': {
      try {
        await appService.deleteTunnelSessionAsApp(
          requestingAppIdentifier,
          parsedRequest.data.sessionId,
        )
        return { result: { success: true } }
      } catch (error: unknown) {
        return {
          error: {
            code: 500,
            message:
              error instanceof Error
                ? error.message
                : 'Bridge tunnel deletion failed',
          },
        }
      }
    }
    case 'DESTROY_APP_DOCKER_CONTAINERS': {
      try {
        const destroyedCountResult =
          await appService.destroyAppWorkerDockerContainers(
            requestingAppIdentifier,
            parsedRequest.data,
          )
        return { result: destroyedCountResult }
      } catch (error: unknown) {
        return {
          error: {
            code:
              error instanceof Error && 'statusCode' in error
                ? (error as { statusCode: number }).statusCode
                : 500,
            message:
              error instanceof Error
                ? error.message
                : 'Container destruction failed',
          },
        }
      }
    }
    case 'RESOLVE_APP_DOCKER_CONTAINER': {
      try {
        const result = await appService.resolveAppWorkerDockerContainer(
          requestingAppIdentifier,
          parsedRequest.data,
        )
        return { result }
      } catch (error: unknown) {
        return {
          error: {
            code:
              error instanceof Error && 'statusCode' in error
                ? (error as { statusCode: number }).statusCode
                : 500,
            message:
              error instanceof Error
                ? error.message
                : 'Container resolution failed',
          },
        }
      }
    }
  }
}
