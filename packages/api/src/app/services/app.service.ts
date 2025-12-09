import { hashLocalFile } from '@lombokapp/core-worker-utils'
import type {
  AppConfig,
  AppContributions,
  AppManifest,
  AppMetrics,
  AppWorkersMap,
  ExecuteAppDockerJobOptions,
  ExternalAppWorker,
  FolderScopeAppPermissions,
  StorageAccessPolicy,
  UserScopeAppPermissions,
} from '@lombokapp/types'
import {
  appConfigWithManifestSchema,
  CORE_APP_IDENTIFIER,
  FolderPermissionEnum,
  LogEntryLevel,
  SignedURLsRequestMethod,
} from '@lombokapp/types'
import { mimeFromExtension } from '@lombokapp/utils'
import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import nestJsConfig from '@nestjs/config'
import { spawn } from 'bun'
import { and, count, eq, ilike, inArray, or, SQL, sql } from 'drizzle-orm'
import fs from 'fs'
import fsPromises from 'fs/promises'
import os from 'os'
import path from 'path'
import { JWTService } from 'src/auth/services/jwt.service'
import { SessionService } from 'src/auth/services/session.service'
import { KVService } from 'src/cache/kv.service'
import { DockerExecResult } from 'src/docker/services/client/docker-client.types'
import { DockerJobsService } from 'src/docker/services/docker-jobs.service'
import { eventsTable } from 'src/event/entities/event.entity'
import { EventService } from 'src/event/services/event.service'
import type { FolderWithoutLocations } from 'src/folders/entities/folder.entity'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { folderObjectsTable } from 'src/folders/entities/folder-object.entity'
import { FolderNotFoundException } from 'src/folders/exceptions/folder-not-found.exception'
import { FolderOperationForbiddenException } from 'src/folders/exceptions/folder-operation-forbidden.exception'
import { FolderService } from 'src/folders/services/folder.service'
import { logEntriesTable } from 'src/log/entities/log-entry.entity'
import { LogEntryService } from 'src/log/services/log-entry.service'
import { OrmService } from 'src/orm/orm.service'
import { readDirRecursive } from 'src/platform/utils/fs.util'
import { normalizeSortParam, parseSort } from 'src/platform/utils/sort.util'
import { ServerConfigurationService } from 'src/server/services/server-configuration.service'
import { uploadFile } from 'src/shared/utils'
import {
  APP_WORKER_INFO_CACHE_KEY_PREFIX,
  AppSocketService,
} from 'src/socket/app/app-socket.service'
import { storageLocationsTable } from 'src/storage/entities/storage-location.entity'
import { S3Service } from 'src/storage/s3.service'
import { createS3PresignedUrls } from 'src/storage/s3.utils'
import { tasksTable } from 'src/task/entities/task.entity'
import { TaskService } from 'src/task/services/task.service'
import { User, usersTable } from 'src/users/entities/user.entity'
import { z } from 'zod'

import { appConfig } from '../config'
import { CoreAppService } from '../core-app.service'
import { AppFolderSettingsUpdateInputDTO } from '../dto/app-folder-settings-update-input.dto'
import { AppSort } from '../dto/apps-list-query-params.dto'
import { AppFolderSettingsGetResponseDTO } from '../dto/responses/app-folder-settings-get-response.dto'
import { AppUserSettingsGetResponseDTO } from '../dto/responses/app-user-settings-get-response.dto'
import { UpdateAppAccessSettingsInputDTO } from '../dto/update-app-access-settings-input.dto'
import { App, appsTable, NewApp } from '../entities/app.entity'
import {
  AppFolderSettings,
  appFolderSettingsTable,
} from '../entities/app-folder-settings.entity'
import {
  AppUserSettings,
  appUserSettingsTable,
} from '../entities/app-user-settings.entity'
import { AppAlreadyInstalledException } from '../exceptions/app-already-installed.exception'
import { AppInvalidException } from '../exceptions/app-invalid.exception'
import { AppNotParsableException } from '../exceptions/app-not-parsable.exception'
import { AppRequirementsNotSatisfiedException } from '../exceptions/app-requirements-not-satisfied.exception'
import {
  resolveFolderAppSettings,
  resolveUserAppSettings,
} from '../utils/resolve-app-settings.utils'
import { handleAppSocketMessage } from './app-socket-message.handler'

const MAX_APP_FILE_SIZE = 1024 * 1024 * 16
const MAX_APP_TOTAL_SIZE = 1024 * 1024 * 32

export type MetadataUploadUrlsResponse = {
  folderId: string
  objectKey: string
  url: string
}[]

export interface AppDefinition {
  config: AppConfig
  ui: Record<string, { size: number; hash: string }>
  workersScripts: Record<
    string,
    {
      name: string
      files: Record<string, { size: number; hash: string }>
    }
  >
}

export interface AppWithMigrations extends NewApp {
  migrationFiles: { filename: string; content: string }[]
}

@Injectable()
export class AppService {
  folderService: FolderService
  eventService: EventService
  coreAppService: CoreAppService
  taskService: TaskService
  private readonly appSocketService: AppSocketService
  private readonly dockerJobsService: DockerJobsService
  private readonly logger = new Logger(AppService.name)
  constructor(
    @Inject(appConfig.KEY)
    private readonly _appConfig: nestJsConfig.ConfigType<typeof appConfig>,
    private readonly ormService: OrmService,
    private readonly logEntryService: LogEntryService,
    private readonly jwtService: JWTService,
    @Inject(forwardRef(() => CoreAppService)) _coreAppService,
    @Inject(forwardRef(() => TaskService)) _taskService,
    @Inject(forwardRef(() => EventService)) _eventService,
    private readonly sessionService: SessionService,
    private readonly serverConfigurationService: ServerConfigurationService,
    private readonly kvService: KVService,
    @Inject(forwardRef(() => FolderService)) _folderService,
    @Inject(forwardRef(() => AppSocketService)) _appSocketService,
    private readonly s3Service: S3Service,
    @Inject(forwardRef(() => DockerJobsService))
    _dockerOrchestrationService,
  ) {
    this.coreAppService = _coreAppService as CoreAppService
    this.taskService = _taskService as TaskService
    this.folderService = _folderService as FolderService
    this.eventService = _eventService as EventService
    this.appSocketService = _appSocketService as AppSocketService
    this.dockerJobsService = _dockerOrchestrationService as DockerJobsService
  }

  public async setAppEnabledAsAdmin(
    user: User,
    appIdentifier: string,
    enabled: boolean,
  ): Promise<App> {
    if (!user.isAdmin) {
      throw new UnauthorizedException()
    }

    const app = await this.getApp(appIdentifier)
    if (!app) {
      throw new NotFoundException(`App not found: ${appIdentifier}`)
    }

    const now = new Date()
    const [updated] = await this.ormService.db
      .update(appsTable)
      .set({ enabled, updatedAt: now })
      .where(eq(appsTable.identifier, appIdentifier))
      .returning()
    if (!enabled) {
      this.appSocketService.disconnectAllClientsByAppIdentifier(appIdentifier)
    } else {
      void this.coreAppService.startCoreAppThread()
    }
    return updated
  }

