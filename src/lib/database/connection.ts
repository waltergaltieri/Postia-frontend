import Database from 'better-sqlite3'
import path from 'path'

// Database configuration interface
export interface DatabaseConfig {
  path: string
  verbose?: boolean
  readonly?: boolean
  fileMustExist?: boolean
}

// Default database configuration
const defaultConfig: DatabaseConfig = {
  path:
    process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'postia.db'),
  verbose: process.env.NODE_ENV === 'development',
  readonly: false,
  fileMustExist: false,
}

// Global database instance
let db: Database.Database | null = null

/**
 * Initialize database connection with configuration
 */
export function initializeDatabase(
  config: Partial<DatabaseConfig> = {}
): Database.Database {
  const finalConfig = { ...defaultConfig, ...config }

  // Ensure data directory exists
  const dataDir = path.dirname(finalConfig.path)
  const fs = require('fs')
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }

  // Create database connection
  db = new Database(finalConfig.path, {
    verbose: finalConfig.verbose ? console.log : undefined,
    readonly: finalConfig.readonly,
    fileMustExist: finalConfig.fileMustExist,
  })

  // Enable foreign key constraints
  db.pragma('foreign_keys = ON')

  // Set journal mode to WAL for better performance
  db.pragma('journal_mode = WAL')

  // Set synchronous mode to NORMAL for better performance
  db.pragma('synchronous = NORMAL')

  return db
}

/**
 * Get the current database instance
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error(
      'Database not initialized. Call initializeDatabase() first.'
    )
  }
  return db
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

/**
 * Execute a transaction with automatic rollback on error
 */
export function transaction<T>(fn: (db: Database.Database) => T): T {
  const database = getDatabase()
  const transactionFn = database.transaction(() => fn(database))
  return transactionFn()
}
