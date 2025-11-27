import type { FolderScopeAppPermissions } from '@lombokapp/types'
import { SignedURLsRequestMethod } from '@lombokapp/types'
import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { and, eq, inArray } from 'drizzle-orm'
import type { JwtPayload } from 'jsonwebtoken'
import * as jwt from 'jsonwebtoken'
import { appsTable } from 'src/app/entities/app.entity'
import { appFolderSettingsTable } from 'src/app/entities/app-folder-settings.entity'
import { authConfig } from 'src/auth/config'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { OrmService } from 'src/orm/orm.service'
import { platformConfig } from 'src/platform/config'
import { createS3PresignedUrls } from 'src/storage/s3.utils'
import { tasksTable } from 'src/task/entities/task.entity'
import { v4 as uuidV4 } from 'uuid'

const ALGORITHM = 'HS256'
const WORKER_JOB_JWT_SUB_PREFIX = 'worker_job:'

// JWT expiry for worker job tokens (30 minutes)
const WORKER_JOB_TOKEN_EXPIRY_SECONDS = 30 * 60

// The permission required for uploading files to a folder
const WRITE_OBJECTS_PERMISSION: FolderScopeAppPermissions = 'WRITE_OBJECTS'

export interface WorkerJobTokenClaims {
  jobId: string
  taskId: string
  appIdentifier: string
  allowedUploads: Record<string, string[]> // folder_id -> allowed prefixes
}

export interface UploadFileRequest {
  folderId: string
  objectKey: string
  contentType: string
}

export interface UploadURL {
  folderId: string
  objectKey: string
  presignedUrl: string
}

export interface UploadedFile {
  folderId: string
  objectKey: string
}

export interface CompleteJobRequest {
  success: boolean
  result?: unknown
  error?: {
    code: string
    message: string
  }
  uploadedFiles?: UploadedFile[]
}

@Injectable()
export class WorkerJobService {
  constructor(
    @Inject(authConfig.KEY)
    private readonly _authConfig: nestjsConfig.ConfigType<typeof authConfig>,
    @Inject(platformConfig.KEY)
    private readonly _platformConfig: nestjsConfig.ConfigType<
      typeof platformConfig
    >,
    private readonly ormService: OrmService,
  ) {}

  /**
   * Validate and filter allowed uploads based on app permissions.
   * This method checks that the app has WRITE_OBJECTS permission for each folder.
   * Returns only the folder/prefix combinations that are actually allowed.
   */
  async validateAllowedUploads(
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
      validatedUploads[folderId] = requestedUploads[folderId]
    }