  public async updateAppAccessSettingsAsAdmin(
    user: User,
    appIdentifier: string,
    accessSettingsUpdate: UpdateAppAccessSettingsInputDTO,
  ): Promise<App> {
    if (!user.isAdmin) {
      throw new UnauthorizedException()
    }

    const app = await this.getApp(appIdentifier)
    if (!app) {
      throw new NotFoundException(`App not found: ${appIdentifier}`)
    }

    const now = new Date()
    const [updated] = await this.ormService.db
      .update(appsTable)
      .set({
        ...accessSettingsUpdate,
        updatedAt: now,
      })
      .where(eq(appsTable.identifier, appIdentifier))
      .returning()
    return updated
  }

  getApp(
    appIdentifier: string,
    {
      enabled,
    }: {
      enabled?: boolean
    } = {},
  ): Promise<App | undefined> {
    const idCondition = eq(appsTable.identifier, appIdentifier)
    return this.ormService.db.query.appsTable.findFirst({
      where:
        typeof enabled === 'boolean'
          ? and(idCondition, eq(appsTable.enabled, enabled))
          : idCondition,
    })
  }

  getAppAsUser(appIdentifier: string): Promise<App | undefined> {
    return this.ormService.db.query.appsTable.findFirst({
      where: and(
        eq(appsTable.identifier, appIdentifier),
        eq(appsTable.enabled, true),
      ),
    })
  }

