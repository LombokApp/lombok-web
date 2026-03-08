import type {
  FolderScopeAppPermissions,
  JsonSerializableObject,
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
  InternalServerErrorException,
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
import type { DockerJobUpdateRequestDTO } from '../dto/docker-job-update-request.dto'
import type { DockerRouteAppContainerRequestDTO } from '../dto/docker-route-app-container-request.dto'
import type { DockerRouteAppContainerResponseDTO } from '../dto/docker-route-app-container-response.dto'
import { DockerClientService } from './client/docker-client.service'
import { DOCKER_LABELS } from './docker-jobs.service'

const ALGORITHM = 'HS256'
const DOCKER_WORKER_JOB_JWT_SUB_PREFIX = 'docker_worker_job:'
const DOCKER_CONTAINER_JWT_SUB_PREFIX = 'docker_container:'

// JWT expiry for worker job tokens (30 minutes)
const WORKER_JOB_TOKEN_EXPIRY_SECONDS = 30 * 60

// JWT expiry for container tokens (24 hours — containers are long-lived)
const CONTAINER_TOKEN_EXPIRY_SECONDS = 24 * 60 * 60

// The permission required for uploading files to a folder
const WRITE_OBJECTS_PERMISSION: FolderScopeAppPermissions = 'WRITE_OBJECTS'

const relayRequestContextSchema = z.object({
  workerIdentifier: z.string(),
  url: z.string(),
  method: z.string(),
  headers: z.record(z.string(), z.string()),
  body: z.unknown().optional(),
  authUser: z.literal(true).optional(),
})

export interface DockerExecutorMetadata {
  profileKey: string
  profileHash: string
  jobIdentifier: string
  containerId: string
  hostId: string
  extra: JsonSerializableObject
}

export interface DockerWorkerJobClaims {
  jobId: string
  executorMetadata: DockerExecutorMetadata
  taskId: string
  storageAccessPolicy: StorageAccessPolicy
}

export interface DockerContainerClaims {
  appIdentifier: string
  profileKey: string
  hostId: string
  containerId: string
  userId?: string
}

export type CompleteJobRequest = z.infer<typeof dockerJobResultSchema>

@Injectable()
export class DockerWorkerHookService {
  private readonly logger = new Logger(DockerWorkerHookService.name)
  taskService: TaskService
  coreTaskService: CoreTaskService
  appService: AppService
  constructor(
    @Inject(authConfig.KEY)
    private readonly _authConfig: nestjsConfig.ConfigType<typeof authConfig>,
    @Inject(coreConfig.KEY)
    private readonly _coreConfig: nestjsConfig.ConfigType<typeof coreConfig>,
    private readonly ormService: OrmService,
    private readonly dockerClientService: DockerClientService,
    @Inject(forwardRef(() => CoreTaskService))
    _coreTaskService,
    @Inject(forwardRef(() => TaskService))
    _taskService,
    @Inject(forwardRef(() => AppService))
    _appService,
  ) {
    this.coreTaskService = _coreTaskService as CoreTaskService
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
   * Create a long-lived JWT token scoped to a specific container.
   * Injected into the container via `lombok-worker-agent set-context` for relay-request auth.
   */
  createDockerContainerToken(params: {
    appIdentifier: string
    profileKey: string
    hostId: string
    containerId: string
    userId?: string
  }): string {
    const payload = {
      aud: this._coreConfig.platformHost,
      jti: uuidV4(),
      sub: `${DOCKER_CONTAINER_JWT_SUB_PREFIX}${params.containerId}`,
      app_identifier: params.appIdentifier,
      profile_key: params.profileKey,
      host_id: params.hostId,
      container_id: params.containerId,
      ...(params.userId ? { user_id: params.userId } : {}),
    }

    return jwt.sign(payload, this._authConfig.authJwtSecret, {
      algorithm: ALGORITHM,
      expiresIn: CONTAINER_TOKEN_EXPIRY_SECONDS,
    })
  }

  /**
   * Refresh a container token, issuing a new JWT with the same claims but fresh expiry.
   */
  refreshContainerToken(claims: DockerContainerClaims): { token: string } {
    const token = this.createDockerContainerToken({
      appIdentifier: claims.appIdentifier,
      profileKey: claims.profileKey,
      hostId: claims.hostId,
      containerId: claims.containerId,
      userId: claims.userId,
    })
    return { token }
  }

  /**
   * Verify a container token and return the claims.
   */
  verifyDockerContainerToken(token: string): DockerContainerClaims {
    try {
      const decoded = jwt.verify(token, this._authConfig.authJwtSecret, {
        algorithms: [ALGORITHM],
        audience: this._coreConfig.platformHost,
      }) as JwtPayload & {
        app_identifier: string
        profile_key: string
        host_id: string
        container_id: string
        user_id?: string
      }

      if (!decoded.sub?.startsWith(DOCKER_CONTAINER_JWT_SUB_PREFIX)) {
        throw new UnauthorizedException('Token is not a container token')
      }

      return {
        appIdentifier: decoded.app_identifier,
        profileKey: decoded.profile_key,
        hostId: decoded.host_id,
        containerId: decoded.container_id,
        userId: decoded.user_id,
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Container token has expired')
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid container token')
      }
      throw error
    }
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
        options: { tx },
      })
    })
  }

  /**
   * Route a request from an app container to an app runtime worker.
   *
   * 1. Validate the claimed hostId matches the container token's hostId
   * 2. Find the container and verify its labels match the token claims
   * 3. Read the pending request context from /tmp/lombok-relay-requests/<requestId>.json inside the container
   * 4. Optionally create an app-user access token if the token has a userId
   * 5. Forward the request to the core-worker at localhost:3001/worker-api and return the response
   */
  async routeAppContainerRequest(
    claims: DockerContainerClaims,
    body: DockerRouteAppContainerRequestDTO,
  ): Promise<DockerRouteAppContainerResponseDTO> {
    try {
      const { appIdentifier, hostId, containerId, userId } = claims

      // 1. Exec into container to read the request context
      const exec = await this.dockerClientService.execInContainer(
        hostId,
        containerId,
        ['cat', `/tmp/lombok-relay-requests/${body.requestId}.json`],
      )
      const execState = await exec.state()
      const { stdout, stderr } = exec.output()
      if (execState.exitCode !== 0) {
        throw new NotFoundException(
          `Request file not found in container: ${stderr || 'exit code ' + String(execState.exitCode)}`,
        )
      }

      // 4. Parse and validate request context JSON
      const requestContext = relayRequestContextSchema.parse(
        JSON.parse(stdout),
      )

      // 5. Resolve user context (if authUser is requested)
      let accessToken: string | undefined
      if (requestContext.authUser) {
        if (!userId) {
          throw new UnauthorizedException(
            'Request requires authenticated user but container has no user context',
          )
        }
        const tokenResult = await this.appService.createAppUserAccessTokenAsApp(
          {
            actor: { appIdentifier },
            userId,
          },
        )
        accessToken = tokenResult.accessToken
      }

      // 6. Build the forwarding URL and headers
      const workerUrl = `http://localhost:3001/worker-api/${requestContext.workerIdentifier}/${requestContext.url}`

      const forwardHeaders: Record<string, string> = {
        ...requestContext.headers,
        Host: `${appIdentifier}.apps.localhost`,
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      }

      // 7. Forward the request
      const response = await fetch(workerUrl, {
        method: requestContext.method,
        headers: forwardHeaders,
        ...(requestContext.body &&
        requestContext.method !== 'GET' &&
        requestContext.method !== 'HEAD'
          ? {
              body:
                typeof requestContext.body === 'string'
                  ? requestContext.body
                  : JSON.stringify(requestContext.body),
            }
          : {}),
      })

      // 8. Read response and return
      const responseHeaders: Record<string, string> = {}
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value
      })

      let responseBody: unknown
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        responseBody = await response.json()
      } else {
        responseBody = await response.text()
      }

      return {
        status: response.status,
        headers: responseHeaders,
        body: responseBody,
      }
    } catch (error) {
      // Re-throw NestJS HTTP exceptions as-is
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof UnauthorizedException ||
        error instanceof ConflictException ||
        error instanceof InternalServerErrorException
      ) {
        throw error
      }
      // Wrap unexpected errors
      this.logger.error('routeAppContainerRequest failed', error)
      throw new InternalServerErrorException(
        `Failed to route app container request: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Process a mid-execution update from a running Docker worker.
   *
   * Orchestrates: store update -> emit socket -> dispatch onUpdate handlers
   *
   * @param claims - The claims from the worker job token
   * @param request - The update request body
   */
  async processUpdate(
    claims: DockerWorkerJobClaims,
    request: DockerJobUpdateRequestDTO,
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

      // 3. Delegate to TaskService (store + socket emit + handler dispatch)
      const result = await this.taskService.registerTaskUpdate(
        innerTaskId,
        request,
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
