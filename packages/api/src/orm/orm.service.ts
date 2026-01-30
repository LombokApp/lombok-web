import { Inject, Injectable, Logger } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import * as crypto from 'crypto'
import { eq, sql } from 'drizzle-orm'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import * as path from 'path'
import { Client, Pool, type PoolClient } from 'pg'
import { KVService } from 'src/cache/kv.service'

import { App, appsTable } from '../app/entities/app.entity'
import {
  appFolderSettingsRelations,
  appFolderSettingsTable,
} from '../app/entities/app-folder-settings.entity'
import {
  appUserSettingsRelations,
  appUserSettingsTable,
} from '../app/entities/app-user-settings.entity'
import { sessionsTable } from '../auth/entities/session.entity'
import { userIdentitiesTable } from '../auth/entities/user-identity.entity'
import { eventsTable } from '../event/entities/event.entity'
import {
  foldersRelations,
  foldersTable,
} from '../folders/entities/folder.entity'
import { folderObjectsTable } from '../folders/entities/folder-object.entity'
import {
  folderSharesRelations,
  folderSharesTable,
} from '../folders/entities/folder-share.entity'
import { logEntriesTable } from '../log/entities/log-entry.entity'
import { serverSettingsTable } from '../server/entities/server-configuration.entity'
import { storageLocationsTable } from '../storage/entities/storage-location.entity'
import { tasksTable } from '../task/entities/task.entity'
import { usersTable } from '../users/entities/user.entity'
import { ormConfig } from './config'
import {
  EXTENSIONS_SCHEMA,
  SHARED_FOLDER_ACL_FOLDER_VIEW,
  SHARED_FOLDER_ACL_SCHEMA,
} from './constants'

export const dbSchema = {
  usersTable,
  sessionsTable,
  userIdentitiesTable,
  storageLocationsTable,
  serverSettingsTable,
  foldersTable,
  foldersRelations,
  folderSharesRelations,
  folderObjectsTable,
  appsTable,
  appFolderSettingsTable,
  appFolderSettingsRelations,
  appUserSettingsTable,
  appUserSettingsRelations,
  eventsTable,
  logEntriesTable,
  tasksTable,
  folderSharesTable,
}

export const TEST_DB_PREFIX = 'lombok_test__'

@Injectable()
export class OrmService {
  private _db?: NodePgDatabase<typeof dbSchema>
  private _client?: Pool
  private readonly logger = new Logger(OrmService.name)

  constructor(
    @Inject(ormConfig.KEY)
    private readonly _ormConfig: nestjsConfig.ConfigType<typeof ormConfig>,
    private readonly kvService: KVService,
  ) {}

  get client(): Pool {
    if (!this._client) {
      this._client = new Pool({
        host: this._ormConfig.dbHost,
        port: this._ormConfig.dbPort,
        user: this._ormConfig.dbUser,
        password: this._ormConfig.dbPassword,
        database: this._ormConfig.dbName,
      })
    }
    return this._client
  }

  private getAppSchemaName(appIdentifier: string): string {
    return `app_${appIdentifier}`
  }

  private getAppRoleName(appIdentifier: string): string {
    return `app_role_${appIdentifier}`
  }

  private getAppRolePassword(appIdentifier: string): string | undefined {
    return this.kvService.ops.get(`app_role_password_${appIdentifier}`) as
      | string
      | undefined
  }

  private async getOrGenerateAppRolePassword(
    appIdentifier: string,
    forceNew = false,
  ): Promise<{
    password: string
    isNew: boolean
  }> {
    const roleName = this.getAppRoleName(appIdentifier)
    let isNew = false
    let currentPassword: string | undefined = forceNew
      ? undefined
      : this.getAppRolePassword(appIdentifier)
    if (!currentPassword) {
      isNew = true
      currentPassword = crypto.randomBytes(32).toString('hex')
      this.kvService.ops.set(
        `app_role_password_${appIdentifier}`,
        currentPassword,
      )
    }
    if (isNew) {
      await this.client.query(
        `ALTER ROLE ${roleName} PASSWORD '${currentPassword}'`,
      )
    }

    return { password: currentPassword, isNew }
  }

  async initAppRolesForAllApps(): Promise<void> {
    const apps = await this.db.query.appsTable.findMany({
      where: eq(sql`(${appsTable.config} ->> 'database')`, true),
    })
    await Promise.all(apps.map((app) => this.ensureAppDbConfig(app)))
  }

