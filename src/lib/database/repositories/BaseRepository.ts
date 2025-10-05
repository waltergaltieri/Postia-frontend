import Database from 'better-sqlite3'
import { getDatabase } from '../connection'
import { QueryOptions } from '../types'

/**
 * Base repository class with common CRUD operations and prepared statements cache
 */
export abstract class BaseRepository<T, CreateData, UpdateData, Filters = {}> {
  protected db: Database.Database
  protected tableName: string
  private static statementCache = new Map<string, Database.Statement>()

  constructor(tableName: string) {
    this.db = getDatabase()
    this.tableName = tableName
  }

  /**
   * Get or create a prepared statement with caching
   */
  protected getStatement(key: string, sql: string): Database.Statement {
    const cacheKey = `${this.tableName}_${key}`

    if (!BaseRepository.statementCache.has(cacheKey)) {
      BaseRepository.statementCache.set(cacheKey, this.db.prepare(sql))
    }

    return BaseRepository.statementCache.get(cacheKey)!
  }

  /**
   * Generate a unique ID for new records
   */
  protected generateId(): string {
    return (
      this.db.prepare('SELECT lower(hex(randomblob(16))) as id').get() as {
        id: string
      }
    ).id
  }

  /**
   * Convert database row to entity object
   */
  protected abstract mapRowToEntity(row: any): T

  /**
   * Convert entity to database row for insert/update
   */
  protected abstract mapEntityToRow(data: CreateData | UpdateData): any

  /**
   * Build WHERE clause from filters
   */
  protected buildWhereClause(filters: Filters): {
    clause: string
    params: any[]
  } {
    const conditions: string[] = []
    const params: any[] = []

    if (filters && typeof filters === 'object') {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          conditions.push(`${key} = ?`)
          params.push(value)
        }
      })
    }

    return {
      clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      params,
    }
  }

  /**
   * Build ORDER BY clause from options
   */
  protected buildOrderClause(options?: QueryOptions): string {
    if (!options?.orderBy) {
      return 'ORDER BY created_at DESC'
    }

    const direction = options.orderDirection || 'ASC'
    return `ORDER BY ${options.orderBy} ${direction}`
  }

  /**
   * Build LIMIT/OFFSET clause from options
   */
  protected buildLimitClause(options?: QueryOptions): {
    clause: string
    params: any[]
  } {
    const params: any[] = []
    let clause = ''

    if (options?.limit) {
      clause += ' LIMIT ?'
      params.push(options.limit)

      if (options.offset) {
        clause += ' OFFSET ?'
        params.push(options.offset)
      }
    }

    return { clause, params }
  }

  /**
   * Find entity by ID
   */
  public findById(id: string): T | null {
    const stmt = this.getStatement(
      'findById',
      `SELECT * FROM ${this.tableName} WHERE id = ?`
    )
    const row = stmt.get(id)
    return row ? this.mapRowToEntity(row) : null
  }

  /**
   * Find all entities with optional filters and pagination
   */
  public findAll(filters?: Filters, options?: QueryOptions): T[] {
    const { clause: whereClause, params: whereParams } = this.buildWhereClause(
      filters || ({} as Filters)
    )
    const orderClause = this.buildOrderClause(options)
    const { clause: limitClause, params: limitParams } =
      this.buildLimitClause(options)

    const sql = `SELECT * FROM ${this.tableName} ${whereClause} ${orderClause}${limitClause}`
    const stmt = this.getStatement(
      `findAll_${JSON.stringify(filters)}_${JSON.stringify(options)}`,
      sql
    )

    const rows = stmt.all(...whereParams, ...limitParams)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Count entities with optional filters
   */
  public count(filters?: Filters): number {
    const { clause: whereClause, params } = this.buildWhereClause(
      filters || ({} as Filters)
    )
    const sql = `SELECT COUNT(*) as count FROM ${this.tableName} ${whereClause}`
    const stmt = this.getStatement(`count_${JSON.stringify(filters)}`, sql)

    const result = stmt.get(...params) as { count: number }
    return result.count
  }

  /**
   * Create new entity
   */
  public abstract create(data: CreateData): T

  /**
   * Update entity by ID
   */
  public abstract update(id: string, data: UpdateData): T | null

  /**
   * Delete entity by ID
   */
  public delete(id: string): boolean {
    const stmt = this.getStatement(
      'delete',
      `DELETE FROM ${this.tableName} WHERE id = ?`
    )
    const result = stmt.run(id)
    return result.changes > 0
  }

  /**
   * Check if entity exists by ID
   */
  public exists(id: string): boolean {
    const stmt = this.getStatement(
      'exists',
      `SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`
    )
    return !!stmt.get(id)
  }

  /**
   * Execute a transaction
   */
  protected transaction<R>(fn: () => R): R {
    const transactionFn = this.db.transaction(() => fn())
    return transactionFn()
  }

  /**
   * Clear statement cache (useful for testing)
   */
  public static clearStatementCache(): void {
    BaseRepository.statementCache.clear()
  }
}
