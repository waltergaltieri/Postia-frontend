import * as Database from 'better-sqlite3'
import {
  DatabaseError,
  DatabaseConnectionError,
  DatabaseTransactionError,
  ForeignKeyConstraintError,
  UniqueConstraintError,
  RecordNotFoundError,
  ValidationError,
  BusinessRuleError,
  DatabaseErrorCode,
} from './DatabaseErrors'
import { DatabaseLogger } from './DatabaseLogger'

/**
 * Centralized error handler for database operations
 */
export class DatabaseErrorHandler {
  private static logger = DatabaseLogger

  /**
   * Handle and transform SQLite errors into appropriate DatabaseError types
   */
  static handleSQLiteError(
    error: any,
    context?: Record<string, any>
  ): DatabaseError {
    const logger = this.logger

    // Log the original error
    logger.error('SQLite error occurred', {
      error: error.message,
      code: error.code,
      context,
    })

    // Handle specific SQLite error codes
    if (error.code) {
      switch (error.code) {
        case 'SQLITE_CONSTRAINT_FOREIGNKEY':
          return this.handleForeignKeyError(error, context)

        case 'SQLITE_CONSTRAINT_UNIQUE':
          return this.handleUniqueConstraintError(error, context)

        case 'SQLITE_CANTOPEN':
        case 'SQLITE_NOTADB':
          return new DatabaseConnectionError('Cannot open database file', {
            originalError: error.message,
            ...context,
          })

        case 'SQLITE_BUSY':
          return new DatabaseTransactionError(
            'Database is busy, transaction failed',
            { originalError: error.message, ...context }
          )

        case 'SQLITE_LOCKED':
          return new DatabaseTransactionError(
            'Database is locked, transaction failed',
            { originalError: error.message, ...context }
          )

        default:
          logger.warn('Unhandled SQLite error code', {
            code: error.code,
            message: error.message,
          })
          return new DatabaseTransactionError(
            `Database operation failed: ${error.message}`,
            { originalError: error.message, code: error.code, ...context }
          )
      }
    }

    // Handle generic database errors
    return new DatabaseTransactionError(
      `Database operation failed: ${error.message}`,
      { originalError: error.message, ...context }
    )
  }

  /**
   * Handle foreign key constraint violations
   */
  private static handleForeignKeyError(
    error: any,
    context?: Record<string, any>
  ): ForeignKeyConstraintError {
    // Parse SQLite foreign key error message to extract table and column info
    const message = error.message || ''
    const match = message.match(/FOREIGN KEY constraint failed/i)

    if (match && context?.table && context?.column) {
      return new ForeignKeyConstraintError(
        context.table,
        context.column,
        context.value,
        { originalError: message, ...context }
      )
    }

    // Fallback if we can't parse the specific constraint
    return new ForeignKeyConstraintError('unknown', 'unknown', 'unknown', {
      originalError: message,
      ...context,
    })
  }

  /**
   * Handle unique constraint violations
   */
  private static handleUniqueConstraintError(
    error: any,
    context?: Record<string, any>
  ): UniqueConstraintError {
    // Parse SQLite unique constraint error message
    const message = error.message || ''
    const match = message.match(/UNIQUE constraint failed: (\w+)\.(\w+)/i)

    if (match) {
      const [, table, column] = match
      return new UniqueConstraintError(
        table,
        column,
        context?.value || 'unknown',
        { originalError: message, ...context }
      )
    }

    // Fallback if we can't parse the specific constraint
    return new UniqueConstraintError('unknown', 'unknown', 'unknown', {
      originalError: message,
      ...context,
    })
  }

  /**
   * Wrap database operations with error handling
   */
  static async wrapOperation<T>(
    operation: () => T | Promise<T>,
    context?: Record<string, any>
  ): Promise<T> {
    try {
      const result = await operation()
      return result
    } catch (error) {
      // If it's already a DatabaseError, just re-throw it
      if (error instanceof DatabaseError) {
        this.logger.error('Database operation failed', {
          errorType: error.constructor.name,
          code: error.code,
          message: error.message,
          context,
        })
        throw error
      }

      // Transform SQLite errors
      throw this.handleSQLiteError(error, context)
    }
  }

  /**
   * Wrap synchronous database operations with error handling
   */
  static wrapSyncOperation<T>(
    operation: () => T,
    context?: Record<string, any>
  ): T {
    try {
      return operation()
    } catch (error) {
      // If it's already a DatabaseError, just re-throw it
      if (error instanceof DatabaseError) {
        this.logger.error('Database operation failed', {
          errorType: error.constructor.name,
          code: error.code,
          message: error.message,
          context,
        })
        throw error
      }

      // Transform SQLite errors
      throw this.handleSQLiteError(error, context)
    }
  }

  /**
   * Handle transaction errors with automatic retry logic
   */
  static executeWithRetry<T>(
    db: Database.Database,
    operation: (db: Database.Database) => T,
    maxRetries: number = 3,
    context?: Record<string, any>
  ): T {
    let lastError: Error

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const transactionFn = db.transaction(() => operation(db))
        return transactionFn()
      } catch (error) {
        lastError = error as Error

        this.logger.warn('Transaction attempt failed', {
          attempt,
          maxRetries,
          error: error instanceof Error ? error.message : String(error),
          context,
        })

        // Only retry on specific transient errors
        if (this.isRetryableError(error) && attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          const delay = Math.pow(2, attempt - 1) * 100 // 100ms, 200ms, 400ms...
          this.sleep(delay)
          continue
        }

        // Transform and throw the error
        throw this.handleSQLiteError(error, { ...context, attempt, maxRetries })
      }
    }

    // This should never be reached, but TypeScript requires it
    throw this.handleSQLiteError(lastError!, { ...context, maxRetries })
  }

  /**
   * Check if an error is retryable (transient)
   */
  private static isRetryableError(error: any): boolean {
    if (!error.code) return false

    const retryableCodes = ['SQLITE_BUSY', 'SQLITE_LOCKED', 'SQLITE_PROTOCOL']

    return retryableCodes.includes(error.code)
  }

  /**
   * Sleep for the specified number of milliseconds
   */
  private static sleep(ms: number): void {
    const start = Date.now()
    while (Date.now() - start < ms) {
      // Busy wait (not ideal but works for short delays)
    }
  }

  /**
   * Validate operation context and throw appropriate errors
   */
  static validateContext(
    context: Record<string, any>,
    requiredFields: string[]
  ): void {
    const missing = requiredFields.filter(
      field => !(field in context) || context[field] == null
    )

    if (missing.length > 0) {
      throw new ValidationError(
        [`Missing required context fields: ${missing.join(', ')}`],
        context
      )
    }
  }

  /**
   * Create a standardized error response for API endpoints
   */
  static createErrorResponse(error: DatabaseError): {
    success: false
    error: {
      code: string
      message: string
      details?: Record<string, any>
      timestamp: string
    }
  } {
    return {
      success: false,
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        timestamp: error.timestamp.toISOString(),
      },
    }
  }

  /**
   * Log successful operations for audit trail
   */
  static logSuccess(operation: string, context?: Record<string, any>): void {
    this.logger.info('Database operation successful', {
      operation,
      ...context,
    })
  }
}
