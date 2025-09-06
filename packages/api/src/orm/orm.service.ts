import { Inject, Injectable } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import * as path from 'path'
import postgres from 'postgres'

import { appsTable } from '../app/entities/app.entity'
import { sessionsTable } from '../auth/entities/session.entity'
import { eventsRelations, eventsTable } from '../event/entities/event.entity'
import {
  foldersRelations,
  foldersTable,
} from '../folders/entities/folder.entity'
import { folderObjectsTable } from '../folders/entities/folder-object.entity'
import {
  folderSharesRelations,
  folderSharesTable,
} from '../folders/entities/folder-share.entity'
import {
  logEntriesRelations,
  logEntriesTable,
} from '../log/entities/log-entry.entity'
import { serverSettingsTable } from '../server/entities/server-configuration.entity'
import { storageLocationsTable } from '../storage/entities/storage-location.entity'
import { tasksRelations, tasksTable } from '../task/entities/task.entity'
import { usersTable } from '../users/entities/user.entity'
import { ormConfig } from './config'

export const dbSchema = {
  usersTable,
  sessionsTable,
  storageLocationsTable,
  serverSettingsTable,
  foldersTable,
  foldersRelations,
  folderSharesRelations,
  folderObjectsTable,
  appsTable,
  eventsTable,
  eventsRelations,
  logEntriesTable,
  logEntriesRelations,
  tasksTable,
  tasksRelations,
  folderSharesTable,
}

export const TEST_DB_PREFIX = 'lombok_test__'

@Injectable()
export class OrmService {
  private _db?: PostgresJsDatabase<typeof dbSchema>
  private _client?: postgres.Sql

  constructor(
    @Inject(ormConfig.KEY)
    private readonly _ormConfig: nestjsConfig.ConfigType<typeof ormConfig>,
  ) {}

  get client() {
    if (!this._client) {
      this._client = postgres(
        `postgres://${this._ormConfig.dbUser}:${this._ormConfig.dbPassword}@${this._ormConfig.dbHost}:${this._ormConfig.dbPort}/${this._ormConfig.dbName}`,
        this._ormConfig.disableNoticeLogging
          ? { onnotice: () => undefined }
          : undefined,
      )
    }
    return this._client
  }

  async runWithTestClient(func: (client: postgres.Sql) => Promise<void>) {
    const c = postgres(
      `postgres://${this._ormConfig.dbUser}:${this._ormConfig.dbPassword}@${this._ormConfig.dbHost}:${this._ormConfig.dbPort}/postgres`,
      this._ormConfig.disableNoticeLogging
        ? { onnotice: () => undefined }
        : undefined,
    )
    await func(c).finally(() => void c.end())
  }