  async ensureAppDbConfig(app: App): Promise<void> {
    await this.ensureAppSchemaAndRole(app.identifier)
    await this.getOrGenerateAppRolePassword(app.identifier)
    if (app.config.permissions?.core?.includes('READ_FOLDER_ACL')) {
      await this.ensureAppFolderAclSchemaAccess(app.identifier)
    }
  }

  /**
   * Generate a consistent advisory lock ID from an app identifier
   * Uses a simple hash to convert the string identifier to a number
   */
  private getAdvisoryLockId(appIdentifier: string): number {
    let hash = 0
    for (let i = 0; i < appIdentifier.length; i++) {
      const char = appIdentifier.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    // Use a namespace prefix to avoid conflicts with other advisory locks
    // PostgreSQL advisory locks use 64-bit integers, so we can use a high bit
    return Math.abs(hash) | 0x40000000
  }

  private async ensureAppRole(appIdentifier: string): Promise<void> {
    const appSchemaName = this.getAppSchemaName(appIdentifier)
    const appRoleName = this.getAppRoleName(appIdentifier)
    const platformRole = this._ormConfig.dbUser
    const lockId = this.getAdvisoryLockId(appIdentifier)

    // Use a dedicated connection from the pool to ensure advisory locks work correctly
    // Advisory locks are session-scoped, so we need the same connection for lock/unlock
    const client = await this.client.connect()

    try {
      // Acquire advisory lock to prevent concurrent privilege grants
      await client.query('SELECT pg_advisory_lock($1)', [lockId])

      try {
        const roleExists = await client.query<{ exists: number }>(
          'SELECT 1 as exists FROM pg_roles WHERE rolname = $1',
          [appRoleName],
        )

        if (roleExists.rows.length === 0) {
          try {
            await client.query(`CREATE ROLE ${appRoleName} LOGIN`)
            await client.query(
              `ALTER ROLE ${appRoleName} SET search_path = ${appSchemaName}, ${EXTENSIONS_SCHEMA}`,
            )
            this.logger.log(
              `Created role ${appRoleName} for app ${appIdentifier}`,
            )
          } catch (error) {
            this.logger.error(
              `Failed to create role ${appRoleName} for app ${appIdentifier}`,
              error as Error,
            )
            throw error
          }
        }

        try {
          await client.query(`GRANT ${appRoleName} TO ${platformRole}`)
          await client.query(
            `GRANT USAGE, CREATE ON SCHEMA ${appSchemaName} TO ${appRoleName}`,
          )
          await client.query(
            `GRANT USAGE ON SCHEMA extensions TO ${appRoleName}`,
          )
          await client.query(
            `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${appSchemaName} TO ${appRoleName}`,
          )
          await client.query(
            `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${appSchemaName} TO ${appRoleName}`,
          )
          await client.query(
            `ALTER DEFAULT PRIVILEGES IN SCHEMA ${appSchemaName} GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${appRoleName}`,
          )
          await client.query(
            `ALTER DEFAULT PRIVILEGES IN SCHEMA ${appSchemaName} GRANT USAGE, SELECT ON SEQUENCES TO ${appRoleName}`,
          )
        } catch (error) {
          this.logger.error(
            `Failed to grant privileges for role ${appRoleName} and schema ${appSchemaName}, extensions`,
            error as Error,
          )
          throw error
        }
      } finally {
        // Always release the advisory lock, even if an error occurred
        await client.query('SELECT pg_advisory_unlock($1)', [lockId])
      }
    } finally {
      // Always release the connection back to the pool
      client.release()
    }
  }

  async runWithTestClient(func: (client: Client) => Promise<void>) {
    const c = new Client({
      host: this._ormConfig.dbHost,
      port: this._ormConfig.dbPort,
      user: this._ormConfig.dbUser,
      password: this._ormConfig.dbPassword,
      database: 'postgres',
    })
    await c.connect()
    try {
      await func(c)
    } finally {
      await c.end()
    }
  }

  get db(): NodePgDatabase<typeof dbSchema> {
    if (!this._db) {
      this._db = drizzle(this.client, {
        schema: dbSchema,
        logger: this._ormConfig.logQueries,
      })
    }
    return this._db
  }

  initialized = false

  async initDatabase() {
    if (this.initialized) {
      return
    }
    if (this._ormConfig.createDatabase) {
      await this.runWithTestClient(async (_c) => {
        const existsResult = await _c.query(
          'SELECT 1 FROM pg_database WHERE datname = $1',
          [this._ormConfig.dbName],
        )
        const exists = existsResult.rows.length > 0

        if (!exists) {
          await _c.query(`CREATE DATABASE ${this._ormConfig.dbName};`)
        }
      })
    }

    if (this._ormConfig.runMigrations) {
      await this.migrate()
    }

    await this.ensureSharedAclSchema()
    await this.ensureExtensionsSchema()

    this.initialized = true
  }

  async waitForInit() {
    const maxRetries = 50
    const retryPeriod = 50
    await new Promise<void>((resolve, reject) => {
      let checkCount = 0
      const interval = setInterval(() => {
        if (checkCount >= maxRetries) {
          clearInterval(interval)
          reject(new Error('Timeout waiting for db to init.'))
        } else if (this.initialized) {
          clearInterval(interval)
          resolve()
        }
        checkCount += 1
      }, retryPeriod)
    })
  }

  async migrate(): Promise<void> {
    await migrate(this.db, {
      migrationsFolder: path.join(import.meta.dirname, './migrations'),
    })
  }

  async resetTestDb() {
    if (!this._ormConfig.dbName.startsWith(TEST_DB_PREFIX)) {
      throw new Error('Attempt to reset non-test db.')
    }
    await this.truncateAllTestTables()
  }

  async getLatestDbCredentials(appIdentifier: string): Promise<{
    host: string
    user: string
    password: string
    database: string
    ssl: boolean
    port: number
  }> {
    await this.ensureAppSchemaAndRole(appIdentifier)
    return {
      host: this._ormConfig.dbHost,
      user: this.getAppRoleName(appIdentifier),
      password: (await this.getOrGenerateAppRolePassword(appIdentifier))
        .password,
      database: this._ormConfig.dbName,
      ssl:
        (await this._client
          ?.query<{ ssl: string }>(`SHOW ssl`)
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          .then((res) => res.rows[0]!.ssl)) === 'on',
      port: this._ormConfig.dbPort,
    }
  }

  public async truncateAllTestTables() {
    if (!this._ormConfig.dbName.startsWith(TEST_DB_PREFIX)) {
      throw new Error('Attempt to truncate non-test database.')
    }
    await this.runWithTestClient(async (_c) => {
      const existsResult = await _c.query(
        'SELECT 1 FROM pg_database WHERE datname = $1',
        [this._ormConfig.dbName],
      )
      const exists = existsResult.rows.length > 0

      if (!exists) {
        return
      }

      try {
        const tablesResult = await this.client.query(
          `SELECT tablename,schemaname FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'drizzle');`,
        )
        const tables = tablesResult.rows as {
          tablename: string
          schemaname: string
        }[]

        if (tables.length > 0) {
          const schemaToTableMapping = tables.reduce<Record<string, string[]>>(
            (acc, next) => ({
              ...acc,
              [next.schemaname]: (acc[next.schemaname] ?? []).concat(
                next.tablename,
              ),
            }),
            {},
          )

          for (const schema of Object.keys(schemaToTableMapping)) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const tableNames = schemaToTableMapping[schema]!.map(
              (t) => `"${t}"`,
            ).join(', ')
            const client = await this.client.connect()
            try {
              await client.query('BEGIN')
              await client.query('SET CONSTRAINTS ALL DEFERRED')
              await client.query(`SET SCHEMA '${schema}';`)
              const truncateTablesQuery = `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`
              await client.query(truncateTablesQuery)
              await client.query(`SET SCHEMA 'public';`)
              await client.query('SET CONSTRAINTS ALL IMMEDIATE')
              await client.query('COMMIT')
            } catch (error) {
              await client.query('ROLLBACK')
              throw error
            } finally {
              client.release()
            }
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to truncate tables:', error)
        throw error
      }
    })
  }

  async ensureSharedAclSchema(): Promise<void> {
    await this.client.query(
      `CREATE SCHEMA IF NOT EXISTS ${SHARED_FOLDER_ACL_SCHEMA}`,
    )
    await this.client.query(`
      CREATE OR REPLACE VIEW ${SHARED_FOLDER_ACL_SCHEMA}.${SHARED_FOLDER_ACL_FOLDER_VIEW} AS
      SELECT
        f."id" AS "folder_id",
        f."owner_id" AS "user_id",
        ARRAY['owner']::text[] AS "permissions",
        TRUE AS "is_owner"
      FROM public."folders" f
      UNION ALL
      SELECT
        fs."folder_id" AS "folder_id",
        fs."user_id" AS "user_id",
        fs."permissions" AS "permissions",
        FALSE AS "is_owner"
      FROM public."folder_shares" fs;
    `)
  }

  async ensureExtensionsSchema(): Promise<void> {
    // Create extensions schema if it doesn't exist
    await this.client.query(`CREATE SCHEMA IF NOT EXISTS ${EXTENSIONS_SCHEMA};`)
    await this.client.query(
      `GRANT USAGE ON SCHEMA extensions TO ${this._ormConfig.dbUser};`,
    )
  }

  /**
   * Ensure app schema exists
   */
  async ensureAppSchemaAndRole(appIdentifier: string): Promise<void> {
    const schemaName = this.getAppSchemaName(appIdentifier)

    // Check if schema exists
    const schemaExists = await this.client.query<{ exists: number }>(
      'SELECT 1 as exists FROM information_schema.schemata WHERE schema_name = $1',
      [schemaName],
    )

    if (schemaExists.rows.length === 0) {
      // Create the schema
      await this.client.query(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`)
    }

    await this.ensureAppRole(appIdentifier)
  }

  /**
   * Drop app schema (for cleanup/testing)
   */
  async dropAppSchema(appIdentifier: string): Promise<void> {
    const schemaName = this.getAppSchemaName(appIdentifier)
    await this.client.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`)
  }

  async ensureAppFolderAclSchemaAccess(appIdentifier: string): Promise<void> {
    const appRoleName = this.getAppRoleName(appIdentifier)

    await this.client.query(
      `GRANT USAGE ON SCHEMA ${SHARED_FOLDER_ACL_SCHEMA} TO ${appRoleName}`,
    )
    await this.client.query(
      `GRANT SELECT ON ALL TABLES IN SCHEMA ${SHARED_FOLDER_ACL_SCHEMA} TO ${appRoleName}`,
    )
    await this.client.query(
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${SHARED_FOLDER_ACL_SCHEMA} TO ${appRoleName}`,
    )

    const appSchemaName = this.getAppSchemaName(appIdentifier)

    await this.client.query(
      `ALTER ROLE ${appRoleName} SET search_path = ${appSchemaName}, ${EXTENSIONS_SCHEMA}, ${SHARED_FOLDER_ACL_SCHEMA}`,
    )
  }

  /**
   * Run migrations for a specific app
   */
  async runAppMigrations(
    appIdentifier: string,
    migrationFiles: { filename: string; content: string }[],
  ): Promise<void> {
    const schemaName = this.getAppSchemaName(appIdentifier)

    if (migrationFiles.length === 0) {
      return
    }

    // Create migration tracking table if it doesn't exist
    await this.client.query(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.__migrations__ (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        version VARCHAR(50) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64)
      )
    `)

    // Get list of executed migrations
    const executedMigrationsResult = await this.client.query(
      `SELECT filename FROM ${schemaName}.__migrations__ ORDER BY id`,
    )
    const executedMigrations = executedMigrationsResult.rows as {
      filename: string
    }[]

    const executedFilenames = new Set(executedMigrations.map((m) => m.filename))

    // Execute pending migrations in order
    for (const migrationFile of migrationFiles) {
      if (!executedFilenames.has(migrationFile.filename)) {
        await this.executeAppMigration(appIdentifier, migrationFile)
      }
    }
  }

  /**
   * Remove schema references from migration content
   * Strips schema prefixes from table references and removes CREATE SCHEMA statements
   */
  private removeSchemaReferencesFromMigration(content: string): string {
    let processedContent = content

    // Remove CREATE SCHEMA statements entirely
    processedContent = processedContent.replace(
      /CREATE\s+SCHEMA\s+[^;]+;/gi,
      '',
    )

    // Remove SET search_path statements
    processedContent = processedContent.replace(
      /SET\s+search_path\s+TO\s+[^;]+;/gi,
      '',
    )

    // Remove WITH SCHEMA clauses from CREATE EXTENSION statements
    processedContent = processedContent.replace(
      /CREATE\s+EXTENSION\s+[^;]+WITH\s+SCHEMA\s+[^;]+;/gi,
      (match) => match.replace(/\s+WITH\s+SCHEMA\s+[^;]+/gi, ''),
    )

    // Remove IN SCHEMA clauses from ALTER DEFAULT PRIVILEGES
    processedContent = processedContent.replace(
      /ALTER\s+DEFAULT\s+PRIVILEGES\s+IN\s+SCHEMA\s+"[^"]+"\s+/gi,
      'ALTER DEFAULT PRIVILEGES ',
    )
    processedContent = processedContent.replace(
      /ALTER\s+DEFAULT\s+PRIVILEGES\s+IN\s+SCHEMA\s+[a-zA-Z_][a-zA-Z0-9_]*\s+/gi,
      'ALTER DEFAULT PRIVILEGES ',
    )

    // Remove schema prefixes from quoted identifiers like "public"."table_name"
    // But preserve system schemas like pg_catalog, information_schema, etc.
    processedContent = processedContent.replace(
      /"(?!pg_catalog|information_schema|pg_toast|pg_temp)([^"]+)"\."([^"]+)"/g,
      '"$2"',
    )

    // Remove schema prefixes from mixed identifiers like public."table_name" or "schema".table_name
    // But preserve system schemas like pg_catalog, information_schema, etc.
    processedContent = processedContent.replace(
      /\b(?!pg_catalog|information_schema|pg_toast|pg_temp)([a-zA-Z_][a-zA-Z0-9_]*)\.("([^"]+)")/g,
      '$2',
    )
    processedContent = processedContent.replace(
      /"(?!pg_catalog|information_schema|pg_toast|pg_temp)([^"]+)"\.([a-zA-Z_][a-zA-Z0-9_]*)/g,
      '$2',
    )

