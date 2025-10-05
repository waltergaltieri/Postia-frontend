/**
 * Base class for all database-related errors
 */
export abstract class DatabaseError extends Error {
  public readonly code: string
  public readonly details?: Record<string, any>
  public readonly timestamp: Date

  constructor(message: string, code: string, details?: Record<string, any>) {
    super(message)
    this.name = this.constructor.name
    this.code = code
    this.details = details
    this.timestamp = new Date()

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, new.target.prototype)
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      details: this.details,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
    }
  }
}

/**
 * Error thrown when a database connection fails
 */
export class DatabaseConnectionError extends DatabaseError {
  constructor(
    message: string = 'Failed to connect to database',
    details?: Record<string, any>
  ) {
    super(message, 'DB_CONNECTION_ERROR', details)
  }
}

/**
 * Error thrown when a database transaction fails
 */
export class DatabaseTransactionError extends DatabaseError {
  constructor(
    message: string = 'Database transaction failed',
    details?: Record<string, any>
  ) {
    super(message, 'DB_TRANSACTION_ERROR', details)
  }
}

/**
 * Error thrown when a foreign key constraint is violated
 */
export class ForeignKeyConstraintError extends DatabaseError {
  constructor(
    table: string,
    column: string,
    value: any,
    details?: Record<string, any>
  ) {
    const message = `Foreign key constraint violation: ${table}.${column} = ${value}`
    super(message, 'DB_FOREIGN_KEY_ERROR', { table, column, value, ...details })
  }
}

/**
 * Error thrown when a unique constraint is violated
 */
export class UniqueConstraintError extends DatabaseError {
  constructor(
    table: string,
    column: string,
    value: any,
    details?: Record<string, any>
  ) {
    const message = `Unique constraint violation: ${table}.${column} = ${value}`
    super(message, 'DB_UNIQUE_CONSTRAINT_ERROR', {
      table,
      column,
      value,
      ...details,
    })
  }
}

/**
 * Error thrown when a record is not found
 */
export class RecordNotFoundError extends DatabaseError {
  constructor(
    table: string,
    identifier: string | Record<string, any>,
    details?: Record<string, any>
  ) {
    const idStr =
      typeof identifier === 'string' ? identifier : JSON.stringify(identifier)
    const message = `Record not found in ${table}: ${idStr}`
    super(message, 'DB_RECORD_NOT_FOUND', { table, identifier, ...details })
  }
}

/**
 * Error thrown when validation fails
 */
export class ValidationError extends DatabaseError {
  public readonly validationErrors: string[]

  constructor(validationErrors: string[], details?: Record<string, any>) {
    const message = `Validation failed: ${validationErrors.join(', ')}`
    super(message, 'DB_VALIDATION_ERROR', details)
    this.validationErrors = validationErrors
  }
}

/**
 * Error thrown when access is denied due to permissions
 */
export class AccessDeniedError extends DatabaseError {
  constructor(
    resource: string,
    action: string,
    userId?: string,
    details?: Record<string, any>
  ) {
    const message = `Access denied: Cannot ${action} ${resource}${userId ? ` for user ${userId}` : ''}`
    super(message, 'DB_ACCESS_DENIED', { resource, action, userId, ...details })
  }
}

/**
 * Error thrown when a resource is in use and cannot be deleted
 */
export class ResourceInUseError extends DatabaseError {
  public readonly usage: string[]

  constructor(
    resource: string,
    resourceId: string,
    usage: string[],
    details?: Record<string, any>
  ) {
    const message = `Cannot delete ${resource} ${resourceId}: resource is in use`
    super(message, 'DB_RESOURCE_IN_USE', {
      resource,
      resourceId,
      usage,
      ...details,
    })
    this.usage = usage
  }
}

/**
 * Error thrown when business rules are violated
 */
export class BusinessRuleError extends DatabaseError {
  constructor(rule: string, details?: Record<string, any>) {
    const message = `Business rule violation: ${rule}`
    super(message, 'DB_BUSINESS_RULE_ERROR', { rule, ...details })
  }
}

/**
 * Error thrown when database schema migration fails
 */
export class MigrationError extends DatabaseError {
  constructor(
    version: number,
    direction: 'up' | 'down',
    originalError: Error,
    details?: Record<string, any>
  ) {
    const message = `Migration ${direction} failed for version ${version}: ${originalError.message}`
    super(message, 'DB_MIGRATION_ERROR', {
      version,
      direction,
      originalError: originalError.message,
      ...details,
    })
  }
}

/**
 * Error thrown when database backup/restore operations fail
 */
export class BackupError extends DatabaseError {
  constructor(
    operation: 'backup' | 'restore',
    path: string,
    originalError: Error,
    details?: Record<string, any>
  ) {
    const message = `Database ${operation} failed for ${path}: ${originalError.message}`
    super(message, 'DB_BACKUP_ERROR', {
      operation,
      path,
      originalError: originalError.message,
      ...details,
    })
  }
}

/**
 * Error codes enum for easy reference
 */
export enum DatabaseErrorCode {
  CONNECTION_ERROR = 'DB_CONNECTION_ERROR',
  TRANSACTION_ERROR = 'DB_TRANSACTION_ERROR',
  FOREIGN_KEY_ERROR = 'DB_FOREIGN_KEY_ERROR',
  UNIQUE_CONSTRAINT_ERROR = 'DB_UNIQUE_CONSTRAINT_ERROR',
  RECORD_NOT_FOUND = 'DB_RECORD_NOT_FOUND',
  VALIDATION_ERROR = 'DB_VALIDATION_ERROR',
  ACCESS_DENIED = 'DB_ACCESS_DENIED',
  RESOURCE_IN_USE = 'DB_RESOURCE_IN_USE',
  BUSINESS_RULE_ERROR = 'DB_BUSINESS_RULE_ERROR',
  MIGRATION_ERROR = 'DB_MIGRATION_ERROR',
  BACKUP_ERROR = 'DB_BACKUP_ERROR',
}

/**
 * Type guard to check if an error is a DatabaseError
 */
export function isDatabaseError(error: any): error is DatabaseError {
  return error instanceof DatabaseError
}

/**
 * Type guard to check if an error is a specific type of DatabaseError
 */
export function isErrorOfType<T extends DatabaseError>(
  error: any,
  errorClass: new (...args: any[]) => T
): error is T {
  return error instanceof errorClass
}
