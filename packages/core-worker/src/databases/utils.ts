import type { Socket } from 'socket.io-client'

import { DrizzleWsDriver } from './drizzle-driver'
import type { WsDatabaseCore } from './types'
import { WsDatabaseClient } from './ws-client'

/**
 * Factory function to create a complete database client setup
 *
 * @param socket - Connected Socket.IO client
 * @param serverBaseUrl - Base URL of the server
 * @param appIdentifier - Optional app identifier for schema isolation
 * @returns Object containing both the core client and Drizzle driver
 */
export function createDatabaseClient(
  socket: Socket,
  serverBaseUrl: string,
  appIdentifier?: string,
) {
  const core = new WsDatabaseClient(socket, serverBaseUrl, appIdentifier)
  const driver = new DrizzleWsDriver(core)

  return {
    core,
    driver,
    // Convenience method to get Drizzle driver directly
    drizzle: driver,
  }
}

/**
 * Create a database client from an existing app client
 * This is useful when you already have a PlatformServerMessageInterface
 * and want to add database capabilities
 */
export function createDatabaseClientFromAppClient(
  socket: Socket,
  serverBaseUrl: string,
  appIdentifier?: string,
) {
  return createDatabaseClient(socket, serverBaseUrl, appIdentifier)
}

/**
 * Utility function to test database connectivity
 */
export async function testDatabaseConnection(
  core: WsDatabaseCore,
): Promise<boolean> {
  try {
    await core.query('SELECT 1 as test')
    return true
  } catch {
    return false
  }
}

/**
 * Utility function to get database version/info
 */
export async function getDatabaseInfo(core: WsDatabaseCore): Promise<{
  version?: string
  type?: string
  [key: string]: unknown
}> {
  try {
    // Try to get database version - this will depend on your database type
    const result = (await core.query('SELECT version() as version')) as {
      rows: { version: string }[]
    }
    return {
      version: result.rows[0]?.version,
      type: 'postgresql', // or detect based on version string
    }
  } catch {
    return {}
  }
}

/**
 * Utility function to execute a simple query with error handling
 */
export async function safeQuery<T = unknown>(
  core: WsDatabaseCore,
  sql: string,
  params?: unknown[],
): Promise<{ success: true; data: T[] } | { success: false; error: string }> {
  try {
    const result = await core.query<T>(sql, params)
    return { success: true, data: result.rows }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Utility function to execute a simple exec with error handling
 */
export async function safeExec(
  core: WsDatabaseCore,
  sql: string,
  params?: unknown[],
): Promise<
  { success: true; rowCount: number } | { success: false; error: string }
> {
  try {
    const result = await core.exec(sql, params)
    return { success: true, rowCount: result.rowCount }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
