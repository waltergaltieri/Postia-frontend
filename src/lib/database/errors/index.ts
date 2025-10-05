// Export all error classes
export {
  DatabaseError,
  DatabaseConnectionError,
  DatabaseTransactionError,
  ForeignKeyConstraintError,
  UniqueConstraintError,
  RecordNotFoundError,
  ValidationError,
  AccessDeniedError,
  ResourceInUseError,
  BusinessRuleError,
  MigrationError,
  BackupError,
  DatabaseErrorCode,
  isDatabaseError,
  isErrorOfType,
} from './DatabaseErrors'

// Export error handler
export { DatabaseErrorHandler } from './ErrorHandler'

// Export logger
export { DatabaseLogger, LogLevel } from './DatabaseLogger'

// Export recovery manager
export {
  RecoveryManager,
  DatabaseLockRecoveryStrategy,
  ConnectionRecoveryStrategy,
  ForeignKeyRecoveryStrategy,
  UniqueConstraintRecoveryStrategy,
} from './RecoveryManager'

// Export types
export type { LogEntry } from './DatabaseLogger'
export type { RecoveryStrategy, RecoveryContext } from './RecoveryManager'
