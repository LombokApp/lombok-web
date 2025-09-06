/**
 * Database types and interfaces for WebSocket-based database operations
 */

export interface DatabaseField {
  name: string
  dataType?: string
}

export interface QueryResult<T = unknown> {
  rows: T[]
  fields?: DatabaseField[]
}

export interface ExecResult {
  rowCount: number
}

export interface BatchStep {
  sql: string
  params?: unknown[]
  kind: 'query' | 'exec'
}

export interface BatchResult {
  results: (QueryResult | ExecResult)[]
}

/**
 * Core WebSocket database interface that apps will use
 */
export interface WsDatabaseCore {
  /**
   * Execute a SELECT query and return rows
   */
  query: <T = unknown>(
    sql: string,
    params?: unknown[],
  ) => Promise<QueryResult<T>>

  /**
   * Execute a non-SELECT statement (INSERT, UPDATE, DELETE, etc.)
   */
  exec: (sql: string, params?: unknown[]) => Promise<ExecResult>

  /**
   * Execute multiple statements in a batch, optionally atomically
   */
  batch: (steps: BatchStep[], atomic?: boolean) => Promise<BatchResult>
}

/**
 * Error types for database operations
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly sql?: string,
    public readonly params?: unknown[],
  ) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class DatabaseConnectionError extends DatabaseError {
  constructor(message: string) {
    super(message, 'CONNECTION_ERROR')
    this.name = 'DatabaseConnectionError'
  }
}

export class DatabaseQueryError extends DatabaseError {
  constructor(message: string, sql?: string, params?: unknown[]) {
    super(message, 'QUERY_ERROR', sql, params)
    this.name = 'DatabaseQueryError'
  }
}

export class DatabaseTransactionError extends DatabaseError {
  constructor(message: string) {
    super(message, 'TRANSACTION_ERROR')
    this.name = 'DatabaseTransactionError'
  }
}
