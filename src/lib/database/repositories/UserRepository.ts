import { BaseRepository } from './BaseRepository'
import { User, CreateUserData, UpdateUserData, UserFilters } from '../types'

/**
 * Repository for managing users with authentication and access control
 */
export class UserRepository extends BaseRepository<
  User,
  CreateUserData,
  UpdateUserData,
  UserFilters
> {
  constructor() {
    super('users')
  }

  /**
   * Convert database row to User entity
   */
  protected mapRowToEntity(row: any): User {
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      agencyId: row.agency_id,
      role: row.role,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  /**
   * Convert User entity to database row
   */
  protected mapEntityToRow(data: CreateUserData | UpdateUserData): any {
    const row: any = {}

    if ('email' in data) row.email = data.email
    if ('passwordHash' in data) row.password_hash = data.passwordHash
    if ('agencyId' in data) row.agency_id = data.agencyId
    if ('role' in data) row.role = data.role

    return row
  }

  /**
   * Create new user
   */
  public create(data: CreateUserData): User {
    const id = this.generateId()
    const now = new Date().toISOString()

    const row = this.mapEntityToRow(data)

    const stmt = this.getStatement(
      'create',
      `
      INSERT INTO users (
        id, email, password_hash, agency_id, role, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `
    )

    stmt.run(
      id,
      row.email,
      row.password_hash,
      row.agency_id,
      row.role || 'member',
      now,
      now
    )

    return this.findById(id)!
  }

  /**
   * Update user by ID
   */
  public update(id: string, data: UpdateUserData): User | null {
    if (!this.exists(id)) {
      return null
    }

    const row = this.mapEntityToRow(data)
    const updates: string[] = []
    const params: any[] = []

    Object.entries(row).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`)
        params.push(value)
      }
    })

    if (updates.length === 0) {
      return this.findById(id)
    }

    updates.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(id)

    const stmt = this.getStatement(
      `update_${updates.join('_')}`,
      `
      UPDATE users SET ${updates.join(', ')} WHERE id = ?
    `
    )

    stmt.run(...params)
    return this.findById(id)
  }

  /**
   * Find user by email
   */
  public findByEmail(email: string): User | null {
    const stmt = this.getStatement(
      'findByEmail',
      'SELECT * FROM users WHERE email = ?'
    )
    const row = stmt.get(email)
    return row ? this.mapRowToEntity(row) : null
  }

  /**
   * Find users by agency ID
   */
  public findByAgencyId(agencyId: string): User[] {
    const stmt = this.getStatement(
      'findByAgencyId',
      `
      SELECT * FROM users WHERE agency_id = ? ORDER BY created_at DESC
    `
    )
    const rows = stmt.all(agencyId)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Find users by agency ID and role
   */
  public findByAgencyAndRole(
    agencyId: string,
    role: 'admin' | 'member'
  ): User[] {
    const stmt = this.getStatement(
      'findByAgencyAndRole',
      `
      SELECT * FROM users WHERE agency_id = ? AND role = ? ORDER BY created_at DESC
    `
    )
    const rows = stmt.all(agencyId, role)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Get agency admins
   */
  public getAgencyAdmins(agencyId: string): User[] {
    return this.findByAgencyAndRole(agencyId, 'admin')
  }

  /**
   * Get agency members
   */
  public getAgencyMembers(agencyId: string): User[] {
    return this.findByAgencyAndRole(agencyId, 'member')
  }

  /**
   * Update user password
   */
  public updatePassword(id: string, passwordHash: string): User | null {
    if (!this.exists(id)) {
      return null
    }

    const stmt = this.getStatement(
      'updatePassword',
      `
      UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?
    `
    )

    stmt.run(passwordHash, new Date().toISOString(), id)
    return this.findById(id)
  }

  /**
   * Update user role
   */
  public updateRole(id: string, role: 'admin' | 'member'): User | null {
    if (!this.exists(id)) {
      return null
    }

    const stmt = this.getStatement(
      'updateRole',
      `
      UPDATE users SET role = ?, updated_at = ? WHERE id = ?
    `
    )

    stmt.run(role, new Date().toISOString(), id)
    return this.findById(id)
  }

  /**
   * Check if user has access to agency
   */
  public hasAgencyAccess(userId: string, agencyId: string): boolean {
    const stmt = this.getStatement(
      'hasAgencyAccess',
      `
      SELECT 1 FROM users WHERE id = ? AND agency_id = ? LIMIT 1
    `
    )

    return !!stmt.get(userId, agencyId)
  }

  /**
   * Check if user is agency admin
   */
  public isAgencyAdmin(userId: string, agencyId: string): boolean {
    const stmt = this.getStatement(
      'isAgencyAdmin',
      `
      SELECT 1 FROM users WHERE id = ? AND agency_id = ? AND role = 'admin' LIMIT 1
    `
    )

    return !!stmt.get(userId, agencyId)
  }

  /**
   * Check if user has workspace access (through agency)
   */
  public hasWorkspaceAccess(userId: string, workspaceId: string): boolean {
    const stmt = this.getStatement(
      'hasWorkspaceAccess',
      `
      SELECT 1 FROM users u
      JOIN workspaces w ON u.agency_id = w.agency_id
      WHERE u.id = ? AND w.id = ?
      LIMIT 1
    `
    )

    return !!stmt.get(userId, workspaceId)
  }

  /**
   * Get user with agency information
   */
  public findByIdWithAgency(
    id: string
  ): (User & { agency: { name: string; plan: string } }) | null {
    const stmt = this.getStatement(
      'findByIdWithAgency',
      `
      SELECT 
        u.*,
        a.name as agency_name,
        a.plan as agency_plan
      FROM users u
      JOIN agencies a ON u.agency_id = a.id
      WHERE u.id = ?
    `
    )

    const row = stmt.get(id) as any
    if (!row) return null

    const user = this.mapRowToEntity(row)
    return {
      ...user,
      agency: {
        name: row.agency_name,
        plan: row.agency_plan,
      },
    }
  }

  /**
   * Validate user credentials
   */
  public validateCredentials(email: string, passwordHash: string): User | null {
    const stmt = this.getStatement(
      'validateCredentials',
      `
      SELECT * FROM users WHERE email = ? AND password_hash = ?
    `
    )

    const row = stmt.get(email, passwordHash)
    return row ? this.mapRowToEntity(row) : null
  }

  /**
   * Count users by agency
   */
  public countByAgency(agencyId: string): {
    total: number
    admins: number
    members: number
  } {
    const stmt = this.getStatement(
      'countByAgency',
      `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
        COUNT(CASE WHEN role = 'member' THEN 1 END) as members
      FROM users 
      WHERE agency_id = ?
    `
    )

    const result = stmt.get(agencyId) as any

    return {
      total: result.total || 0,
      admins: result.admins || 0,
      members: result.members || 0,
    }
  }

  /**
   * Check if email is already taken
   */
  public isEmailTaken(email: string, excludeUserId?: string): boolean {
    let stmt
    let params: any[]

    if (excludeUserId) {
      stmt = this.getStatement(
        'isEmailTakenExclude',
        `
        SELECT 1 FROM users WHERE email = ? AND id != ? LIMIT 1
      `
      )
      params = [email, excludeUserId]
    } else {
      stmt = this.getStatement(
        'isEmailTaken',
        `
        SELECT 1 FROM users WHERE email = ? LIMIT 1
      `
      )
      params = [email]
    }

    return !!stmt.get(...params)
  }

  /**
   * Delete user with validation
   */
  public delete(id: string): boolean {
    if (!this.exists(id)) {
      return false
    }

    return this.transaction(() => {
      // Check if user is the last admin of their agency
      const user = this.findById(id)
      if (!user) return false

      if (user.role === 'admin') {
        const adminCount = this.countByAgency(user.agencyId).admins
        if (adminCount <= 1) {
          throw new Error('Cannot delete the last admin of an agency')
        }
      }

      // Delete user
      const stmt = this.getStatement('delete', 'DELETE FROM users WHERE id = ?')
      const result = stmt.run(id)

      return result.changes > 0
    })
  }
}