    // Remove schema prefixes from unquoted identifiers like public.table_name
    // But preserve system schemas like pg_catalog, information_schema, etc.
    processedContent = processedContent.replace(
      /\b(?!pg_catalog|information_schema|pg_toast|pg_temp)([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\b/g,
      '$2',
    )

    // Clean up any extra whitespace that might be left
    processedContent = processedContent.replace(/\n\s*\n\s*\n/g, '\n\n')

    return processedContent.trim()
  }

  /**
   * Execute a single migration file for an app
   * Uses transaction-scoped search path to avoid affecting other queries
   */
  private async executeAppMigration(
    appIdentifier: string,
    migrationFile: { filename: string; content: string },
  ): Promise<void> {
    const schemaName = this.getAppSchemaName(appIdentifier)

    try {
      const migrationFileContent = this.removeSchemaReferencesFromMigration(
        migrationFile.content,
      )
      // Calculate checksum for migration integrity
      const checksum = this.calculateChecksum(migrationFile.content)

      const client: PoolClient = await this.client.connect()
      const appRoleName = this.getAppRoleName(appIdentifier)
      try {
        await client.query('BEGIN')
        await client.query(`SET LOCAL ROLE ${appRoleName}`)
        // Explicitly set search_path since SET ROLE doesn't apply role defaults
        await client.query(
          `SET LOCAL search_path = ${schemaName}, ${EXTENSIONS_SCHEMA}`,
        )
        await client.query(
          `SET LOCAL application_name = 'lombok_migrations=${appIdentifier}'`,
        )
        await client.query(migrationFileContent)
        await client.query(
          `INSERT INTO ${schemaName}.__migrations__ (filename, version, checksum) VALUES ($1, $2, $3)`,
          [
            migrationFile.filename,
            migrationFile.filename.split('_')[0],
            checksum,
          ],
        )
        await client.query('COMMIT')
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }

      this.logger.log(
        `Executed migration ${migrationFile.filename} for app ${appIdentifier}`,
      )
    } catch (error) {
      this.logger.error(
        `Failed to execute migration ${migrationFile.filename} for app ${appIdentifier}:`,
        error,
      )
      throw error
    }
  }

  /**
   * Calculate checksum for migration content
   */
  private calculateChecksum(content: string): string {
    // Simple checksum implementation - in production you might want to use crypto
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }

  /**
   * Get migration status for an app
   */
  async getAppMigrationStatus(appIdentifier: string): Promise<{
    executed: string[]
    pending: string[]
  }> {
    // Validate app identifier to prevent SQL injection
    if (!/^[a-z_][a-z0-9_]*$/.test(appIdentifier)) {
      throw new Error(`Invalid app identifier: ${appIdentifier}`)
    }

    const schemaName = this.getAppSchemaName(appIdentifier)

    try {
      // Get executed migrations
      const executedMigrationsResult = await this.client.query(
        `SELECT filename FROM ${schemaName}.__migrations__ ORDER BY id`,
      )
      const executedMigrations = executedMigrationsResult.rows as {
        filename: string
      }[]

      return {
        executed: executedMigrations.map((m) => m.filename),
        pending: [], // Would be populated by comparing with available migration files
      }
    } catch {
      // If migration table doesn't exist, return empty status
      return {
        executed: [],
        pending: [],
      }
    }
  }

  /**
   * Ensure the main app's search path is set correctly
   * This should be called after any app-specific operations to ensure
   * subsequent main app queries work correctly
   */
  async ensureMainAppSearchPath(): Promise<void> {
    await this.client.query('SET search_path TO public')
  }

  async close() {
    await this._client?.end()
  }
}
