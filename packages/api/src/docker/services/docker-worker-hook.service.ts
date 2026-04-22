import type {
  DockerExecutorMetadata,
  FolderScopeAppPermissions,
  StorageAccessPolicy,
  TaskCompletion,
} from '@lombokapp/types'
import {
  BadRequestException,
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
import { AuthDurationSeconds } from 'src/auth/constants/duration.constants'
import {
  APP_RUNTIME_WORKER_JWT_SUB_PREFIX,
  APP_USER_JWT_SUB_PREFIX,
} from 'src/auth/services/jwt.service'
import { coreConfig } from 'src/core/config'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { OrmService } from 'src/orm/orm.service'
import { tasksTable } from 'src/task/entities/task.entity'
import { CoreTaskService } from 'src/task/services/core-task.service'
import { TaskService } from 'src/task/services/task.service'
import { v4 as uuidV4 } from 'uuid'
import { z } from 'zod'

import { dockerJobResultSchema } from '../dto/docker-job-complete-request.dto'
import { DockerJobPresignedUrlsRequestDTO } from '../dto/docker-job-presigned-urls-request.dto'
import { DockerJobPresignedUrlsResponseDTO } from '../dto/docker-job-presigned-urls-response.dto'
import type { DockerJobProgressRequestDTO } from '../dto/docker-job-progress-request.dto'
import { DockerClientService } from './client/docker-client.service'

const ALGORITHM = 'HS256'
const DOCKER_WORKER_JOB_JWT_SUB_PREFIX = 'docker_worker_job:'

// JWT expiry for worker job tokens (30 minutes)
const WORKER_JOB_TOKEN_EXPIRY_SECONDS = 30 * 60

// The permission required for uploading files to a folder
const WRITE_OBJECTS_PERMISSION: FolderScopeAppPermissions = 'WRITE_OBJECTS'

export interface DockerWorkerJobClaims {
  jobId: string
  executorMetadata: DockerExecutorMetadata
  taskId: string
  storageAccessPolicy: StorageAccessPolicy
}

export type CompleteJobRequest = z.infer<typeof dockerJobResultSchema>

@Injectable()
export class DockerWorkerHookService {
  private readonly logger = new Logger(DockerWorkerHookService.name)
  taskService: TaskService
  coreTaskService: CoreTaskService
  appService: AppService
  dockerClientService: DockerClientService
  constructor(
    @Inject(authConfig.KEY)
    private readonly _authConfig: nestjsConfig.ConfigType<typeof authConfig>,
    @Inject(coreConfig.KEY)
    private readonly _coreConfig: nestjsConfig.ConfigType<typeof coreConfig>,
    private readonly ormService: OrmService,
    @Inject(forwardRef(() => DockerClientService))
    private readonly _dockerClientService,
    @Inject(forwardRef(() => CoreTaskService))
    _coreTaskService,
    @Inject(forwardRef(() => TaskService))
    _taskService,
    @Inject(forwardRef(() => AppService))
    _appService,
  ) {
    this.coreTaskService = _coreTaskService as CoreTaskService
    this.dockerClientService = _dockerClientService as DockerClientService
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
  createDockerWorkerJobToken(params: {
    jobId: string
    taskId?: string
    storageAccessPolicy?: StorageAccessPolicy
    executorMetadata: DockerExecutorMetadata
  }): string {
    const payload = {
      aud: this._coreConfig.platformHost,
      jti: uuidV4(),
      sub: `${DOCKER_WORKER_JOB_JWT_SUB_PREFIX}${params.jobId}`,
      job_id: params.jobId,
      task_id: params.taskId,
      storage_access_policy: params.storageAccessPolicy,
      executor_metadata: params.executorMetadata,
    }

    return jwt.sign(payload, this._authConfig.authJwtSecret, {
      algorithm: ALGORITHM,
      expiresIn: WORKER_JOB_TOKEN_EXPIRY_SECONDS,
    })
  }

  /**
   * Verify a docker worker job token and return the claims
   */
  verifyDockerWorkerJobToken(
    token: string,
    expectedJobId: string,
  ): DockerWorkerJobClaims {
    try {
      const decoded = jwt.verify(token, this._authConfig.authJwtSecret, {
        algorithms: [ALGORITHM],
        audience: this._coreConfig.platformHost,
        subject: `${DOCKER_WORKER_JOB_JWT_SUB_PREFIX}${expectedJobId}`,
      }) as JwtPayload & {
        job_id: string
        task_id: string
        executor_metadata: DockerExecutorMetadata
        storage_access_policy: StorageAccessPolicy
      }

      return {
        jobId: decoded.job_id,
        taskId: decoded.task_id,
        executorMetadata: decoded.executor_metadata,
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
   * Create a long-lived app token for a Docker container (non-user-isolated).
   * Same subject format as runtime workers (`app_runtime_worker:{appIdentifier}`)
   * but with a 24-hour expiry suitable for persistent containers.
   */
  createDockerAppToken(appIdentifier: string): string {
    return jwt.sign(
      {
        aud: this._coreConfig.platformHost,
        jti: uuidV4(),
        scp: [],
        sub: `${APP_RUNTIME_WORKER_JWT_SUB_PREFIX}${appIdentifier}`,
      },
      this._authConfig.authJwtSecret,
      {
        algorithm: ALGORITHM,
        expiresIn: AuthDurationSeconds.DockerContainerAppToken,
      },
    )
  }

  /**
   * Create platform credentials for a Docker container at provisioning time.
   * User-isolated containers get an app-user token (session-backed).
   * Shared containers get an app token (same format as runtime workers).
   */
  async createDockerPlatformCredentials(params: {
    appIdentifier: string
    userId?: string
  }): Promise<{
    token: string
    refreshToken?: string
    tokenType: 'app_user' | 'app'
  }> {
    if (params.userId) {
      const result = await this.appService.createAppUserAccessTokenAsApp({
        actor: { appIdentifier: params.appIdentifier },
        userId: params.userId,
      })
      return {
        token: result.accessToken,
        refreshToken: result.refreshToken,
        tokenType: 'app_user',
      }
    }

    return {
      token: this.createDockerAppToken(params.appIdentifier),
      tokenType: 'app',
    }
  }

  /**
   * Refresh a platform token for a Docker container.
   * Handles both app-user tokens (session-based) and app tokens.
   */
  async refreshPlatformToken(
    token: string,
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    const decoded = jwt.verify(token, this._authConfig.authJwtSecret, {
      algorithms: [ALGORITHM],
      audience: this._coreConfig.platformHost,
    }) as JwtPayload

    if (!decoded.sub) {
      throw new UnauthorizedException('Token has no subject')
    }

    if (decoded.sub.startsWith(APP_RUNTIME_WORKER_JWT_SUB_PREFIX)) {
      const appIdentifier = decoded.sub.slice(
        APP_RUNTIME_WORKER_JWT_SUB_PREFIX.length,
      )
      return { accessToken: this.createDockerAppToken(appIdentifier) }
    }

    if (decoded.sub.startsWith(APP_USER_JWT_SUB_PREFIX)) {
      // app_user:{userId}:{appIdentifier}
      const parts = decoded.sub.slice(APP_USER_JWT_SUB_PREFIX.length).split(':')

      const [userId, appIdentifier] = parts
      if (parts.length < 2 || !userId || !appIdentifier) {
        throw new UnauthorizedException('Invalid app-user token')
      }
      const result = await this.appService.createAppUserAccessTokenAsApp({
        actor: { appIdentifier },
        userId,
      })
      return {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      }
    }

    throw new UnauthorizedException('Unsupported token type for refresh')
  }

  /**
   * Request presigned URLs for files
   */
  async requestPresignedStorageUrls(
    claims: DockerWorkerJobClaims,
    files: DockerJobPresignedUrlsRequestDTO,
  ): Promise<DockerJobPresignedUrlsResponseDTO> {
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
      const isAllowed = claims.storageAccessPolicy.rules.some(
        (storageAccessPolicyRule) => {
          const wholeFolderAllowed =
            !('objectKey' in storageAccessPolicyRule) &&
            !('prefix' in storageAccessPolicyRule)
          const constrainedByPrefix =
            'prefix' in storageAccessPolicyRule &&
            storageAccessPolicyRule.prefix
          const constrainedByObjectKey =
            'objectKey' in storageAccessPolicyRule &&
            storageAccessPolicyRule.objectKey
          return (
            storageAccessPolicyRule.folderId === file.folderId &&
            storageAccessPolicyRule.methods.includes(file.method) &&
            (wholeFolderAllowed ||
              (!!constrainedByPrefix &&
                file.objectKey.startsWith(constrainedByPrefix)) ||
              (constrainedByObjectKey &&
                file.objectKey === constrainedByObjectKey))
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
   * @param completeJobRequest - The request to complete the job
   *
   */
  async completeJob(
    claims: DockerWorkerJobClaims,
    completeJobRequest: CompleteJobRequest,
  ): Promise<void> {
    this.logger.log('DockerWorkerHookService.completeJob', {
      claims,
      request: { dockerRunTaskId: claims.taskId },
    })
    const { taskId: dockerRunTaskId } = claims

    await this.ormService.db.transaction(async (tx) => {
      // Find the task
      const dockerTask = await tx.query.tasksTable.findFirst({
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

      const innerTaskCompletion: TaskCompletion = completeJobRequest.success
        ? {
            success: true,
            result: completeJobRequest.result,
            executorMetadata: {
              type: 'docker',
              metadata: claims.executorMetadata,
            },
          }
        : {
            success: false,
            executorMetadata: {
              type: 'docker',
              metadata: claims.executorMetadata,
            },
            error: {
              name: completeJobRequest.error.name ?? 'Error',
              code: completeJobRequest.error.code,
              message: completeJobRequest.error.message,
              ...(completeJobRequest.error.details
                ? { details: completeJobRequest.error.details }
                : {}),
            },
          }

      // Trigger completion of the docker handler task
      await this.taskService.registerTaskCompleted(
        dockerTask.id,
        innerTaskCompletion,
        { tx },
      )

      // Trigger completion of the inner task
      await this.taskService.registerTaskCompleted(
        innerTask.id,
        innerTaskCompletion,
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
  async startJob(claims: DockerWorkerJobClaims): Promise<void> {
    this.logger.log('DockerWorkerHookService.startJob', {
      claims,
      request: { dockerRunTaskId: claims.taskId },
    })
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
        (await tx.query.tasksTable.findFirst({
          where: eq(tasksTable.id, innerTaskId),
        }))

      if (!innerTask) {
        throw new NotFoundException(
          `Docker handled task not found: ${innerTaskId}`,
        )
      }

      if (innerTask.completedAt) {
        throw new ConflictException(
          `Docker handled task ${innerTask.id} initial heartbeat cannot be registered because the task has already been completed`,
        )
      }

      if (!innerTask.startedAt) {
        throw new ConflictException(
          `Docker handled task ${innerTask.id} initial heartbeat cannot be registered because the task has not been started`,
        )
      }

      if (innerTask.latestHeartbeatAt) {
        throw new ConflictException(
          `Docker handled task ${innerTask.id} initial heartbeat was already registered`,
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

      await this.taskService.registerHeartbeat({
        taskId: innerTask.id,
        heartbeatContext: {
          message: 'Task worker first heartbeat',
        },
        // The worker-agent's first hook call is the first moment the
        // platform sees the full executor metadata (containerId, hostId
        // are only populated once the container has started). Upgrade
        // the inner task's `started` log entry so in-flight readers can
        // answer "which container is running this" before completion.
        executorMetadata: {
          type: 'docker',
          metadata: claims.executorMetadata,
        },
        options: { tx },
      })
    })
  }

  /**
   * Process a mid-execution progress report from a running Docker worker.
   *
   * Orchestrates: store progressReport -> emit async update on socket
   * -> dispatch onProgress handlers.
   *
   * @param claims - The claims from the worker job token
   * @param request - The progress report request body
   */
  async processProgress(
    claims: DockerWorkerJobClaims,
    request: DockerJobProgressRequestDTO,
  ): Promise<void> {
    const { taskId: dockerRunTaskId } = claims

    await this.ormService.db.transaction(async (tx) => {
      // 1. Look up the docker task (the RunDockerWorker core task)
      const dockerTask = await tx.query.tasksTable.findFirst({
        where: eq(tasksTable.id, dockerRunTaskId),
      })
      if (!dockerTask) {
        throw new BadRequestException(
          `Docker task ${dockerRunTaskId} not found`,
        )
      }

      // 2. Find the inner task ID (the user-visible app task)
      const innerTaskId =
        'innerTaskId' in dockerTask.data &&
        typeof dockerTask.data.innerTaskId === 'string' &&
        dockerTask.data.innerTaskId

      if (!innerTaskId) {
        throw new BadRequestException(
          `Docker job task has no inner task: ${dockerRunTaskId}`,
        )
      }

      // 3. Delegate to TaskService (store + socket emit + handler dispatch).
      const result = await this.taskService.registerTaskProgress(
        innerTaskId,
        {
          ...request,
          executorMetadata: {
            type: 'docker',
            metadata: claims.executorMetadata,
          },
        },
        tx,
      )

      if (!result) {
        throw new ConflictException(
          `Task ${innerTaskId} is not in a running state (may be completed or not started)`,
        )
      }
    })
  }
}
