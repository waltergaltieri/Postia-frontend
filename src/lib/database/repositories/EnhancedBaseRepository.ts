import * as Database from 'better-sqlite3'
import { getDatabase } from '../connection'
import { QueryOptions } from '../types'
import {
  DatabaseErrorHandler,
  DatabaseLogger,
  RecoveryManager,
  ValidationError,
  RecordNotFoundError,
} from '../errors'
import { DatabaseValidations } from '../validations/DatabaseValidations'

/**
 * Enhanced base repository class with integrated error handling and validation
 */
export abstract class EnhancedBaseRepository<
  T,
  CreateData,
  UpdateData,
  Filters = {},
> {
  protected db: Database.Database
  protected tableName: string
  private static statementCache = new Map<string, Database.Statement>()
  protected logger = DatabaseLogger

  constructor(tableName: string) {
    this.db = getDatabase()
    this.tableName = tableName
  }

  /**
   * Get or create a prepared statement with caching and error handling
   */
  protected getStatement(key: string, sql: string): Database.Statement {
    return DatabaseErrorHandler.wrapSyncOperation(
      () => {
        const cacheKey = `${this.tableName}_${key}`

        if (!EnhancedBaseRepository.statementCache.has(cacheKey)) {
          EnhancedBaseRepository.statementCache.set(
            cacheKey,
            this.db.prepare(sql)
          )
        }

        return EnhancedBaseRepository.statementCache.get(cacheKey)!
      },
      { operation: 'prepare_statement', table: this.tableName, key }
    )
  }

  /**
   * Execute a query with error handling and logging
   */
  protected executeQuery<R = any>(
    statement: Database.Statement,
    params: any[] = [],
    operation: string
  ): R {
    const startTime = Date.now()

    return DatabaseErrorHandler.wrapSyncOperation(
      () => {
        const result = statement.get(...params) as R

        const duration = Date.now() - startTime
        this.logger.logQuery(statement.source, duration, {
          operation,
          table: this.tableName,
          params: params.length,
        })

        return result
      },
      { operation, table: this.tableName }
    )
  }

  /**
   * Execute a query that returns multiple rows
   */
  protected executeQueryAll<R = any>(
    statement: Database.Statement,
    params: any[] = [],
    operation: string
  ): R[] {
    const startTime = Date.now()

    return DatabaseErrorHandler.wrapSyncOperation(
      () => {
        const results = statement.all(...params) as R[]

        const duration = Date.now() - startTime
        this.logger.logQuery(statement.source, duration, {
          operation,
          table: this.tableName,
          params: params.length,
          resultCount: results.length,
        })

        return results
      },
      { operation, table: this.tableName }
    )
  }

  /**
   * Execute an insert/update/delete operation
   */
  protected executeRun(
    statement: Database.Statement,
    params: any[] = [],
    operation: string
  ): Database.RunResult {
    const startTime = Date.now()

    return DatabaseErrorHandler.wrapSyncOperation(
      () => {
        const result = statement.run(...params)

        const duration = Date.now() - startTime
        this.logger.logQuery(statement.source, duration, {
          operation,
          table: this.tableName,
          params: params.length,
          changes: result.changes,
        })

        DatabaseErrorHandler.logSuccess(operation, {
          table: this.tableName,
          changes: result.changes,
          lastInsertRowid: result.lastInsertRowid,
        })

        return result
      },
      { operation, table: this.tableName }
    )
  }

  /**
   * Execute operation with transaction and recovery
   */
  protected executeWithTransaction<R>(
    operation: () => R,
    operationName: string
  ): R {
    return DatabaseErrorHandler.wrapSyncOperation(
      () => {
        const transactionFn = this.db.transaction(() => operation())
        return transactionFn()
      },
      { operation: operationName, table: this.tableName }
    )
  }

  /**
   * Generate a unique ID for new records
   */
  protected generateId(): string {
    return DatabaseErrorHandler.wrapSyncOperation(
      () => {
        return (
          this.db.prepare('SELECT lower(hex(randomblob(16))) as id').get() as {
            id: string
          }
        ).id
      },
      { operation: 'generate_id', table: this.tableName }
    )
  }

  /**
   * Validate entity data before operations
   */
  protected validateCreateData(data: CreateData): void {
    const errors = this.getCreateValidationErrors(data)
    if (errors.length > 0) {
      throw new ValidationError(errors, {
        operation: 'create',
        table: this.tableName,
      })
    }
  }

  /**
   * Validate entity data before updates
   */
  protected validateUpdateData(data: UpdateData): void {
    const errors = this.getUpdateValidationErrors(data)
    if (errors.length > 0) {
      throw new ValidationError(errors, {
        operation: 'update',
        table: this.tableName,
      })
    }
  }

  /**
   * Check if record exists by ID
   */
  protected recordExists(id: string): boolean {
    return DatabaseErrorHandler.wrapSyncOperation(
      () => {
        const statement = this.getStatement(
          'exists',
          `SELECT 1 FROM ${this.tableName} WHERE id = ?`
        )
        const result = statement.get(id)
        return !!result
      },
      { operation: 'check_exists', table: this.tableName, id }
    )
  }

  /**
   * Ensure record exists or throw error
   */
  protected ensureRecordExists(id: string): void {
    if (!this.recordExists(id)) {
      throw new RecordNotFoundError(this.tableName, id)
    }
  }

  /**
   * Find record by ID with error handling
   */
  findById(id: string): T | null {
    this.logger.debug('Finding record by ID', { table: this.tableName, id })

    const statement = this.getStatement(
      'findById',
      `SELECT * FROM ${this.tableName} WHERE id = ?`
    )
    const row = this.executeQuery(statement, [id], 'findById')

    return row ? this.mapRowToEntity(row) : null
  }

  /**
   * Find record by ID or throw error if not found
   */
  findByIdOrThrow(id: string): T {
    const record = this.findById(id)
    if (!record) {
      throw new RecordNotFoundError(this.tableName, id)
    }
    return record
  }

  /**
   * Create a new record with validation and error handling
   */
  create(data: CreateData): T {
    this.logger.debug('Creating record', { table: this.tableName })

    return this.executeWithTransaction(() => {
      this.validateCreateData(data)

      const id = this.generateId()
      const rowData = { id, ...this.mapEntityToRow(data) }

      const columns = Object.keys(rowData).join(', ')
      const placeholders = Object.keys(rowData)
        .map(() => '?')
        .join(', ')
      const values = Object.values(rowData)

      const statement = this.getStatement(
        'create',
        `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`
      )

      this.executeRun(statement, values, 'create')

      return this.findByIdOrThrow(id)
    }, 'create')
  }

  /**
   * Update a record with validation and error handling
   */
  update(id: string, data: UpdateData): T {
    this.logger.debug('Updating record', { table: this.tableName, id })

    return this.executeWithTransaction(() => {
      this.ensureRecordExists(id)
      this.validateUpdateData(data)

      const rowData = this.mapEntityToRow(data)
      const updates = Object.keys(rowData)
        .filter(key => rowData[key] !== undefined)
        .map(key => `${key} = ?`)
        .join(', ')

      if (updates.length === 0) {
        return this.findByIdOrThrow(id)
      }

      const values = Object.keys(rowData)
        .filter(key => rowData[key] !== undefined)
        .map(key => rowData[key])

      values.push(id)

      const statement = this.getStatement(
        'update',
        `UPDATE ${this.tableName} SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
      )

      this.executeRun(statement, values, 'update')

      return this.findByIdOrThrow(id)
    }, 'update')
  }

  /**
   * Delete a record with validation and error handling
   */
  delete(id: string): boolean {
    this.logger.debug('Deleting record', { table: this.tableName, id })

    return this.executeWithTransaction(() => {
      this.ensureRecordExists(id)
      this.validateDeletion(id)

      const statement = this.getStatement(
        'delete',
        `DELETE FROM ${this.tableName} WHERE id = ?`
      )
      const result = this.executeRun(statement, [id], 'delete')

      return result.changes > 0
    }, 'delete')
  }

  // Abstract methods that must be implemented by subclasses
  protected abstract mapRowToEntity(row: any): T
  protected abstract mapEntityToRow(data: CreateData | UpdateData): any
  protected abstract getCreateValidationErrors(data: CreateData): string[]
  protected abstract getUpdateValidationErrors(data: UpdateData): string[]
  protected abstract validateDeletion(id: string): void
}
