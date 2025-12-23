import { Inject, Injectable, Logger } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import * as path from 'path'
import { Client, Pool, type PoolClient, QueryResult, QueryResultRow } from 'pg'

import { appsTable } from '../app/entities/app.entity'
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
import { SHARED_ACL_FOLDER_VIEW, SHARED_ACL_SCHEMA } from './constants'

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

  private async ensureAppRole(appIdentifier: string): Promise<void> {
    const client = this.client
    const schemaName = this.getAppSchemaName(appIdentifier)
    const roleName = this.getAppRoleName(appIdentifier)
    const platformRole = this._ormConfig.dbUser

    const roleExists = await client.query<{ exists: number }>(
      'SELECT 1 as exists FROM pg_roles WHERE rolname = $1',
      [roleName],
    )

    if (roleExists.rows.length === 0) {
      try {
        await client.query(`CREATE ROLE ${roleName} NOLOGIN`)
        this.logger.log(`Created role ${roleName} for app ${appIdentifier}`)
      } catch (error) {
        this.logger.error(
          `Failed to create role ${roleName} for app ${appIdentifier}`,
          error as Error,
        )
        throw error
      }
    }

    try {
      await client.query(`GRANT ${roleName} TO ${platformRole}`)
      await client.query(
        `GRANT USAGE, CREATE ON SCHEMA ${schemaName} TO ${roleName}`,
      )
      await client.query(`GRANT USAGE ON SCHEMA extensions TO ${roleName}`)
      await client.query(
        `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ${schemaName} TO ${roleName}`,
      )
      await client.query(
        `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${schemaName} TO ${roleName}`,
      )
      await client.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName} GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${roleName}`,
      )
      await client.query(
        `ALTER DEFAULT PRIVILEGES IN SCHEMA ${schemaName} GRANT USAGE, SELECT ON SEQUENCES TO ${roleName}`,
      )
    } catch (error) {
      this.logger.error(
        `Failed to grant privileges for role ${roleName} and schema ${schemaName}, extensions`,
        error as Error,
      )
      throw error
    }
  }

  private async configureAppSession(
    client: PoolClient,
    appIdentifier: string,
    options: { includePgCatalog?: boolean } = {},
  ): Promise<void> {
    const roleName = this.getAppRoleName(appIdentifier)
    const schemaName = this.getAppSchemaName(appIdentifier)
    const includePgCatalog = options.includePgCatalog ?? true

    try {
      await client.query(`SET LOCAL ROLE ${roleName}`)
    } catch (error) {
      this.logger.error(
        `Failed to set local role ${roleName} for app ${appIdentifier}`,
        error as Error,
      )
      throw error
    }

    const searchPath = includePgCatalog
      ? `${schemaName}, pg_catalog`
      : `${schemaName}`

    await client.query(`SET LOCAL search_path TO ${searchPath}, extensions`)
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
    await this.ensureVectorExtension()

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

  async ensureVectorExtension(): Promise<void> {
    // Create extensions schema if it doesn't exist
    await this.client.query(`CREATE SCHEMA IF NOT EXISTS extensions;`)
    await this.client.query(
      `GRANT USAGE ON SCHEMA extensions TO ${this._ormConfig.dbUser};`,
    )
    await this.client.query(
      `CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;`,
    )
  }

  async ensureSharedAclSchema(): Promise<void> {
    await this.client.query(`CREATE SCHEMA IF NOT EXISTS ${SHARED_ACL_SCHEMA}`)
    await this.client.query(`
      CREATE OR REPLACE VIEW ${SHARED_ACL_SCHEMA}.${SHARED_ACL_FOLDER_VIEW} AS
      SELECT
        f."id" AS "folderId",
        f."ownerId" AS "userId",
        ARRAY['owner']::text[] AS "permissions",
        TRUE AS "isOwner"
      FROM public."folders" f
      UNION ALL
      SELECT
        fs."folderId" AS "folderId",
        fs."userId" AS "userId",
        fs."permissions" AS "permissions",
        FALSE AS "isOwner"
      FROM public."folder_shares" fs;
    `)
  }

  /**
   * Execute a query for a specific app using its schema
   * Uses transaction-scoped search path to avoid affecting other queries
   */
  async executeQueryForApp<T extends QueryResultRow>(
    appIdentifier: string,
    sql: string,
    params: unknown[] = [],
    rowMode = 'array',
  ): Promise<QueryResult<T>> {
    // Validate app identifier to prevent SQL injection
    if (!/^[a-z_][a-z0-9_]*$/.test(appIdentifier)) {
      throw new Error(`Invalid app identifier: ${appIdentifier}`)
    }

    const client: PoolClient = await this.client.connect()
    try {
      await client.query('BEGIN')
      await this.configureAppSession(client, appIdentifier)

      // Handle rowMode parameter
      const queryConfig: { text: string; values: unknown[]; rowMode?: string } =
        {
          text: sql,
          values: params,
        }
      if (rowMode) {
        queryConfig.rowMode = rowMode
      }

      const result = await client.query(queryConfig)
      await client.query('COMMIT')
      return result as QueryResult<T>
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Execute a non-SELECT statement for a specific app using its schema
   * Uses transaction-scoped search path to avoid affecting other queries
   */
  async executeExecForApp(
    appIdentifier: string,
    sql: string,
    params: unknown[] = [],
  ): Promise<{ rowCount: number }> {
    // Validate app identifier to prevent SQL injection
    if (!/^[a-z_][a-z0-9_]*$/.test(appIdentifier)) {
      throw new Error(`Invalid app identifier: ${appIdentifier}`)
    }

    const client: PoolClient = await this.client.connect()
    try {
      await client.query('BEGIN')
      await this.configureAppSession(client, appIdentifier)
      const result = await client.query(sql, params)
      await client.query('COMMIT')
      return { rowCount: result.rowCount ?? 0 }
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Execute a batch of operations for a specific app using its schema
   * Uses transaction-scoped search path to avoid affecting other queries
   */
  async executeBatchForApp(
    appIdentifier: string,
    steps: {
      sql: string
      params?: unknown[]
      kind: 'query' | 'exec'
      rowMode?: string
    }[],
    atomic = false,
  ): Promise<{ results: unknown[] }> {
    // Validate app identifier to prevent SQL injection
    if (!/^[a-z_][a-z0-9_]*$/.test(appIdentifier)) {
      throw new Error(`Invalid app identifier: ${appIdentifier}`)
    }

    if (atomic) {
      const client: PoolClient = await this.client.connect()
      try {
        await client.query('BEGIN')
        await this.configureAppSession(client, appIdentifier, {
          includePgCatalog: false,
        })
        const results: unknown[] = []
        for (const step of steps) {
          // Handle rowMode parameter
          const queryConfig: {
            text: string
            values: unknown[]
            rowMode?: string
          } = {
            text: step.sql,
            values: step.params || [],
          }
          if (step.rowMode) {
            queryConfig.rowMode = step.rowMode
          }

          const res = await client.query(queryConfig)
          results.push(
            step.kind === 'query' ? res.rows : { rowCount: res.rowCount },
          )
        }
        await client.query('COMMIT')
        return { results }
      } catch (error) {
        await client.query('ROLLBACK')
        throw error
      } finally {
        client.release()
      }
    } else {
      // For non-atomic operations, each step gets its own transaction
      const results: unknown[] = []
      for (const step of steps) {
        const client: PoolClient = await this.client.connect()
        try {
          await client.query('BEGIN')
          await this.configureAppSession(client, appIdentifier, {
            includePgCatalog: false,
          })

          // Handle rowMode parameter
          const queryConfig: {
            text: string
            values: unknown[]
            rowMode?: string
          } = {
            text: step.sql,
            values: step.params || [],
          }
          if (step.rowMode) {
            queryConfig.rowMode = step.rowMode
          }

          const res = await client.query(queryConfig)
          await client.query('COMMIT')
          results.push(
            step.kind === 'query' ? res.rows : { rowCount: res.rowCount },
          )
        } catch (error) {
          await client.query('ROLLBACK')
          throw error
        } finally {
          client.release()
        }
      }
      return { results }
    }
  }

  /**
   * Ensure app schema exists
   */
  async ensureAppSchema(appIdentifier: string): Promise<void> {
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

  async grantAclSchemaUsageToApp(appIdentifier: string): Promise<void> {
    const roleName = this.getAppRoleName(appIdentifier)

    await this.client.query(
      `GRANT USAGE ON SCHEMA ${SHARED_ACL_SCHEMA} TO ${roleName}`,
    )
    await this.client.query(
      `GRANT SELECT ON ALL TABLES IN SCHEMA ${SHARED_ACL_SCHEMA} TO ${roleName}`,
    )
    await this.client.query(
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ${SHARED_ACL_SCHEMA} TO ${roleName}`,
    )
  }

  /**
   * Run migrations for a specific app
   */
  async runAppMigrations(
    appIdentifier: string,
    migrationFiles: { filename: string; content: string }[],
  ): Promise<void> {
    await this.ensureAppSchema(appIdentifier)

    // Validate app identifier to prevent SQL injection
    if (!/^[a-z_][a-z0-9_]*$/.test(appIdentifier)) {
      throw new Error(`Invalid app identifier: ${appIdentifier}`)
    }

    const schemaName = this.getAppSchemaName(appIdentifier)

    // Ensure schema exists
    await this.ensureAppSchema(appIdentifier)

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
      const roleName = this.getAppRoleName(appIdentifier)
      try {
        await client.query('BEGIN')
        await client.query(`SET LOCAL ROLE ${roleName}`)
        await this.configureAppSession(client, appIdentifier)
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