    return validatedUploads
  }

  /**
   * Create a JWT token for a worker job with validated allowed uploads.
   * This is an async method that validates permissions before creating the token.
   */
  async createValidatedWorkerJobToken(params: {
    jobId: string
    taskId: string
    appIdentifier: string
    allowedUploads: Record<string, string[]>
  }): Promise<string> {
    // Validate and filter allowed uploads based on app permissions
    const validatedUploads = await this.validateAllowedUploads(
      params.appIdentifier,
      params.allowedUploads,
    )

    // Create the token with validated uploads
    return this.createWorkerJobToken({
      ...params,
      allowedUploads: validatedUploads,
    })
  }

  /**
   * Create a JWT token for a worker job with specific allowed uploads.
   * NOTE: This method does NOT validate permissions - use createValidatedWorkerJobToken instead.
   * This is kept for backward compatibility and internal use.
   */
  createWorkerJobToken(params: {
    jobId: string
    taskId: string
    appIdentifier: string
    allowedUploads: Record<string, string[]>
  }): string {
    const payload = {
      aud: this._platformConfig.platformHost,
      jti: uuidV4(),
      sub: `${WORKER_JOB_JWT_SUB_PREFIX}${params.jobId}`,
      job_id: params.jobId,
      task_id: params.taskId,
      app_identifier: params.appIdentifier,
      allowed_uploads: params.allowedUploads,
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
        subject: `${WORKER_JOB_JWT_SUB_PREFIX}${expectedJobId}`,
      }) as JwtPayload & {
        job_id: string
        task_id: string
        app_identifier: string
        allowed_uploads: Record<string, string[]>
      }

      return {
        jobId: decoded.job_id,
        taskId: decoded.task_id,
        appIdentifier: decoded.app_identifier,
        allowedUploads: decoded.allowed_uploads,
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
   * Request presigned upload URLs for files
   */
  async requestUploadUrls(
    claims: WorkerJobTokenClaims,
    files: UploadFileRequest[],
  ): Promise<UploadURL[]> {
    // Validate all requested uploads are allowed
    for (const file of files) {
      const allowedPrefixes = claims.allowedUploads[file.folderId] as
        | string[]
        | undefined
      if (!allowedPrefixes) {
        throw new ForbiddenException(
          `Upload to folder ${file.folderId} is not allowed for this job`,
        )
      }

      // Check if the object key starts with any allowed prefix
      const isAllowed = allowedPrefixes.some((prefix) =>
        file.objectKey.startsWith(prefix),
      )
      if (!isAllowed) {
        throw new ForbiddenException(
          `Upload to object key ${file.objectKey} in folder ${file.folderId} is not allowed. Allowed prefixes: ${allowedPrefixes.join(', ')}`,
        )
      }
    }

    // Get unique folder IDs
    const folderIds = [...new Set(files.map((f) => f.folderId))]

    // Look up folders with their content storage locations in a single query
    const folders = await this.ormService.db.query.foldersTable.findMany({
      where: (tbl) => inArray(tbl.id, folderIds),
      with: { contentLocation: true },
    })

    if (folders.length !== folderIds.length) {
      const foundIds = new Set(folders.map((f) => f.id))
      const missingIds = folderIds.filter((id) => !foundIds.has(id))
      throw new NotFoundException(`Folders not found: ${missingIds.join(', ')}`)
    }

    // Build a map of folder ID -> folder (with contentLocation included)
    const folderMap = new Map(folders.map((f) => [f.id, f]))

    // Generate presigned URLs
    const urlRequests = files.map((file) => {
      const folder = folderMap.get(file.folderId)
      if (!folder) {
        throw new NotFoundException(`Folder not found: ${file.folderId}`)
      }
      const { contentLocation } = folder

      // Build the full object key with storage location prefix
      const fullObjectKey = contentLocation.prefix
        ? `${contentLocation.prefix}/${file.objectKey}`
        : file.objectKey

      return {
        endpoint: contentLocation.endpoint,
        region: contentLocation.region,
        accessKeyId: contentLocation.accessKeyId,
        secretAccessKey: contentLocation.secretAccessKey,
        bucket: contentLocation.bucket,
        objectKey: fullObjectKey,
        method: SignedURLsRequestMethod.PUT,
        expirySeconds: 3600, // 1 hour
      }
    })

    const presignedUrls = createS3PresignedUrls(urlRequests)

    return files.map((file, index) => ({
      folderId: file.folderId,
      objectKey: file.objectKey,
      presignedUrl: presignedUrls[index],
    }))
  }

  /**
   * Mark a worker job as complete
   */
  async completeJob(
    claims: WorkerJobTokenClaims,
    request: CompleteJobRequest,
  ): Promise<void> {
    const { taskId } = claims
    const { success, result, error, uploadedFiles } = request

    // Find the task
    const task = await this.ormService.db.query.tasksTable.findFirst({
      where: eq(tasksTable.id, taskId),
    })

    if (!task) {
      throw new NotFoundException(`Task not found: ${taskId}`)
    }

    // Update task status
    const now = new Date()
    const updateData: Partial<typeof tasksTable.$inferInsert> = {
      updatedAt: now,
    }

    if (success) {
      updateData.completedAt = now
      // Store the result and uploaded files info in updates
      if (result !== undefined || uploadedFiles) {
        const existingUpdates = task.updates
        const completionUpdate = {
          updateData: {
            result,
            uploadedFiles,
          },
          updateTemplateString: 'Job completed successfully',
        }
        updateData.updates = [...existingUpdates, completionUpdate]
      }
    } else {
      updateData.errorAt = now
      updateData.errorCode = error?.code || 'UNKNOWN_ERROR'
      updateData.errorMessage =
        error?.message || 'Job failed without error details'
      updateData.errorDetails = {
        code: error?.code || 'UNKNOWN_ERROR',
        message: error?.message || 'Job failed without error details',
      }
    }

    await this.ormService.db
      .update(tasksTable)
      .set(updateData)
      .where(eq(tasksTable.id, taskId))

    // TODO: Emit event for job completion (for real-time updates)
    // TODO: Trigger any follow-up actions based on job result
  }
}
