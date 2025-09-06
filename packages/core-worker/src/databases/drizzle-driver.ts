import type {
  BatchStep,
  ExecResult,
  QueryResult,
  WsDatabaseCore,
} from './types'
import { DatabaseTransactionError } from './types'

/**
 * Drizzle-compatible database driver for WebSocket-based database operations
 *
 * This class provides the interface that Drizzle ORM expects, translating
 * Drizzle's method calls into WebSocket database operations.
 */
export class DrizzleWsDriver {
  constructor(private readonly core: WsDatabaseCore) {}

  /**
   * Execute a query - Drizzle calls this for both SELECT and non-SELECT operations
   * We classify by SQL keyword and route to the appropriate core method
   */
  async query<T = unknown>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[] }> {
    // Classify the SQL statement by its starting keyword
    const trimmedSql = sql.trim()
    const isSelect = /^\s*select\b/i.test(trimmedSql)
    const isWith = /^\s*with\b/i.test(trimmedSql)

    if (isSelect || isWith) {
      // Use query for SELECT and WITH statements
      const result = await this.core.query<T>(sql, params)
      return { rows: result.rows }
    } else {
      // Use exec for INSERT, UPDATE, DELETE, CREATE, DROP, etc.
      await this.core.exec(sql, params)
      // Drizzle expects rows array even for non-SELECT operations
      // Return empty rows array as Drizzle typically ignores this for non-SELECT
      return { rows: [] as T[] }
    }
  }

  /**
   * Transaction support for Drizzle
   *
   * This creates a transaction-scoped client that records all operations
   * and executes them as a batch when the transaction completes.
   */
  async transaction<T>(fn: (tx: DrizzleWsDriver) => Promise<T>): Promise<T> {
    const steps: BatchStep[] = []
    let transactionResult: T
    let transactionError: Error | null = null

    // Create a transaction-scoped driver that records operations instead of executing them
    const txDriver = new DrizzleWsDriver({
      query: (sql: string, params?: unknown[]) => {
        const trimmedSql = sql.trim()
        const isSelect = /^\s*select\b/i.test(trimmedSql)
        const isWith = /^\s*with\b/i.test(trimmedSql)

        steps.push({
          sql,
          params: params || [],
          kind: isSelect || isWith ? 'query' : 'exec',
        })

        // Return empty result for transaction recording
        return Promise.resolve({ rows: [], fields: [] })
      },

      // eslint-disable-next-line @typescript-eslint/require-await
      exec: (sql: string, params?: unknown[]) => {
        steps.push({
          sql,
          params: params || [],
          kind: 'exec',
        })

        // Return empty result for transaction recording
        return Promise.resolve({ rowCount: 0 })
      },

      batch: (batchSteps: BatchStep[], _atomic?: boolean) => {
        // In a transaction, we can't execute nested batches
        // Instead, we add all steps to our transaction steps
        steps.push(...batchSteps)

        return Promise.resolve({ results: [] })
      },
    })

    try {
      // Execute the transaction function
      transactionResult = await fn(txDriver)
    } catch (error) {
      transactionError =
        error instanceof Error ? error : new Error(String(error))
      throw transactionError
    }

    // If we have steps to execute, run them as an atomic batch
    if (steps.length > 0) {
      try {
        await this.core.batch(steps, true) // atomic = true
      } catch (error) {
        throw new DatabaseTransactionError(
          `Transaction batch execution failed: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }

    return transactionResult
  }

  /**
   * Get the underlying WebSocket core client
   * Useful for direct access to batch operations or other advanced features
   */
  getCore(): WsDatabaseCore {
    return this.core
  }

  /**
   * Execute a batch of operations directly
   * This bypasses Drizzle's query method and goes straight to the core
   */
  async batch(steps: BatchStep[], atomic = false) {
    return this.core.batch(steps, atomic)
  }

  /**
   * Execute a raw query (always uses core.query regardless of SQL type)
   * Useful when you need to force a SELECT operation on non-SELECT SQL
   */
  async rawQuery<T = unknown>(
    sql: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    return this.core.query<T>(sql, params)
  }

  /**
   * Execute a raw exec (always uses core.exec regardless of SQL type)
   * Useful when you need to force an exec operation on SELECT SQL
   */
  async rawExec(sql: string, params?: unknown[]): Promise<ExecResult> {
    return this.core.exec(sql, params)
  }
}
