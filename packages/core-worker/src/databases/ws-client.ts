import { AppAPIError } from '@lombokapp/app-worker-sdk'
import type { Socket } from 'socket.io-client'

import type {
  BatchResult,
  BatchStep,
  DatabaseField,
  ExecResult,
  QueryResult,
  WsDatabaseCore,
} from './types'
import { DatabaseConnectionError, DatabaseQueryError } from './types'

const SOCKET_RESPONSE_TIMEOUT = 10000 // 10 seconds for database operations

/**
 * Database socket message types - these need to be added to AppSocketMessage enum
 */
export const DatabaseSocketMessage = {
  DB_QUERY: 'DB_QUERY',
  DB_EXEC: 'DB_EXEC',
  DB_BATCH: 'DB_BATCH',
} as const

export type DatabaseSocketMessageType =
  (typeof DatabaseSocketMessage)[keyof typeof DatabaseSocketMessage]

/**
 * WebSocket-based database client implementation
 */
export class WsDatabaseClient implements WsDatabaseCore {
  constructor(
    private readonly socket: Socket,
    private readonly serverBaseUrl: string,
    private readonly appIdentifier?: string,
  ) {
    if (!socket.connected) {
      throw new DatabaseConnectionError('Socket is not connected')
    }
  }

  /**
   * Execute a SELECT query and return rows
   */
  async query<T = unknown>(
    sql: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    try {
      const response = (await this.emitWithAck(DatabaseSocketMessage.DB_QUERY, {
        sql,
        params: params || [],
      })) as { result: { rows: T[]; fields: DatabaseField[] } }

      return {
        rows: response.result.rows,
        fields: response.result.fields,
      }
    } catch (error) {
      if (error instanceof AppAPIError) {
        throw new DatabaseQueryError(
          `Query failed: ${error.message}`,
          sql,
          params,
        )
      }
      throw error
    }
  }

  /**
   * Execute a non-SELECT statement (INSERT, UPDATE, DELETE, etc.)
   */
  async exec(sql: string, params?: unknown[]): Promise<ExecResult> {
    try {
      const response = (await this.emitWithAck(DatabaseSocketMessage.DB_EXEC, {
        sql,
        params: params || [],
      })) as { result: { rowCount: number } }

      return {
        rowCount: response.result.rowCount,
      }
    } catch (error) {
      if (error instanceof AppAPIError) {
        throw new DatabaseQueryError(
          `Exec failed: ${error.message}`,
          sql,
          params,
        )
      }
      throw error
    }
  }

  /**
   * Execute multiple statements in a batch, optionally atomically
   */
  async batch(steps: BatchStep[], atomic = false): Promise<BatchResult> {
    try {
      const response = await this.emitWithAck(DatabaseSocketMessage.DB_BATCH, {
        steps,
        atomic,
      })

      return {
        results: (response.result as BatchResult).results,
      }
    } catch (error) {
      if (error instanceof AppAPIError) {
        throw new DatabaseQueryError(`Batch operation failed: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Internal method to emit socket messages with acknowledgment
   */
  private async emitWithAck(
    messageType: DatabaseSocketMessageType,
    data: unknown,
  ): Promise<{ result: unknown }> {
    if (!this.socket.connected) {
      throw new DatabaseConnectionError('Socket connection lost')
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const response = await this.socket
      .timeout(SOCKET_RESPONSE_TIMEOUT)
      .emitWithAck('APP_API', {
        name: messageType,
        data,
      })

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (response.error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
      throw new AppAPIError(response.error.code, response.error.message)
    }

    return response as { result: unknown }
  }

  /**
   * Check if the socket is still connected
   */
  isConnected(): boolean {
    return this.socket.connected
  }

  /**
   * Get the server base URL
   */
  getServerBaseUrl(): string {
    return this.serverBaseUrl
  }
}