  get db(): PostgresJsDatabase<typeof dbSchema> {
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
        const existsResult = await _c.unsafe(
          `SELECT 1 FROM pg_database WHERE datname = '${this._ormConfig.dbName}'`,
        )
        const exists = existsResult.count > 0

        if (!exists) {
          await _c.unsafe(`CREATE DATABASE ${this._ormConfig.dbName};`)
        }
      })
    }

    if (this._ormConfig.runMigrations) {
      await this.migrate()
    }

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

  async migrate() {
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
      const existsResult = await _c.unsafe(
        `SELECT 1 FROM pg_database WHERE datname = '${this._ormConfig.dbName}'`,
      )
      const exists = existsResult.count > 0

      if (!exists) {
        return
      }

      try {
        const tables = await this.client.unsafe(
          `SELECT tablename,schemaname FROM pg_tables WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'drizzle');`,
        )

        if (tables.length > 0) {
          const schemaToTableMapping = tables.reduce<Record<string, string[]>>(
            (acc, next) => ({
              ...acc,
              [next.schemaname]: (
                acc[next.schemaname as unknown as string] ?? []
              ).concat(next.tablename as unknown as string),
            }),
            {},
          )

          for (const schema of Object.keys(schemaToTableMapping)) {
            const tableNames = schemaToTableMapping[schema]
              .map((t) => `"${t}"`)
              .join(', ')
            await this.client.begin(async (sql) => {
              await sql`SET CONSTRAINTS ALL DEFERRED`
              await sql.unsafe(`SET SCHEMA '${schema}';`)
              const truncateTablesQuery = `TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE;`
              // console.log('TRUNCATING SCHEMA WITH QUERY:', truncateTablesQuery)
              await sql.unsafe(truncateTablesQuery)
              await sql.unsafe(`SET SCHEMA 'public';`)
              await sql`SET CONSTRAINTS ALL IMMEDIATE`
            })
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to truncate tables:', error)
        throw error
      }
    })
  }

  /**
   * Execute a query for a specific app using its schema
   * Uses transaction-scoped search path to avoid affecting other queries
   */
  async executeQueryForApp(
    appIdentifier: string,
    sql: string,
    params: unknown[] = [],
  ) {
    // Validate app identifier to prevent SQL injection
    if (!/^[a-z_][a-z0-9_]*$/.test(appIdentifier)) {
      throw new Error(`Invalid app identifier: ${appIdentifier}`)
    }

    const schemaName = `app_${appIdentifier}`

    // Use transaction to scope the search path change
    return this.client.begin(async (tx) => {
      // Set search path for this transaction only
      await tx.unsafe(`SET LOCAL search_path TO ${schemaName}`)
      // Execute the actual query
      return tx.unsafe(sql, params as never[])
    })
  }

  /**
   * Execute a non-SELECT statement for a specific app using its schema
   * Uses transaction-scoped search path to avoid affecting other queries
   */
  async executeExecForApp(
    appIdentifier: string,
    sql: string,
    params: unknown[] = [],
  ) {
    // Validate app identifier to prevent SQL injection
    if (!/^[a-z_][a-z0-9_]*$/.test(appIdentifier)) {
      throw new Error(`Invalid app identifier: ${appIdentifier}`)
    }

    const schemaName = `app_${appIdentifier}`

    // Use transaction to scope the search path change
    return this.client.begin(async (tx) => {
      // Set search path for this transaction only
      await tx.unsafe(`SET LOCAL search_path TO ${schemaName}`)
      // Execute the actual statement
      return tx.unsafe(sql, params as never[])
    })
  }

  /**
   * Execute a batch of operations for a specific app using its schema
   * Uses transaction-scoped search path to avoid affecting other queries
   */
  async executeBatchForApp(
    appIdentifier: string,
    steps: { sql: string; params?: unknown[]; kind: 'query' | 'exec' }[],
    atomic = false,
  ) {
    // Validate app identifier to prevent SQL injection
    if (!/^[a-z_][a-z0-9_]*$/.test(appIdentifier)) {
      throw new Error(`Invalid app identifier: ${appIdentifier}`)
    }

    const schemaName = `app_${appIdentifier}`

    if (atomic) {
      return this.client.begin(async (tx) => {
        // Set search path for this transaction only
        await tx.unsafe(`SET LOCAL search_path TO ${schemaName}`)

        const results = []
        for (const step of steps) {
          results.push(
            await tx.unsafe(step.sql, (step.params || []) as never[]),
          )
        }
        return { results }
      })
    } else {
      // For non-atomic operations, each step gets its own transaction
      const results: unknown[] = []
      for (const step of steps) {
        const result = await this.client.begin(async (tx) => {
          await tx.unsafe(`SET LOCAL search_path TO ${schemaName}`)
          return tx.unsafe(step.sql, (step.params || []) as never[])
        })
        results.push(result)
      }
      return { results }
    }
  }

  /**
   * Ensure app schema exists
   */
  async ensureAppSchema(appIdentifier: string): Promise<void> {
    const schemaName = `app_${appIdentifier}`

    // Check if schema exists
    const schemaExists = await this.client`
      SELECT 1 FROM information_schema.schemata 
      WHERE schema_name = ${schemaName}
    `

    if (schemaExists.length === 0) {
      // Create the schema
      await this.client.unsafe(`CREATE SCHEMA IF NOT EXISTS ${schemaName}`)
    }
  }

  /**
   * Drop app schema (for cleanup/testing)
   */
  async dropAppSchema(appIdentifier: string): Promise<void> {
    const schemaName = `app_${appIdentifier}`
    await this.client.unsafe(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`)
  }

  /**
   * Run migrations for a specific app
   */
  async runAppMigrations(
    appIdentifier: string,
    migrationFiles: { filename: string; content: string }[],
  ): Promise<void> {
    // Validate app identifier to prevent SQL injection
    if (!/^[a-z_][a-z0-9_]*$/.test(appIdentifier)) {
      throw new Error(`Invalid app identifier: ${appIdentifier}`)
    }

    const schemaName = `app_${appIdentifier}`

    // Ensure schema exists
    await this.ensureAppSchema(appIdentifier)

    // Create migration tracking table if it doesn't exist
    await this.client.unsafe(`
      CREATE TABLE IF NOT EXISTS ${schemaName}.__migrations__ (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        version VARCHAR(50) NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        checksum VARCHAR(64)
      )
    `)

    // Get list of executed migrations
    const executedMigrations = (await this.client.unsafe(`
      SELECT filename FROM ${schemaName}.__migrations__ 
      ORDER BY id
    `)) as { filename: string }[]

    const executedFilenames = new Set(executedMigrations.map((m) => m.filename))

    // Execute pending migrations in order
    for (const migrationFile of migrationFiles) {
      if (!executedFilenames.has(migrationFile.filename)) {
        await this.executeAppMigration(appIdentifier, migrationFile)
      }
    }
  }

  /**
   * Execute a single migration file for an app
   * Uses transaction-scoped search path to avoid affecting other queries
   */
  private async executeAppMigration(
    appIdentifier: string,
    migrationFile: { filename: string; content: string },
  ): Promise<void> {
    const schemaName = `app_${appIdentifier}`

    try {
      // Calculate checksum for migration integrity
      const checksum = this.calculateChecksum(migrationFile.content)

      // Use transaction to scope the search path change
      await this.client.begin(async (tx) => {
        // Set search path for this transaction only
        await tx.unsafe(`SET LOCAL search_path TO ${schemaName}`)

        // Execute the migration SQL
        await tx.unsafe(migrationFile.content)

        // Record the migration as executed
        await tx.unsafe(`
          INSERT INTO ${schemaName}.__migrations__ (filename, version, checksum) 
          VALUES ('${migrationFile.filename}', '${migrationFile.filename.split('_')[0]}', '${checksum}')
        `)
      })

      // eslint-disable-next-line no-console
      console.log(
        `Executed migration ${migrationFile.filename} for app ${appIdentifier}`,
      )
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(
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

    const schemaName = `app_${appIdentifier}`

    try {
      // Get executed migrations
      const executedMigrations = (await this.client.unsafe(`
        SELECT filename FROM ${schemaName}.__migrations__ 
        ORDER BY id
      `)) as { filename: string }[]

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
    await this.client.unsafe(`SET search_path TO public`)
  }

  async close() {
    await this._client?.end()
  }
}
