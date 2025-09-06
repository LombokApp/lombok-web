/**
 * Database layer for WebSocket-based database operations
 *
 * This module provides a complete database client that works over WebSocket
 * connections, compatible with Drizzle ORM and providing both low-level
 * and high-level database operations.
 */

// Core types and interfaces
export type {
  WsDatabaseCore,
  QueryResult,
  ExecResult,
  BatchStep,
  BatchResult,
  DatabaseField,
} from './types'

export {
  DatabaseError,
  DatabaseConnectionError,
  DatabaseQueryError,
  DatabaseTransactionError,
} from './types'

// WebSocket client implementation
export { WsDatabaseClient, DatabaseSocketMessage } from './ws-client'

// Drizzle-compatible driver
export { DrizzleWsDriver } from './drizzle-driver'

// Factory functions and utilities
export {
  createDatabaseClient,
  createDatabaseClientFromAppClient,
  testDatabaseConnection,
  getDatabaseInfo,
  safeQuery,
  safeExec,
} from './utils'

// Re-export commonly used types for convenience
export type { Socket } from 'socket.io-client'
