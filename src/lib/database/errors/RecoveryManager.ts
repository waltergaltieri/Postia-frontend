import * as Database from 'better-sqlite3'
import { DatabaseLogger } from './DatabaseLogger'
import { DatabaseErrorHandler } from './ErrorHandler'
import { DatabaseTransactionError, BusinessRuleError } from './DatabaseErrors'

/**
 * Recovery strategy interface
 */
export interface RecoveryStrategy {
  name: string
  canRecover(error: Error, context: Record<string, any>): boolean
  recover(
    db: Database.Database,
    error: Error,
    context: Record<string, any>
  ): Promise<void> | void
}

/**
 * Recovery context for tracking recovery attempts
 */
export interface RecoveryContext {
  operation: string
  attempts: number
  maxAttempts: number
  lastError?: Error
  recoveryStrategies: string[]
  startTime: Date
}

/**
 * Automatic recovery manager for failed database operations
 */
export class RecoveryManager {
  private static strategies: RecoveryStrategy[] = []
  private static logger = DatabaseLogger

  /**
   * Register a recovery strategy
   */
  static registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy)
    this.logger.info('Recovery strategy registered', {
      strategy: strategy.name,
    })
  }

  /**
   * Execute operation with automatic recovery
   */
  static async executeWithRecovery<T>(
    db: Database.Database,
    operation: () => T | Promise<T>,
    context: RecoveryContext
  ): Promise<T> {
    const startTime = Date.now()

    for (let attempt = 1; attempt <= context.maxAttempts; attempt++) {
      try {
        this.logger.debug('Executing operation with recovery', {
          operation: context.operation,
          attempt,
          maxAttempts: context.maxAttempts,
        })

        const result = await operation()

        if (attempt > 1) {
          this.logger.info('Operation recovered successfully', {
            operation: context.operation,
            attempt,
            duration: Date.now() - startTime,
          })
        }

        return result
      } catch (error) {
        context.lastError = error as Error
        context.attempts = attempt

        this.logger.warn('Operation failed, attempting recovery', {
          operation: context.operation,
          attempt,
          error: (error as Error).message,
        })

        // Try recovery strategies if not the last attempt
        if (attempt < context.maxAttempts) {
          const recovered = await this.attemptRecovery(
            db,
            error as Error,
            context
          )

          if (recovered) {
            this.logger.info('Recovery successful, retrying operation', {
              operation: context.operation,
              attempt,
            })
            continue
          }
        }

        // If this is the last attempt or recovery failed, throw the error
        if (attempt === context.maxAttempts) {
          this.logger.error('Operation failed after all recovery attempts', {
            operation: context.operation,
            attempts: context.maxAttempts,
            duration: Date.now() - startTime,
            error: (error as Error).message,
          })

          throw DatabaseErrorHandler.handleSQLiteError(error, {
            operation: context.operation,
            attempts: context.maxAttempts,
            recoveryStrategies: context.recoveryStrategies,
          })
        }
      }
    }

    // This should never be reached
    throw new DatabaseTransactionError('Recovery manager failed unexpectedly')
  }

  /**
   * Attempt recovery using registered strategies
   */
  private static async attemptRecovery(
    db: Database.Database,
    error: Error,
    context: RecoveryContext
  ): Promise<boolean> {
    for (const strategy of this.strategies) {
      try {
        if (strategy.canRecover(error, context)) {
          this.logger.info('Attempting recovery strategy', {
            strategy: strategy.name,
            operation: context.operation,
            attempt: context.attempts,
          })

          await strategy.recover(db, error, context)
          context.recoveryStrategies.push(strategy.name)

          this.logger.info('Recovery strategy completed', {
            strategy: strategy.name,
            operation: context.operation,
          })

          return true
        }
      } catch (recoveryError) {
        this.logger.error('Recovery strategy failed', {
          strategy: strategy.name,
          operation: context.operation,
          error: (recoveryError as Error).message,
        })
        // Continue to next strategy
      }
    }

    return false
  }

  /**
   * Create a recovery context
   */
  static createContext(
    operation: string,
    maxAttempts: number = 3
  ): RecoveryContext {
    return {
      operation,
      attempts: 0,
      maxAttempts,
      recoveryStrategies: [],
      startTime: new Date(),
    }
  }
}