  async createAppUserAccessTokenAsApp({
    actor,
    userId,
  }: {
    actor: { appIdentifier: string }
    userId: string
  }) {
    const app = await this.getApp(actor.appIdentifier, { enabled: true })
    const user = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.id, userId),
    })
    if (!user) {
      throw new NotFoundException(`User not found: ${userId}`)
    }
    if (!app?.enabled) {
      throw new NotFoundException(`App not found: ${actor.appIdentifier}`)
    }

    return this.sessionService.createAppUserSession(user, actor.appIdentifier)
  }

  async createAppUserSession(user: User, appIdentifier: string) {
    const app = await this.getApp(appIdentifier, { enabled: true })
    if (!app) {
      throw new NotFoundException(`App not found: ${appIdentifier}`)
    }

    return this.sessionService.createAppUserSession(user, appIdentifier)
  }

  async handleAppRequest(
    handlerId: string,
    requestingAppIdentifier: string,
    message: unknown,
  ) {
    return handleAppSocketMessage(handlerId, requestingAppIdentifier, message, {
      eventService: this.eventService,
      ormService: this.ormService,
      logEntryService: this.logEntryService,
      folderService: this.folderService,
      taskService: this.taskService,
      appService: this,
      jwtService: this.jwtService,
      serverConfigurationService: this.serverConfigurationService,
      s3Service: this.s3Service,
    })
  }

  async createSignedContentUrls(
    requests: {
      folderId: string
      objectKey: string
      method: SignedURLsRequestMethod
    }[],
  ) {
    // get presigned upload URLs for content objects
    return this._createSignedUrls(requests)
  }

  async createSignedMetadataUrls(
    requests: {
      folderId: string
      objectKey: string
      contentHash: string
      method: SignedURLsRequestMethod
      metadataHash: string
    }[],
  ) {
    const folders: Record<string, FolderWithoutLocations | undefined> = {}

    const urls: MetadataUploadUrlsResponse = createS3PresignedUrls(
      await Promise.all(
        requests.map(async (request) => {
          const folder =
            folders[request.folderId] ??
            (await this.ormService.db.query.foldersTable.findFirst({
              where: eq(folderObjectsTable.id, request.folderId),
            }))
          folders[request.folderId] = folder

          if (!folder) {
            throw new FolderNotFoundException()
          }

          const metadataLocation =
            await this.ormService.db.query.storageLocationsTable.findFirst({
              where: eq(storageLocationsTable.id, folder.metadataLocationId),
            })

          if (!metadataLocation) {
            throw new NotFoundException(
              undefined,
              `Storage location not found by id "${folder.metadataLocationId}"`,
            )
          }
          return {
            method: request.method,
            objectKey: `${metadataLocation.prefix}${
              metadataLocation.prefix && !metadataLocation.prefix.endsWith('/')
                ? '/'
                : ''
            }${request.objectKey}/${request.metadataHash}`,
            accessKeyId: metadataLocation.accessKeyId,
            secretAccessKey: metadataLocation.secretAccessKey,
            bucket: metadataLocation.bucket,
            endpoint: metadataLocation.endpoint,
            expirySeconds: 86400, // TODO: control this somewhere
            region: metadataLocation.region,
          }
        }),
      ),
    ).map((_url, i) => {
      return {
        folderId: requests[i].folderId,
        objectKey: requests[i].objectKey,
        url: _url,
      }
    })

    return urls
  }

  async createSignedAppStorageUrls(
    requestingAppIdentifier: string,
    payload: {
      objectKey: string
      method: SignedURLsRequestMethod
    }[],
  ) {
    const serverStorage =
      await this.serverConfigurationService.getServerStorage()
    if (!serverStorage) {
      throw new Error('Server storage not found')
    }
    const urls = this.s3Service.createS3PresignedUrls(
      payload.map(({ method, objectKey }) => ({
        method,
        objectKey: `${serverStorage.prefix}${!serverStorage.prefix || serverStorage.prefix.endsWith('/') ? '' : '/'}app-runtime-storage/${requestingAppIdentifier}${objectKey.startsWith('/') ? '' : '/'}${objectKey}`,
        accessKeyId: serverStorage.accessKeyId,
        secretAccessKey: serverStorage.secretAccessKey,
        bucket: serverStorage.bucket,
        endpoint: serverStorage.endpoint,
        expirySeconds: 3600,
        region: serverStorage.region,
      })),
    )
    return urls
  }

  async _createSignedUrls(
    signedUrlRequests: {
      method: SignedURLsRequestMethod
      folderId: string
      objectKey: string
    }[],
  ): Promise<
    {
      folderId: string
      objectKey: string
      method: SignedURLsRequestMethod
      url: string
    }[]
  > {
    const presignedUrlRequestsByFolderId = signedUrlRequests.reduce<
      Record<
        string,
        { objectKey: string; method: SignedURLsRequestMethod }[] | undefined
      >
    >((acc, next) => {
      return {
        ...acc,
        [next.folderId]: (acc[next.folderId] ?? []).concat([
          { objectKey: next.objectKey, method: next.method },
        ]),
      }
    }, {})

    const folderIds = Object.keys(presignedUrlRequestsByFolderId)
    let signedUrls: {
      folderId: string
      objectKey: string
      method: SignedURLsRequestMethod
      url: string
    }[] = []

    for (const folderId of folderIds) {
      const folder = await this.ormService.db.query.foldersTable.findFirst({
        where: eq(foldersTable.id, folderId),
        with: {
          contentLocation: true,
          metadataLocation: true,
        },
      })
      if (!folder) {
        throw new FolderNotFoundException()
      }
      const folderRequests = presignedUrlRequestsByFolderId[folderId]

      if (!folderRequests) {
        continue
      }

      signedUrls = signedUrls.concat(
        this.s3Service
          .createS3PresignedUrls(
            folderRequests.map(({ method, objectKey }) => ({
              method,
              objectKey: `${folder.contentLocation.prefix}${!folder.contentLocation.prefix || folder.contentLocation.prefix.endsWith('/') ? '' : '/'}${objectKey}`,
              accessKeyId: folder.contentLocation.accessKeyId,
              secretAccessKey: folder.contentLocation.secretAccessKey,
              bucket: folder.contentLocation.bucket,
              endpoint: folder.contentLocation.endpoint,
              expirySeconds: 3600,
              region: folder.contentLocation.region,
            })),
          )
          .map((url, i) => ({
            url,
            folderId,
            ...folderRequests[i],
          })),
      )
    }

    return signedUrls.map((signedUrl) => ({
      url: signedUrl.url,
      method: signedUrl.method,
      folderId: signedUrl.folderId,
      objectKey: signedUrl.objectKey,
    }))
  }

  async getAppUIbundle(
    requestingAppIdentifier: string,
    requestData: { appIdentifier: string },
  ) {
    // verify the app is the installed "core" app
    if (requestingAppIdentifier !== CORE_APP_IDENTIFIER) {
      // must be "core" app to access app UI bundles
      return {
        result: undefined,
        error: {
          code: 403,
          message: 'Unauthorized.',
        },
      }
    }

    const workerApp = await this.getApp(requestData.appIdentifier, {
      enabled: true,
    })
    if (!workerApp) {
      // app by appIdentifier not found
      return {
        result: undefined,
        error: {
          code: 404,
          message: 'App not found.',
        },
      }
    }

    if (Object.keys(workerApp.ui.manifest).length === 0) {
      // No UI bundle exists for this app
      return {
        result: undefined,
        error: {
          code: 404,
          message: 'UI bundle not found.',
        },
      }
    }

    const serverStorageLocation =
      await this.serverConfigurationService.getServerStorage()

    if (!serverStorageLocation) {
      return {
        result: undefined,
        error: {
          code: 500,
          message: 'Server storage location not available.',
        },
      }
    }

    const presignedGetURL = this.s3Service.createS3PresignedUrls([
      {
        method: SignedURLsRequestMethod.GET,
        objectKey: `${serverStorageLocation.prefix ? serverStorageLocation.prefix + '/' : ''}app-bundle-storage/${requestData.appIdentifier}/ui/${workerApp.ui.hash}.zip`,
        accessKeyId: serverStorageLocation.accessKeyId,
        secretAccessKey: serverStorageLocation.secretAccessKey,
        bucket: serverStorageLocation.bucket,
        endpoint: serverStorageLocation.endpoint,
        expirySeconds: 3600,
        region: serverStorageLocation.region,
      },
    ])

    return {
      manifest: workerApp.ui.manifest,
      bundleUrl: presignedGetURL[0],
      csp: workerApp.ui.csp,
    }
  }

  public async listAppsAsAdmin(
    user: User,
    {
      offset,
      limit,
      sort = [AppSort.CreatedAtDesc],
      search,
      enabled,
    }: {
      offset?: number
      limit?: number
      sort?: AppSort[]
      search?: string
      enabled?: boolean
    } = {},
  ): Promise<{ meta: { totalCount: number }; result: App[] }> {
    if (!user.isAdmin) {
      throw new UnauthorizedException()
    }

    const conditions: (SQL | undefined)[] = []

    if (search) {
      conditions.push(
        or(
          ilike(appsTable.label, `%${search}%`),
          ilike(appsTable.identifier, `%${search}%`),
        ),
      )
    }

    if (typeof enabled === 'boolean') {
      conditions.push(eq(appsTable.enabled, enabled))
    }

    const apps = await this.ormService.db.query.appsTable.findMany({
      ...(conditions.length ? { where: and(...conditions) } : {}),
      offset: Math.max(0, offset ?? 0),
      limit: Math.min(100, limit ?? 25),
      orderBy: parseSort(
        appsTable,
        normalizeSortParam(sort) ?? [AppSort.CreatedAtDesc],
      ),
    })

    const appsCountResult = await this.ormService.db
      .select({
        count: count(),
      })
      .from(appsTable)
      .where(conditions.length ? and(...conditions) : undefined)

    return {
      result: apps,
      meta: { totalCount: appsCountResult[0]?.count ?? 0 },
    }
  }

  public async listEnabledAppsAsUser(): Promise<{
    meta: { totalCount: number }
    result: App[]
  }> {
    const apps = await this.ormService.db.query.appsTable.findMany({
      where: eq(appsTable.enabled, true),
      orderBy: [appsTable.label],
    })

    const appsCountResult = await this.ormService.db
      .select({
        count: count(),
      })
      .from(appsTable)
      .where(eq(appsTable.enabled, true))

    return {
      result: apps,
      meta: { totalCount: appsCountResult[0]?.count ?? 0 },
    }
  }

  public async uninstallApp(app: App) {
    const serverStorageLocation =
      await this.serverConfigurationService.getServerStorage()
    const appRequiresStorage = Object.keys(app.manifest).filter(
      (manifestItemPath) =>
        manifestItemPath.startsWith('/ui') ||
        manifestItemPath.startsWith('/workers'),
    ).length

    if (appRequiresStorage && serverStorageLocation) {
      const prefix = `${serverStorageLocation.prefix ? serverStorageLocation.prefix + '/' : ''}${app.identifier}/`
      await this.s3Service.deleteAllWithPrefix({
        ...serverStorageLocation,
        prefix,
      })
    }

    // remove app db record
    await this.ormService.db
      .delete(appsTable)
      .where(eq(appsTable.identifier, app.identifier))
  }

  public async installApp(app: AppWithMigrations, update = false) {
    const now = new Date()
    const installedApp = await this.getApp(app.identifier)
    if (installedApp && !update) {
      throw new AppAlreadyInstalledException()
    }
    const assetManifestEntryPaths = Object.keys(app.manifest).filter(
      (manifestItemPath) =>
        manifestItemPath.startsWith('/ui') ||
        manifestItemPath.startsWith('/workers'),
    )

    const serverStorageLocation =
      await this.serverConfigurationService.getServerStorage()
    const appRequiresStorage = assetManifestEntryPaths.length > 0

    if (appRequiresStorage && !serverStorageLocation) {
      throw new AppRequirementsNotSatisfiedException()
    }

    if (installedApp) {
      // uninstall currently installed app instance
      await this.uninstallApp(installedApp)
    }

    if (serverStorageLocation) {
      // Helper function to create, zip, hash, and upload a bundle
      const createAndUploadBundle = async (
        bundleName: string,
      ): Promise<{ hash: string; size: number }> => {
        const pathPrefix = `/${bundleName}/`
        // Create a temp dir for this bundle
        const bundleDir = await fsPromises.mkdtemp(
          path.join(os.tmpdir(), `appzip-${bundleName}-`),
        )
        const filePaths = assetManifestEntryPaths.filter((filePath) =>
          filePath.startsWith(pathPrefix),
        )
        if (filePaths.length === 0) {
          throw new Error(`No files found for bundle ${bundleName}`)
        }

        // Copy files into temp dir, preserving structure
        for (const entryPath of filePaths) {
          const relPath = entryPath.slice(pathPrefix.length)
          const destPath = path.join(bundleDir, relPath)
          await fsPromises.mkdir(path.dirname(destPath), { recursive: true })
          const srcPath = path.join(
            this._appConfig.appsLocalPath,
            app.identifier,
            entryPath,
          )
          await fsPromises.copyFile(srcPath, destPath)
        }

        // Zip the contents
        const zipName = `${bundleName}.zip`
        const zipPath = path.join(bundleDir, zipName)
        const zipProc = spawn({
          cmd: ['zip', '-r', zipPath, './'],
          cwd: bundleDir,
          stdout: 'inherit',
          stderr: 'inherit',
        })
        const zipCode = await zipProc.exited
        if (zipCode !== 0) {
          throw new Error(`Failed to zip assets for bundle ${bundleName}`)
        }

        // Compute hash of the zipped bundle
        const zipHash = await hashLocalFile(zipPath)

        // Upload zip to app storage
        const objectKey = [
          serverStorageLocation.prefix?.replace(/\/+$/, '') ?? '',
          'app-bundle-storage',
          app.identifier,
          bundleName,
          `${zipHash}.zip`,
        ]
          .filter(Boolean)
          .join('/')

        this.logger.log('Uploading app asset zip:', {
          objectKey,
          zipPath,
        })
        const [url] = this.s3Service.createS3PresignedUrls([
          {
            ...serverStorageLocation,
            method: SignedURLsRequestMethod.PUT,
            expirySeconds: 600,
            objectKey,
          },
        ])

        // Upload the zip file
        await uploadFile(zipPath, url, 'application/zip')

        const zipSize = fs.statSync(zipPath).size
        // Clean up temp dir
        await fsPromises.rm(bundleDir, { recursive: true, force: true })

        return { hash: zipHash, size: zipSize }
      }

      // Process UI bundle if it exists in the app config
      if (app.config.ui) {
        app.ui = {
          ...app.ui,
          ...(await createAndUploadBundle('ui')),
        }
      }

      // Process worker bundles based on app.config.workers
      if (app.config.workers) {
        app.workers = {
          ...app.workers,
          ...(await createAndUploadBundle('workers')),
        }
      }
    }

    // update app db record to match new app
    if (installedApp) {
      await this.ormService.db
        .update(appsTable)
        .set({ ...app, createdAt: installedApp.createdAt, updatedAt: now })
        .where(eq(appsTable.identifier, installedApp.identifier))
    } else {
      await this.ormService.db.insert(appsTable).values({
        ...app,
        createdAt: now,
        updatedAt: now,
      })
    }

    // Run migrations if the app has any
    if (app.migrationFiles.length > 0) {
      try {
        this.logger.log(
          `Running ${app.migrationFiles.length} migrations for app ${app.identifier}`,
        )
        await this.ormService.runAppMigrations(
          app.identifier,
          app.migrationFiles,
        )
        this.logger.log(
          `Successfully completed migrations for app ${app.identifier}`,
        )
      } catch (error) {
        this.logger.error(
          `Failed to run migrations for app ${app.identifier}:`,
          error,
        )
        throw error
      }
    }
  }

  public async installAllAppsFromDisk() {
    // get potential app identifier from the directory structure

    const allPotentialAppDirectoriesEntries =
      this.getAllPotentialAppDirectories(this._appConfig.appsLocalPath)

    // for each potential app, attempt to install it (without updating if its already installed)
    for (const appIdentifier of allPotentialAppDirectoriesEntries) {
      await this.attemptParseAndInstallAppFromDisk(appIdentifier, false)
    }
  }

  public async attemptParseAndInstallAppFromDisk(
    directoryName: string,
    update: boolean,
  ) {
    try {
      const app = await this.parseAppFromDisk(directoryName)

      if (app.validation.value && app.definition) {
        await this.installApp(app.definition, update)
      } else {
        this.logger.warn(
          `APP PARSE ERROR - (dir: '${directoryName}'): App config is invalid`,
          app.validation.error?.errors,
        )
      }
    } catch (error) {
      if (error instanceof AppAlreadyInstalledException) {
        this.logger.log(
          `APP INSTALL SKIPPED (dir: '${directoryName}'): App is already installed.`,
        )
      } else if (error instanceof AppNotParsableException) {
        this.logger.warn(
          `APP INSTALL ERROR (dir: '${directoryName}'): App is not parsable.`,
        )
      } else if (error instanceof AppRequirementsNotSatisfiedException) {
        this.logger.warn(
          `APP INSTALL ERROR (dir: '${directoryName}'): App requirements are not met.`,
        )
      } else if (error instanceof AppInvalidException) {
        this.logger.warn(
          `APP INSTALL ERROR (dir: '${directoryName}'): App is invalid.`,
          error.message,
        )
      } else {
        this.logger.warn(
          `APP INSTALL ERROR - (dir: '${directoryName}'):`,
          error,
        )
      }
    }
  }

  /**
   * Discover migration files in an app directory
   */
  private discoverMigrationFiles(
    appRoot: string,
  ): { filename: string; content: string }[] {
    const migrationsDir = path.join(appRoot, 'migrations')

    if (!fs.existsSync(migrationsDir)) {
      return []
    }

    const migrationFiles: { filename: string; content: string }[] = []

    try {
      const files = fs
        .readdirSync(migrationsDir)
        .filter((file) => file.endsWith('.sql'))
        .sort() // Sort by filename to ensure proper execution order

      for (const file of files) {
        const filePath = path.join(migrationsDir, file)
        const content = fs.readFileSync(filePath, 'utf-8')
        migrationFiles.push({
          filename: file,
          content,
        })
      }
    } catch (error) {
      this.logger.warn(
        `Failed to read migration files from ${migrationsDir}:`,
        error,
      )
    }

    return migrationFiles
  }

  public getAllPotentialAppDirectories = (appsDirectoryPath: string) => {
    if (!fs.existsSync(appsDirectoryPath)) {
      this.logger.warn('Apps directory "%s" not found.', appsDirectoryPath)
      return []
    }
    return fs
      .readdirSync(appsDirectoryPath)
      .filter((appIdentifier) =>
        fs.lstatSync(path.join(appsDirectoryPath, appIdentifier)).isDirectory(),
      )
  }

  public async parseAppFromDisk(appDirectoryName: string): Promise<{
    definition?: AppWithMigrations
    validation: { value: boolean; error?: z.ZodError }
  }> {
    const now = new Date()

    let currentTotalSize = 0
    const publicKeyPath = path.join(
      this._appConfig.appsLocalPath,
      appDirectoryName,
      '.publicKey',
    )
    const configPath = path.join(
      this._appConfig.appsLocalPath,
      appDirectoryName,
      'config.json',
    )
    const publicKey =
      fs.existsSync(publicKeyPath) && !fs.lstatSync(publicKeyPath).isDirectory()
        ? fs.readFileSync(publicKeyPath, 'utf-8')
        : ''

    const config = fs.existsSync(configPath)
      ? (JSON.parse(fs.readFileSync(configPath, 'utf-8')) as AppConfig)
      : undefined

    if (!config) {
      throw new AppNotParsableException(`Config file not found`)
    }

    const appIdentifier = config.identifier

    const appRoot = path.join(this._appConfig.appsLocalPath, appDirectoryName)
    const manifest = (
      await Promise.all(
        readDirRecursive(appRoot).map(async (absoluteAssetPath) => {
          const size = fs.statSync(absoluteAssetPath).size
          if (size > MAX_APP_FILE_SIZE) {
            throw new Error(`App file too large! MAX: ${MAX_APP_FILE_SIZE}`)
          }
          currentTotalSize += size
          if (currentTotalSize > MAX_APP_TOTAL_SIZE) {
            throw new Error(
              `Total app files size is too large! MAX: ${MAX_APP_TOTAL_SIZE}`,
            )
          }
          const relativeAssetPath = absoluteAssetPath.slice(appRoot.length)

          return {
            size: fs.statSync(absoluteAssetPath).size,
            path: relativeAssetPath,
            hash: await hashLocalFile(absoluteAssetPath),
            mimeType:
              mimeFromExtension(relativeAssetPath) ??
              'application/octet-stream',
          }
        }),
      )
    ).reduce<AppManifest>((acc, nextManifestEntry) => {
      acc[nextManifestEntry.path] = {
        hash: nextManifestEntry.hash,
        size: nextManifestEntry.size,
        mimeType: nextManifestEntry.mimeType,
      }
      return acc
    }, {})

    const workerScriptDefinitions = Object.entries(
      config.workers ?? {},
    ).reduce<AppWorkersMap>((acc, [workerIdentifier, value]) => {
      return {
        ...acc,
        [workerIdentifier]: {
          ...value,
          environmentVariables: value.environmentVariables ?? {},
        },
      }
    }, {})

    const uiDefinition = {
      hash: '',
      size: 0,
      csp: config.ui?.csp,
      manifest: Object.keys(manifest)
        .filter((filePath) => filePath.startsWith(`/ui/`))
        .reduce<AppManifest>((acc, filePath) => {
          return {
            ...acc,
            [filePath.slice(`/ui/`.length)]: manifest[filePath],
          }
        }, {}),
    }

    // Discover migration files
    const migrationFiles = this.discoverMigrationFiles(appRoot)

    const parseResult = appConfigWithManifestSchema(manifest).safeParse(config)
    const workerBundleManifest = Object.keys(manifest)
      .filter((filePath) => filePath.startsWith(`/workers/`))
      .reduce<AppManifest>((acc, filePath) => {
        return {
          ...acc,
          [filePath.slice(`/workers/`.length)]: manifest[filePath],
        }
      }, {})

    const app = {
      validation: {
        value: parseResult.success,
        error: parseResult.success ? undefined : parseResult.error,
      },
      definition: parseResult.success
        ? {
            identifier: appIdentifier,
            label: config.label,
            manifest,
            publicKey,
            workers: {
              manifest: workerBundleManifest,
              definitions: workerScriptDefinitions,
              hash: '',
              size: 0,
            },
            permissions: {
              platform: config.permissions?.platform ?? [],
              user: config.permissions?.user ?? [],
              folder: config.permissions?.folder ?? [],
            },
            subscribedPlatformEvents: config.subscribedPlatformEvents ?? [],
            implementedTasks: config.tasks?.map((t) => t.identifier) ?? [],
            requiresStorage:
              Object.keys(uiDefinition).length > 0 ||
              Object.keys(workerScriptDefinitions).length > 0,
            ui: uiDefinition,
            config,
            containerProfiles: config.containerProfiles ?? {},
            database: !!config.database?.enabled,
            createdAt: now,
            updatedAt: now,
            contentHash: '', // TODO: calculate the exact content hash
            userScopeEnabledDefault: false, // TODO: allow some way to enable this on install
            folderScopeEnabledDefault: false, // TODO: allow some way to enable this on install
            enabled: true,
            migrationFiles, // Add migration files to app definition
          }
        : undefined,
    }
    return app
  }

  /**
   * Update the environmentVariables for a specific worker script in an app.
   * @param params.appIdentifier - The app's identifier
   * @param params.workerIdentifier - The worker script's identifier
   * @param params.environmentVariables - The new environment variables
   * @returns The updated environmentVariables object
   */
  async setAppWorkerEnvironmentVariables({
    appIdentifier,
    workerIdentifier,
    environmentVariables,
  }: {
    appIdentifier: string
    workerIdentifier: string
    environmentVariables: Record<string, string>
  }): Promise<Record<string, string>> {
    // Fetch the app
    const app = await this.getApp(appIdentifier)
    if (!app) {
      throw new NotFoundException(`App not found: ${appIdentifier}`)
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!app.workers.definitions[workerIdentifier]) {
      throw new NotFoundException(
        `Worker script not found: ${workerIdentifier}`,
      )
    }
    // Update environmentVariables for the specified worker
    app.workers.definitions[workerIdentifier] = {
      ...app.workers.definitions[workerIdentifier],
      environmentVariables: { ...environmentVariables },
    }
    // Persist the change
    await this.ormService.db
      .update(appsTable)
      .set({ workers: app.workers })
      .where(eq(appsTable.identifier, appIdentifier))

    return app.workers.definitions[workerIdentifier].environmentVariables
  }

  getExternalWorkerConnections(): Record<string, ExternalAppWorker[]> {
    let cursor = 0
    let started = false
    let keys: string[] = []
    while (!started || cursor !== 0) {
      started = true

      const scanResult = this.kvService.ops.scan(
        cursor,
        `${APP_WORKER_INFO_CACHE_KEY_PREFIX}:*`,
        10000,
      )
      cursor = scanResult[0]
      keys = keys.concat(scanResult[1])
    }

    const result = keys.length
      ? this.kvService.ops
          .mget(...keys)
          .filter((_r) => _r)
          .reduce<Record<string, ExternalAppWorker[]>>(
            (acc, _r: string | undefined) => {
              const parsed = JSON.parse(
                _r ?? 'null',
              ) as ExternalAppWorker | null
              if (!parsed) {
                return acc
              }
              return {
                ...acc,
                [parsed.appIdentifier]: (parsed.appIdentifier in acc
                  ? acc[parsed.appIdentifier]
                  : []
                ).concat([parsed]),
              }
            },
            {},
          )
      : {}
    return result
  }

  async getAppContributions(): Promise<
    Record<
      string,
      {
        appLabel: string
        appIdentifier: string
        contributions: AppContributions
      }
    >
  > {
    const apps = await this.ormService.db.query.appsTable.findMany({
      where: eq(appsTable.enabled, true),
    })

    return apps.reduce((acc, nextApp) => {
      const contributions: AppContributions | undefined =
        nextApp.config.contributions ?? undefined
      return {
        ...acc,
        [nextApp.identifier]: {
          appLabel: nextApp.label,
          appIdentifier: nextApp.identifier,
          contributions: {
            sidebarMenuLinks: contributions?.sidebarMenuLinks ?? [],
            folderSidebarViews: contributions?.folderSidebarViews ?? [],
            objectSidebarViews: contributions?.objectSidebarViews ?? [],
            objectDetailViews: contributions?.objectDetailViews ?? [],
          },
        },
      }
    }, {})
  }

  async calculateAppMetrics(appIdentifier: string): Promise<AppMetrics> {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000)

    // Calculate tasks executed in the last 24 hours
    const tasksLast24Hours = await this.ormService.db
      .select({
        completed: count(tasksTable.id),
        failed: count(tasksTable.error),
      })
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.ownerIdentifier, appIdentifier),
          sql`${tasksTable.completedAt} >= ${oneDayAgo.toISOString()}::timestamp`,
        ),
      )

    // Calculate errors in the last 24 hours
    const errorsLast24Hours = await this.ormService.db
      .select({
        total: count(logEntriesTable.id),
        last10Minutes: count(
          sql`CASE WHEN ${logEntriesTable.createdAt} >= ${tenMinutesAgo.toISOString()}::timestamp THEN 1 END`,
        ),
      })
      .from(logEntriesTable)
      .where(
        and(
          eq(logEntriesTable.emitterIdentifier, appIdentifier),
          eq(logEntriesTable.level, LogEntryLevel.ERROR),
          sql`${logEntriesTable.createdAt} >= ${oneDayAgo.toISOString()}::timestamp`,
        ),
      )

    // Calculate events emitted in the last 24 hours
    const eventsLast24Hours = await this.ormService.db
      .select({
        total: count(eventsTable.id),
        last10Minutes: count(
          sql`CASE WHEN ${eventsTable.createdAt} >= ${tenMinutesAgo.toISOString()}::timestamp THEN 1 END`,
        ),
      })
      .from(eventsTable)
      .where(
        and(
          eq(eventsTable.emitterIdentifier, appIdentifier),
          sql`${eventsTable.createdAt} >= ${oneDayAgo.toISOString()}::timestamp`,
        ),
      )

    return {
      tasksExecutedLast24Hours: {
        completed: Number(tasksLast24Hours[0]?.completed ?? 0),
        failed: Number(tasksLast24Hours[0]?.failed ?? 0),
      },
      errorsLast24Hours: {
        total: Number(errorsLast24Hours[0]?.total ?? 0),
        last10Minutes: Number(errorsLast24Hours[0]?.last10Minutes ?? 0),
      },
      eventsEmittedLast24Hours: {
        total: Number(eventsLast24Hours[0]?.total ?? 0),
        last10Minutes: Number(eventsLast24Hours[0]?.last10Minutes ?? 0),
      },
    }
  }

  async getAppUserSettings(
    actor: User,
    appIdentifier: string,
  ): Promise<AppUserSettingsGetResponseDTO['settings']> {
    const app = await this.ormService.db.query.appsTable.findFirst({
      where: eq(appsTable.identifier, appIdentifier),
    })
    if (!app) {
      throw new NotFoundException(`App not found: ${appIdentifier}`)
    }

    const userAppSettings =
      await this.ormService.db.query.appUserSettingsTable.findFirst({
        where: and(
          eq(appUserSettingsTable.userId, actor.id),
          eq(appUserSettingsTable.appIdentifier, appIdentifier),
        ),
      })

    // Return default values if no custom settings exist
    if (!userAppSettings) {
      return resolveUserAppSettings(app)
    }

    // Resolve null values to app defaults
    return resolveUserAppSettings(app, userAppSettings)
  }

  async upsertAppUserSettings(
    actor: User,
    appIdentifier: string,
    enabled: boolean | null,
    folderScopeEnabledDefault: boolean | null,
    folderScopePermissionsDefault: FolderScopeAppPermissions[] | null,
    permissions: UserScopeAppPermissions[] | null,
  ): Promise<AppUserSettingsGetResponseDTO['settings']> {
    const app = await this.ormService.db.query.appsTable.findFirst({
      where: eq(appsTable.identifier, appIdentifier),
    })
    if (!app) {
      throw new NotFoundException(`App not found: ${appIdentifier}`)
    }

    const where = and(
      eq(appUserSettingsTable.userId, actor.id),
      eq(appUserSettingsTable.appIdentifier, appIdentifier),
    )

    const existingSettings =
      await this.ormService.db.query.appUserSettingsTable.findFirst({
        where,
      })

    const now = new Date()

    const updateValues = {
      enabled,
      folderScopeEnabledDefault,
      folderScopePermissionsDefault,
      permissions,
      updatedAt: now,
    }

    if (existingSettings) {
      await this.ormService.db
        .update(appUserSettingsTable)
        .set(updateValues)
        .where(where)
    } else {
      await this.ormService.db.insert(appUserSettingsTable).values({
        userId: actor.id,
        appIdentifier,
        enabled,
        folderScopePermissionsDefault,
        folderScopeEnabledDefault,
        permissions,
        createdAt: now,
        updatedAt: now,
      })
    }

    // Return resolved values (null becomes app default) - only resolve on read, store null in DB
    return this.getAppUserSettings(actor, appIdentifier)
  }

  async removeAppUserSettings(
    actor: User,
    appIdentifier: string,
  ): Promise<void> {
    const app = await this.ormService.db.query.appsTable.findFirst({
      where: eq(appsTable.identifier, appIdentifier),
    })
    if (!app) {
      throw new NotFoundException(`App not found: ${appIdentifier}`)
    }

    await this.ormService.db
      .delete(appUserSettingsTable)
      .where(
        and(
          eq(appUserSettingsTable.userId, actor.id),
          eq(appUserSettingsTable.appIdentifier, appIdentifier),
        ),
      )
      .execute()
  }

  async getFolderAppSettingsAsUser(
    actor: User,
    folderId: string,
  ): Promise<AppFolderSettingsGetResponseDTO['settings']> {
    const { folder } = await this.folderService.getFolderAsUser(actor, folderId)

    const enabledApps = await this.ormService.db.query.appsTable.findMany({
      where: eq(appsTable.enabled, true),
    })

    const enabledAppIdentifiers = new Set(
      enabledApps.map((app) => app.identifier),
    )

    const userSettings = await this.ormService.db.query.appUserSettingsTable
      .findMany({
        where: and(
          eq(appUserSettingsTable.userId, actor.id),
          inArray(appUserSettingsTable.appIdentifier, [
            ...enabledAppIdentifiers,
          ]),
        ),
      })
      .then((result) =>
        result.reduce<Record<string, AppUserSettings>>((acc, setting) => {
          acc[setting.appIdentifier] = setting
          return acc
        }, {}),
      )

    const folderSettings = await this.ormService.db.query.appFolderSettingsTable
      .findMany({
        where: and(
          eq(appFolderSettingsTable.folderId, folder.id),
          inArray(appUserSettingsTable.appIdentifier, [
            ...enabledAppIdentifiers,
          ]),
        ),
      })
      .then((result) =>
        result.reduce<Record<string, AppFolderSettings>>((acc, setting) => {
          acc[setting.appIdentifier] = setting
          return acc
        }, {}),
      )

    return enabledApps.reduce<AppFolderSettingsGetResponseDTO['settings']>(
      (acc, enabledApp) => {
        return {
          ...acc,
          [enabledApp.identifier]: resolveFolderAppSettings(
            enabledApp,
            userSettings[enabledApp.identifier],
            folderSettings[enabledApp.identifier],
          ),
        }
      },
      {},
    )
  }

  async updateFolderAppSettingsAsUser(
    actor: User,
    folderId: string,
    updates: AppFolderSettingsUpdateInputDTO,
  ): Promise<AppFolderSettingsGetResponseDTO['settings']> {
    const { folder, permissions: folderPermissions } =
      await this.folderService.getFolderAsUser(actor, folderId)
    if (!folderPermissions.includes(FolderPermissionEnum.FOLDER_EDIT)) {
      throw new FolderOperationForbiddenException()
    }

    const allUpdatedAppIdentifiers = Object.keys(updates)

    // Get all app identifiers that are being upserted
    const upsertedAppIdentifiers = Object.keys(updates).filter(
      (key) => updates[key] !== null,
    )

    const appIdentifiersToUpdate = await this.ormService.db.query.appsTable
      .findMany({
        where: inArray(appsTable.identifier, allUpdatedAppIdentifiers),
      })
      .then((apps) => new Set(apps.map((app) => app.identifier)))

    if (appIdentifiersToUpdate.size !== allUpdatedAppIdentifiers.length) {
      throw new NotFoundException(
        `Unknown app/s: ${allUpdatedAppIdentifiers.filter((identifier) => !appIdentifiersToUpdate.has(identifier)).join(', ')}`,
      )
    }

    // Get all app identifiers that are being deleted
    const deletedAppIdentifiers = Object.keys(updates).filter(
      (key) => updates[key] === null,
    )

    const now = new Date()

    // Use a transaction for atomicity
    await this.ormService.db.transaction(async (tx) => {
      for (const appIdentifier of upsertedAppIdentifiers) {
        const updatedSettings = updates[appIdentifier]
        const where = and(
          eq(appFolderSettingsTable.folderId, folder.id),
          eq(appFolderSettingsTable.appIdentifier, appIdentifier),
        )

        if (updatedSettings === null) {
          // Delete settings (fallback to default)
          await tx.delete(appFolderSettingsTable).where(where)
        } else {
          // Upsert/merge settings
          const existingSettings =
            await tx.query.appFolderSettingsTable.findFirst({
              where,
            })

          if (existingSettings) {
            // Merge with existing permissions if they exist

            await tx
              .update(appFolderSettingsTable)
              .set({
                ...('enabled' in updatedSettings
                  ? { enabled: updatedSettings.enabled }
                  : {}),
                ...('permissions' in updatedSettings
                  ? { permissions: updatedSettings.permissions }
                  : {}),
                updatedAt: now,
              })
              .where(where)
          } else {
            await tx.insert(appFolderSettingsTable).values({
              folderId: folder.id,
              appIdentifier,
              enabled:
                'enabled' in updatedSettings ? updatedSettings.enabled : null,
              permissions:
                'permissions' in updatedSettings
                  ? updatedSettings.permissions
                  : null,
              createdAt: now,
              updatedAt: now,
            })
          }
        }
      }
      await tx
        .delete(appFolderSettingsTable)
        .where(
          and(
            eq(appFolderSettingsTable.folderId, folder.id),
            inArray(
              appFolderSettingsTable.appIdentifier,
              deletedAppIdentifiers,
            ),
          ),
        )
    })

    // Return updated settings
    return this.getFolderAppSettingsAsUser(actor, folderId)
  }

  private getRequiredPermissionsForFolderFromPolicy(
    storageAccessPolicy: StorageAccessPolicy | undefined,
    folderId: string,
  ): FolderScopeAppPermissions[] {
    const folderPolicies =
      storageAccessPolicy?.filter((entry) => entry.folderId === folderId) ?? []
    if (folderPolicies.length === 0) {
      return []
    }

    const methods = folderPolicies.flatMap((entry) => entry.methods)
    const requiredPermissions = new Set<FolderScopeAppPermissions>()

    if (
      methods.some((method) =>
        [SignedURLsRequestMethod.GET, SignedURLsRequestMethod.HEAD].includes(
          method,
        ),
      )
    ) {
      requiredPermissions.add('READ_OBJECTS')
    }
    if (
      methods.some((method) =>
        [SignedURLsRequestMethod.PUT, SignedURLsRequestMethod.DELETE].includes(
          method,
        ),
      )
    ) {
      requiredPermissions.add('WRITE_OBJECTS')
    }

    return Array.from(requiredPermissions)
  }

  async validateAppUserAccess({
    appIdentifier,
    userId,
  }: {
    appIdentifier: string
    userId: string
  }): Promise<void> {
    const app = await this.getApp(appIdentifier, { enabled: true })
    if (!app) {
      throw new UnauthorizedException(
        `Unauthorized: app "${appIdentifier}" is not enabled or does not exist.`,
      )
    }

    const appUserSettings =
      await this.ormService.db.query.appUserSettingsTable.findFirst({
        where: and(
          eq(appUserSettingsTable.appIdentifier, appIdentifier),
          eq(appUserSettingsTable.userId, userId),
        ),
      })

    const resolvedUserSettings = resolveUserAppSettings(app, appUserSettings)

    if (!resolvedUserSettings.enabled) {
      throw new UnauthorizedException(
        `Unauthorized: app "${appIdentifier}" is not enabled for user "${userId}".`,
      )
    }
  }

  async validateAppFolderAccess({
    appIdentifier,
    folderId,
  }: {
    appIdentifier: string
    folderId: string
  }): Promise<void> {
    const app = await this.getApp(appIdentifier, { enabled: true })
    if (!app) {
      throw new UnauthorizedException(
        `Unauthorized: app "${appIdentifier}" is not enabled or does not exist.`,
      )
    }

    const folder = await this.ormService.db.query.foldersTable.findFirst({
      where: eq(foldersTable.id, folderId),
    })

    if (!folder) {
      throw new NotFoundException(`Folder not found: ${folderId}`)
    }

    const appUserSettings =
      await this.ormService.db.query.appUserSettingsTable.findFirst({
        where: and(
          eq(appUserSettingsTable.appIdentifier, appIdentifier),
          eq(appUserSettingsTable.userId, folder.ownerId),
        ),
      })

    console.log('appUserSettings:', appUserSettings)

    const appFolderSettings =
      await this.ormService.db.query.appFolderSettingsTable.findFirst({
        where: and(
          eq(appFolderSettingsTable.appIdentifier, appIdentifier),
          eq(appFolderSettingsTable.folderId, folderId),
        ),
      })

    const resolvedFolderSettings = resolveFolderAppSettings(
      app,
      appUserSettings,
      appFolderSettings,
    )
    const enabled =
      resolvedFolderSettings.enabled === null
        ? resolvedFolderSettings.enabledFallback.value
        : resolvedFolderSettings.enabled

    if (!enabled) {
      throw new UnauthorizedException(
        `Unauthorized: app "${appIdentifier}" is not enabled for folder "${folder.id}".`,
      )
    }
  }

  async validateAppStorageAccessPolicy({
    appIdentifier,
    storageAccessPolicy,
  }: {
    appIdentifier: string
    storageAccessPolicy?: StorageAccessPolicy
  }): Promise<void> {
    const uniqueFolderIds = Array.from(
      new Set(storageAccessPolicy?.map((entry) => entry.folderId)),
    )
    if (uniqueFolderIds.length === 0) {
      return
    }

    const app = await this.getApp(appIdentifier, { enabled: true })
    if (!app) {
      throw new UnauthorizedException(
        `Unauthorized: app "${appIdentifier}" is not enabled or does not exist.`,
      )
    }

    const folders = await this.ormService.db.query.foldersTable.findMany({
      where: inArray(foldersTable.id, uniqueFolderIds),
    })

    if (folders.length !== uniqueFolderIds.length) {
      const foundIds = new Set(folders.map((folder) => folder.id))
      const missingIds = uniqueFolderIds.filter((id) => !foundIds.has(id))
      throw new NotFoundException(
        `Folder${missingIds.length > 1 ? 's' : ''} not found: ${missingIds.join(', ')}`,
      )
    }

    const relevantUserIds = folders.reduce<Set<string>>((acc, folder) => {
      return acc.add(folder.ownerId)
    }, new Set<string>())

    const appUserSettings = relevantUserIds.size
      ? await this.ormService.db.query.appUserSettingsTable.findMany({
          where: and(
            eq(appUserSettingsTable.appIdentifier, appIdentifier),
            inArray(
              appUserSettingsTable.userId,
              Array.from(relevantUserIds.values()),
            ),
          ),
        })
      : []

    const appUserSettingsMap = new Map(
      appUserSettings.map((setting) => [setting.userId, setting]),
    )

    const folderSettings =
      await this.ormService.db.query.appFolderSettingsTable.findMany({
        where: and(
          eq(appFolderSettingsTable.appIdentifier, appIdentifier),
          inArray(appFolderSettingsTable.folderId, uniqueFolderIds),
        ),
      })
    const folderSettingsMap = new Map(
      folderSettings.map((setting) => [setting.folderId, setting]),
    )

    for (const folder of folders) {
      const userSetting = appUserSettingsMap.get(folder.ownerId) ?? undefined
      const folderSetting = folderSettingsMap.get(folder.id)

      const resolvedFolderSettings = resolveFolderAppSettings(
        app,
        userSetting,
        folderSetting,
      )

      const enabled =
        resolvedFolderSettings.enabled === null
          ? resolvedFolderSettings.enabledFallback.value
          : resolvedFolderSettings.enabled

      if (!enabled) {
        throw new UnauthorizedException(
          `Unauthorized: app "${appIdentifier}" is not enabled for folder "${folder.id}".`,
        )
      }

      const requiredPermissions =
        this.getRequiredPermissionsForFolderFromPolicy(
          storageAccessPolicy,
          folder.id,
        )
      for (const permission of requiredPermissions) {
        const permissions =
          resolvedFolderSettings.permissions === null
            ? resolvedFolderSettings.permissionsFallback.value
            : resolvedFolderSettings.permissions
        if (!permissions.includes(permission)) {
          throw new UnauthorizedException(
            `Unauthorized: app "${appIdentifier}" is missing "${permission}" permission for folder "${folder.id}".`,
          )
        }
      }
    }
  }

  /**
   * Executes a docker job of the specified app.
   *
   * This method is called either synchronously, at the request of the app,
   * or as a result of a task which is handled the docker job being queued.
   *
   * This method validates that the app has the specified profile and job class,
   * then delegates to the DockerJobsService to execute the job.
   *
   * @param params.waitForCompletion - Whether or not to execute the job synchronously and wait for the result.
   * @param params.appIdentifier - The app's identifier
   * @param params.profileIdentifier - The container profile to use
   * @param params.jobIdentifier - The job class within the profile
   * @param params.eventContext - Event-based context for the job
   * @returns The result of the docker job execution
   */
  async executeAppDockerJob<
    O extends ExecuteAppDockerJobOptions,
    T extends boolean = O['asyncTaskId'] extends string ? true : false,
  >(params: ExecuteAppDockerJobOptions): Promise<DockerExecResult<T>> {
    this.logger.debug('executeAppDockerJob params:', params)
    const {
      appIdentifier,
      profileIdentifier,
      jobIdentifier,
      jobInputData,
      storageAccessPolicy = [],
      asyncTaskId,
    } = params

    const profileSpec = await this.dockerJobsService.getProfileSpec(
      appIdentifier,
      profileIdentifier,
    )

    // validate the storage access policy rules if any are provided
    if (storageAccessPolicy.length) {
      await this.validateAppStorageAccessPolicy({
        appIdentifier,
        storageAccessPolicy,
      })
    }

    // Execute the docker job
    return this.dockerJobsService.executeDockerJob({
      profileSpec,
      profileHostConfigKey: `${appIdentifier}:${profileIdentifier}`,
      jobIdentifier,
      jobInputData,
      asyncTaskId,
      storageAccessPolicy,
    })
  }

  async getSearchResultsFromAppAsUser(
    actor: User,
    {
      appIdentifier,
      workerIdentifier,
      query,
    }: { appIdentifier: string; workerIdentifier: string; query: string },
  ): Promise<{ vector: number[] }> {
    await this.appSocketService.executeSynchronousAppRequest(appIdentifier, {
      url: `http://__SYSTEM__/worker-api/${workerIdentifier}/search`,
      body: {
        userId: actor.id,
        query,
        // space: 'text-v1',
      },
    })

    return { vector: [] }
  }
}
