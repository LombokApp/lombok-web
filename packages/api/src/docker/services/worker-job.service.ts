import type {
  FolderScopeAppPermissions,
  JsonSerializableObject,
  StorageAccessPolicy,
} from '@lombokapp/types'
import {
  ConflictException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { and, eq, inArray } from 'drizzle-orm'
import type { JwtPayload } from 'jsonwebtoken'
import * as jwt from 'jsonwebtoken'
import { appsTable } from 'src/app/entities/app.entity'
import { appFolderSettingsTable } from 'src/app/entities/app-folder-settings.entity'
import { AppService } from 'src/app/services/app.service'
import { authConfig } from 'src/auth/config'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { OrmService } from 'src/orm/orm.service'
import { platformConfig } from 'src/platform/config'
import { tasksTable } from 'src/task/entities/task.entity'
import { PlatformTaskService } from 'src/task/services/platform-task.service'
import { TaskService } from 'src/task/services/task.service'
import { v4 as uuidV4 } from 'uuid'

import { WorkerJobUploadUrlsRequestDTO } from '../dto/worker-job-presigned-urls-request.dto'
import { WorkerJobPresignedUrlsResponseDTO } from '../dto/worker-job-presigned-urls-response.dto'

const ALGORITHM = 'HS256'
const DOCKER_WORKER_JOB_JWT_SUB_PREFIX = 'docker_worker_job:'

// JWT expiry for worker job tokens (30 minutes)
const WORKER_JOB_TOKEN_EXPIRY_SECONDS = 30 * 60

// The permission required for uploading files to a folder
const WRITE_OBJECTS_PERMISSION: FolderScopeAppPermissions = 'WRITE_OBJECTS'

export interface WorkerJobTokenClaims {
  jobId: string
  executorContext: JsonSerializableObject
  taskId: string
  storageAccessPolicy: StorageAccessPolicy
}

export interface CompleteJobRequest {
  success: boolean
  result?: JsonSerializableObject
  error?: {
    code: string
    message: string
  }
  outputFiles?: { folderId: string; objectKey: string }[]
}

@Injectable()
export class WorkerJobService {
  private readonly logger = new Logger(WorkerJobService.name)
  taskService: TaskService
  platformTaskService: PlatformTaskService
  appService: AppService
  constructor(
    @Inject(authConfig.KEY)
    private readonly _authConfig: nestjsConfig.ConfigType<typeof authConfig>,
    @Inject(platformConfig.KEY)
    private readonly _platformConfig: nestjsConfig.ConfigType<
      typeof platformConfig
    >,
    private readonly ormService: OrmService,
    @Inject(forwardRef(() => PlatformTaskService))
    _platformTaskService,
    @Inject(forwardRef(() => TaskService))
    _taskService,
    @Inject(forwardRef(() => AppService))
    _appService,
  ) {
    this.platformTaskService = _platformTaskService as PlatformTaskService
    this.appService = _appService as AppService
    this.taskService = _taskService as TaskService
  }

  /**
   * Validate and filter allowed uploads based on app permissions.
   * This method checks that the app has WRITE_OBJECTS permission for each folder.
   * Returns only the folder/prefix combinations that are actually allowed.
   */
  async validateStorageAccess(
    appIdentifier: string,
    requestedUploads: Record<string, string[]>,
  ): Promise<Record<string, string[]>> {
    const folderIds = Object.keys(requestedUploads)
    if (folderIds.length === 0) {
      return {}
    }

    // 1. Check if the app exists and is enabled
    const app = await this.ormService.db.query.appsTable.findFirst({
      where: and(
        eq(appsTable.identifier, appIdentifier),
        eq(appsTable.enabled, true),
      ),
    })

    if (!app) {
      throw new NotFoundException(
        `App "${appIdentifier}" not found or is not enabled`,
      )
    }

    // 2. Check if the app has WRITE_OBJECTS in its default folder permissions
    const appHasWritePermission = app.permissions.folder.includes(
      WRITE_OBJECTS_PERMISSION,
    )

    if (!appHasWritePermission) {
      throw new ForbiddenException(
        `App "${appIdentifier}" does not have ${WRITE_OBJECTS_PERMISSION} permission`,
      )
    }

    // 3. Verify all requested folders exist
    const folders = await this.ormService.db.query.foldersTable.findMany({
      where: inArray(foldersTable.id, folderIds),
    })

    if (folders.length !== folderIds.length) {
      const foundIds = new Set(folders.map((f) => f.id))
      const missingIds = folderIds.filter((id) => !foundIds.has(id))
      throw new NotFoundException(`Folders not found: ${missingIds.join(', ')}`)
    }

    // 4. Get folder-specific app settings to check if app is enabled/disabled per folder
    const folderSettings =
      await this.ormService.db.query.appFolderSettingsTable.findMany({
        where: and(
          inArray(appFolderSettingsTable.folderId, folderIds),
          eq(appFolderSettingsTable.appIdentifier, appIdentifier),
        ),
      })

    // Build a map of folderId -> settings
    const settingsMap = new Map(folderSettings.map((s) => [s.folderId, s]))

    // 5. Filter to only folders where the app is enabled and has WRITE_OBJECTS permission
    const validatedUploads: Record<string, string[]> = {}

    for (const folderId of folderIds) {
      const folderSetting = settingsMap.get(folderId)

      // Determine if app is enabled for this folder
      // If folder setting exists and has explicit enabled value, use that
      // Otherwise fall back to app's default
      const isEnabled =
        folderSetting?.enabled !== null && folderSetting?.enabled !== undefined
          ? folderSetting.enabled
          : app.folderScopeEnabledDefault

      if (!isEnabled) {
        throw new ForbiddenException(
          `App "${appIdentifier}" is not enabled for folder "${folderId}"`,
        )
      }

      // Determine effective permissions for this folder
      // If folder setting has explicit permissions, use those
      // Otherwise use app's default folder permissions
      const effectivePermissions: FolderScopeAppPermissions[] =
        folderSetting?.permissions ?? app.permissions.folder

      if (!effectivePermissions.includes(WRITE_OBJECTS_PERMISSION)) {
        throw new ForbiddenException(
          `App "${appIdentifier}" does not have ${WRITE_OBJECTS_PERMISSION} permission for folder "${folderId}"`,
        )
      }

      // All checks passed - include this folder
      validatedUploads[folderId] = requestedUploads[folderId] ?? []
    }

    return validatedUploads
  }

  /**
   * Create a JWT token for a worker job with specific allowed uploads.
   */
  createWorkerJobToken(params: {
    jobId: string
    taskId?: string
    storageAccessPolicy?: StorageAccessPolicy
    executorContext?: JsonSerializableObject
  }): string {
    const payload = {
      aud: this._platformConfig.platformHost,
      jti: uuidV4(),
      sub: `${DOCKER_WORKER_JOB_JWT_SUB_PREFIX}${params.jobId}`,
      job_id: params.jobId,
      task_id: params.taskId,
      storage_access_policy: params.storageAccessPolicy,
      executor_context: params.executorContext,
    }

    return jwt.sign(payload, this._authConfig.authJwtSecret, {
      algorithm: ALGORITHM,
      expiresIn: WORKER_JOB_TOKEN_EXPIRY_SECONDS,
    })
  }

  /**
   * Verify a worker job token and return the claims
   */
  verifyWorkerJobToken(
    token: string,
    expectedJobId: string,
  ): WorkerJobTokenClaims {
    try {
      const decoded = jwt.verify(token, this._authConfig.authJwtSecret, {
        algorithms: [ALGORITHM],
        audience: this._platformConfig.platformHost,
        subject: `${DOCKER_WORKER_JOB_JWT_SUB_PREFIX}${expectedJobId}`,
      }) as JwtPayload & {
        job_id: string
        task_id: string
        executor_context: JsonSerializableObject
        storage_access_policy: StorageAccessPolicy
      }

      return {
        jobId: decoded.job_id,
        taskId: decoded.task_id,
        executorContext: decoded.executor_context,
        storageAccessPolicy: decoded.storage_access_policy,
      }
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Worker job token has expired')
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid worker job token')
      }
      throw error
    }
  }

  /**
   * Request presigned URLs for files
   */
  async requestPresignedStorageUrls(
    claims: WorkerJobTokenClaims,
    files: WorkerJobUploadUrlsRequestDTO,
  ): Promise<WorkerJobPresignedUrlsResponseDTO> {
    // Validate all requested uploads are allowed
    const dockerTask = await this.ormService.db.query.tasksTable.findFirst({
      where: eq(tasksTable.id, claims.taskId),
    })

    if (!dockerTask) {
      throw new NotFoundException(`Task not found: ${claims.taskId}`)
    }

    if (!dockerTask.startedAt) {
      throw new ForbiddenException(
        `Task ${claims.taskId} has not been started yet`,
      )
    }

    if (dockerTask.completedAt) {
      throw new ForbiddenException(
        `Task ${claims.taskId} has already been completed`,
      )
    }

    const innerTask =
      'innerTaskId' in dockerTask.data &&
      (await this.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.id, dockerTask.data.innerTaskId as string),
      }))

    if (!innerTask) {
      throw new NotFoundException(`Inner task not found: ${innerTask}`)
    }

    const appIdentifier = innerTask.ownerIdentifier

    for (const file of files) {
      const isAllowed = claims.storageAccessPolicy.some(
        (storageAccessPolicyRule) => {
          return (
            storageAccessPolicyRule.folderId === file.folderId &&
            storageAccessPolicyRule.methods.includes(file.method) &&
            (!storageAccessPolicyRule.prefix ||
              file.objectKey.startsWith(storageAccessPolicyRule.prefix))
          )
        },
      )

      if (!isAllowed) {
        throw new ForbiddenException(
          `Access to folder ${file.folderId}, with method ${file.method} and object key ${file.objectKey}, is not allowed`,
        )
      }
    }

    return {
      urls: await this.appService.createSignedContentUrlsAsApp(
        appIdentifier,
        files,
      ),
    }
  }

  /**
   * Mark a worker job as complete.
   *
   * This calls registerTaskCompletion on the docker task and the inner
   * task, i.e. the task that is being "handled" by the docker task.
   *
   * @param claims - The claims from the worker job token
   * @param request - The request to complete the job
   *
   */
  async completeJob(
    claims: WorkerJobTokenClaims,
    request: CompleteJobRequest,
  ): Promise<void> {
    this.logger.log('WorkerJobService.completeJob', { claims, request })
    const { taskId: dockerRunTaskId } = claims
    const { success, result, error } = request

    await this.ormService.db.transaction(async (tx) => {
      // Find the task
      const dockerTask = await this.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.id, dockerRunTaskId),
      })

      if (!dockerTask) {
        throw new NotFoundException(`Task not found: ${dockerRunTaskId}`)
      }

      if (!dockerTask.startedAt) {
        throw new ForbiddenException(
          `Task ${dockerRunTaskId} cannot be completed because it has not been started`,
        )
      }

      if (dockerTask.completedAt) {
        throw new ForbiddenException(
          `Task ${dockerRunTaskId} cannot be completed because it has not been started`,
        )
      }

      const innerTask =
        'innerTaskId' in dockerTask.data &&
        (await tx.query.tasksTable.findFirst({
          where: eq(tasksTable.id, dockerTask.data.innerTaskId as string),
        }))

      if (!innerTask) {
        throw new NotFoundException(`Inner task not found: ${innerTask}`)
      }

      const resolvedError = {
        code: error?.code || 'UNKNOWN_ERROR',
        message: error?.message || 'Job failed without error details',
        details: {},
      }

      // TODO: Implement dynamic requeue in the event of failure

      // Trigger completion of the docker handler task
      await this.taskService.registerTaskCompleted(
        dockerTask.id,
        success ? { success: true } : { success: false, error: resolvedError },
        { tx },
      )

      // Trigger completion of the inner task
      await this.taskService.registerTaskCompleted(
        innerTask.id,
        success
          ? { success: true, result }
          : { success: false, error: resolvedError },
        { tx },
      )
    })
  }

  /**
   * Mark a worker job as started.
   *
   * This calls registerTaskCompletion on the docker task and the inner
   * task, i.e. the task that is being "handled" by the docker task.

   */
  async startJob(claims: WorkerJobTokenClaims): Promise<void> {
    this.logger.log('WorkerJobService.startJob', claims)
    const { taskId: dockerRunTaskId } = claims

    await this.ormService.db.transaction(async (tx) => {
      const dockerRunTask = await tx.query.tasksTable.findFirst({
        where: eq(tasksTable.id, dockerRunTaskId),
      })

      if (!dockerRunTask) {
        throw new NotFoundException(`Docker task not found: ${dockerRunTaskId}`)
      }

      const innerTaskId =
        'innerTaskId' in dockerRunTask.data &&
        typeof dockerRunTask.data.innerTaskId === 'string' &&
        dockerRunTask.data.innerTaskId

      if (!innerTaskId) {
        throw new NotFoundException(
          `Docker job task has no inner task: ${dockerRunTaskId}`,
        )
      }

      const innerTask =
        innerTaskId &&
        (await this.ormService.db.query.tasksTable.findFirst({
          where: eq(tasksTable.id, innerTaskId),
        }))

      if (!innerTask) {
        throw new NotFoundException(
          `Docker handled task not found: ${innerTaskId}`,
        )
      }

      if (innerTask.startedAt || innerTask.completedAt) {
        throw new ConflictException(
          `Docker handled task ${innerTask.id} cannot be started because it has already been started`,
        )
      }

      if (!dockerRunTask.startedAt) {
        throw new ConflictException(
          `Docker handled task ${innerTask.id} cannot be started because the associated docker task (${dockerRunTaskId}) has not been started`,
        )
      }

      if (dockerRunTask.completedAt) {
        throw new ConflictException(
          `Docker handled task ${innerTask.id} cannot be started because the associated docker task (${dockerRunTaskId}) has already been completed`,
        )
      }

      await this.taskService.registerTaskStarted({
        taskId: innerTask.id,
        startContext: {
          __executor: claims.executorContext,
        },
        tx,
      })
    })
  }
}