/**
 * Recovery strategy for database lock issues
 */
export class DatabaseLockRecoveryStrategy implements RecoveryStrategy {
  name = 'DatabaseLockRecovery'

  canRecover(error: Error): boolean {
    return (
      error.message.includes('SQLITE_BUSY') ||
      error.message.includes('SQLITE_LOCKED') ||
      error.message.includes('database is locked')
    )
  }

  recover(): void {
    // Wait a bit for locks to clear
    const delay = Math.random() * 100 + 50 // 50-150ms random delay
    const start = Date.now()
    while (Date.now() - start < delay) {
      // Busy wait
    }
  }
}

/**
 * Recovery strategy for connection issues
 */
export class ConnectionRecoveryStrategy implements RecoveryStrategy {
  name = 'ConnectionRecovery'

  canRecover(error: Error): boolean {
    return (
      error.message.includes('SQLITE_CANTOPEN') ||
      error.message.includes('SQLITE_NOTADB') ||
      error.message.includes('no such file or directory')
    )
  }

  recover(db: Database.Database): void {
    // Try to reinitialize the database connection
    try {
      // Check if database file exists and is accessible
      db.prepare('SELECT 1').get()
    } catch (checkError) {
      throw new BusinessRuleError(
        'Database file is corrupted or inaccessible',
        { originalError: checkError }
      )
    }
  }
}

/**
 * Recovery strategy for foreign key constraint violations
 */
export class ForeignKeyRecoveryStrategy implements RecoveryStrategy {
  name = 'ForeignKeyRecovery'

  canRecover(error: Error, context: Record<string, any>): boolean {
    return (
      error.message.includes('FOREIGN KEY constraint failed') &&
      context.operation?.includes('delete')
    )
  }

  recover(db: Database.Database, error: Error, context: RecoveryContext): void {
    // For delete operations, check if we can cascade delete related records
    if (context.operation.includes('delete')) {
      DatabaseLogger.warn(
        'Foreign key constraint violation on delete, checking cascade options',
        {
          operation: context.operation,
          error: error.message,
        }
      )

      // This is a placeholder - in a real implementation, you would
      // analyze the specific constraint and potentially offer cascade deletion
      throw new BusinessRuleError(
        'Cannot delete record due to foreign key constraints. Delete related records first.',
        { originalError: error.message }
      )
    }
  }
}

/**
 * Recovery strategy for unique constraint violations
 */
export class UniqueConstraintRecoveryStrategy implements RecoveryStrategy {
  name = 'UniqueConstraintRecovery'

  canRecover(error: Error, context: Record<string, any>): boolean {
    return (
      error.message.includes('UNIQUE constraint failed') &&
      context.operation?.includes('insert')
    )
  }

  recover(db: Database.Database, error: Error, context: RecoveryContext): void {
    // For insert operations with unique constraint violations,
    // suggest using update instead
    DatabaseLogger.warn('Unique constraint violation on insert', {
      operation: context.operation,
      error: error.message,
    })

    throw new BusinessRuleError(
      'Record with this unique value already exists. Consider updating the existing record instead.',
      { originalError: error.message, suggestion: 'use_update_instead' }
    )
  }
}

// Register default recovery strategies
RecoveryManager.registerStrategy(new DatabaseLockRecoveryStrategy())
RecoveryManager.registerStrategy(new ConnectionRecoveryStrategy())
RecoveryManager.registerStrategy(new ForeignKeyRecoveryStrategy())
RecoveryManager.registerStrategy(new UniqueConstraintRecoveryStrategy())
