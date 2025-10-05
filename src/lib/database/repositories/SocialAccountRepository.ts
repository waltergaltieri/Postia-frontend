import { BaseRepository } from './BaseRepository'
import {
  SocialAccount,
  CreateSocialAccountData,
  UpdateSocialAccountData,
  SocialAccountFilters,
  SocialNetwork,
  QueryOptions,
} from '../types'

/**
 * Repository for managing social media accounts with token validation and secure credential updates
 */
export class SocialAccountRepository extends BaseRepository<
  SocialAccount,
  CreateSocialAccountData,
  UpdateSocialAccountData,
  SocialAccountFilters
> {
  constructor() {
    super('social_accounts')
  }

  /**
   * Convert database row to SocialAccount entity
   */
  protected mapRowToEntity(row: any): SocialAccount {
    return {
      id: row.id,
      workspaceId: row.workspace_id,
      platform: row.platform,
      accountId: row.account_id,
      accountName: row.account_name,
      isConnected: Boolean(row.is_connected),
      connectedAt: row.connected_at ? new Date(row.connected_at) : undefined,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      tokenExpiresAt: row.token_expires_at
        ? new Date(row.token_expires_at)
        : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }
  }

  /**
   * Convert SocialAccount entity to database row
   */
  protected mapEntityToRow(
    data: CreateSocialAccountData | UpdateSocialAccountData
  ): any {
    const row: any = {}

    if ('workspaceId' in data) row.workspace_id = data.workspaceId
    if ('platform' in data) row.platform = data.platform
    if ('accountId' in data) row.account_id = data.accountId
    if ('accountName' in data) row.account_name = data.accountName
    if ('isConnected' in data) row.is_connected = data.isConnected
    if ('connectedAt' in data)
      row.connected_at = data.connectedAt?.toISOString()
    if ('accessToken' in data) row.access_token = data.accessToken
    if ('refreshToken' in data) row.refresh_token = data.refreshToken
    if ('tokenExpiresAt' in data)
      row.token_expires_at = data.tokenExpiresAt?.toISOString()

    return row
  }

  /**
   * Create new social account
   */
  public create(data: CreateSocialAccountData): SocialAccount {
    const id = this.generateId()
    const now = new Date().toISOString()

    const row = this.mapEntityToRow(data)

    const stmt = this.getStatement(
      'create',
      `
      INSERT INTO social_accounts (
        id, workspace_id, platform, account_id, account_name,
        is_connected, connected_at, access_token, refresh_token,
        token_expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )

    stmt.run(
      id,
      row.workspace_id,
      row.platform,
      row.account_id,
      row.account_name,
      row.is_connected || false,
      row.connected_at || null,
      row.access_token || null,
      row.refresh_token || null,
      row.token_expires_at || null,
      now,
      now
    )

    return this.findById(id)!
  }

  /**
   * Update social account by ID
   */
  public update(
    id: string,
    data: UpdateSocialAccountData
  ): SocialAccount | null {
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
      UPDATE social_accounts SET ${updates.join(', ')} WHERE id = ?
    `
    )

    stmt.run(...params)
    return this.findById(id)
  }

  /**
   * Find social accounts by workspace ID
   */
  public findByWorkspaceId(
    workspaceId: string,
    options?: QueryOptions
  ): SocialAccount[] {
    const orderClause = this.buildOrderClause(options)
    const { clause: limitClause, params: limitParams } =
      this.buildLimitClause(options)

    const stmt = this.getStatement(
      `findByWorkspaceId_${JSON.stringify(options)}`,
      `
      SELECT * FROM social_accounts WHERE workspace_id = ? ${orderClause}${limitClause}
    `
    )

    const rows = stmt.all(workspaceId, ...limitParams)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Find social accounts by platform
   */
  public findByPlatform(
    workspaceId: string,
    platform: SocialNetwork,
    options?: QueryOptions
  ): SocialAccount[] {
    const orderClause = this.buildOrderClause(options)
    const { clause: limitClause, params: limitParams } =
      this.buildLimitClause(options)

    const stmt = this.getStatement(
      `findByPlatform_${platform}_${JSON.stringify(options)}`,
      `
      SELECT * FROM social_accounts 
      WHERE workspace_id = ? AND platform = ?
      ${orderClause}${limitClause}
    `
    )

    const rows = stmt.all(workspaceId, platform, ...limitParams)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Find connected social accounts
   */
  public findConnectedAccounts(
    workspaceId: string,
    options?: QueryOptions
  ): SocialAccount[] {
    const orderClause = this.buildOrderClause(options)
    const { clause: limitClause, params: limitParams } =
      this.buildLimitClause(options)

    const stmt = this.getStatement(
      `findConnectedAccounts_${JSON.stringify(options)}`,
      `
      SELECT * FROM social_accounts 
      WHERE workspace_id = ? AND is_connected = 1
      ${orderClause}${limitClause}
    `
    )

    const rows = stmt.all(workspaceId, ...limitParams)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Find social account by workspace, platform and account ID
   */
  public findByWorkspacePlatformAndAccountId(
    workspaceId: string,
    platform: SocialNetwork,
    accountId: string
  ): SocialAccount | null {
    const stmt = this.getStatement(
      'findByWorkspacePlatformAndAccountId',
      `
      SELECT * FROM social_accounts 
      WHERE workspace_id = ? AND platform = ? AND account_id = ?
    `
    )

    const row = stmt.get(workspaceId, platform, accountId)
    return row ? this.mapRowToEntity(row) : null
  }

  /**
   * Connect social account with tokens
   */
  public connect(
    id: string,
    accessToken: string,
    refreshToken?: string,
    expiresAt?: Date
  ): SocialAccount | null {
    if (!this.exists(id)) {
      return null
    }

    const now = new Date().toISOString()

    const stmt = this.getStatement(
      'connect',
      `
      UPDATE social_accounts 
      SET is_connected = 1, connected_at = ?, access_token = ?, 
          refresh_token = ?, token_expires_at = ?, updated_at = ?
      WHERE id = ?
    `
    )

    stmt.run(
      now,
      accessToken,
      refreshToken || null,
      expiresAt?.toISOString() || null,
      now,
      id
    )

    return this.findById(id)
  }

  /**
   * Disconnect social account
   */
  public disconnect(id: string): SocialAccount | null {
    if (!this.exists(id)) {
      return null
    }

    const stmt = this.getStatement(
      'disconnect',
      `
      UPDATE social_accounts 
      SET is_connected = 0, connected_at = NULL, access_token = NULL, 
          refresh_token = NULL, token_expires_at = NULL, updated_at = ?
      WHERE id = ?
    `
    )

    stmt.run(new Date().toISOString(), id)
    return this.findById(id)
  }

  /**
   * Update access token
   */
  public updateAccessToken(
    id: string,
    accessToken: string,
    expiresAt?: Date
  ): SocialAccount | null {
    if (!this.exists(id)) {
      return null
    }

    const stmt = this.getStatement(
      'updateAccessToken',
      `
      UPDATE social_accounts 
      SET access_token = ?, token_expires_at = ?, updated_at = ?
      WHERE id = ?
    `
    )

    stmt.run(
      accessToken,
      expiresAt?.toISOString() || null,
      new Date().toISOString(),
      id
    )

    return this.findById(id)
  }

  /**
   * Update refresh token
   */
  public updateRefreshToken(
    id: string,
    refreshToken: string
  ): SocialAccount | null {
    if (!this.exists(id)) {
      return null
    }

    const stmt = this.getStatement(
      'updateRefreshToken',
      `
      UPDATE social_accounts 
      SET refresh_token = ?, updated_at = ?
      WHERE id = ?
    `
    )

    stmt.run(refreshToken, new Date().toISOString(), id)
    return this.findById(id)
  }

  /**
   * Check if account is connected and token is valid
   */
  public isValidConnection(id: string): boolean {
    const stmt = this.getStatement(
      'isValidConnection',
      `
      SELECT is_connected, token_expires_at FROM social_accounts WHERE id = ?
    `
    )

    const result = stmt.get(id) as {
      is_connected: number
      token_expires_at: string | null
    }

    if (!result || !result.is_connected) {
      return false
    }

    // Check if token is expired
    if (result.token_expires_at) {
      const expiresAt = new Date(result.token_expires_at)
      const now = new Date()
      return expiresAt > now
    }

    return true
  }

  /**
   * Find accounts with expiring tokens
   */
  public findExpiringTokens(beforeDate?: Date): SocialAccount[] {
    const cutoffDate = beforeDate || new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now

    const stmt = this.getStatement(
      'findExpiringTokens',
      `
      SELECT * FROM social_accounts 
      WHERE is_connected = 1 
      AND token_expires_at IS NOT NULL 
      AND token_expires_at <= ?
      ORDER BY token_expires_at ASC
    `
    )

    const rows = stmt.all(cutoffDate.toISOString())
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Get connection statistics for workspace
   */
  public getConnectionStats(workspaceId: string): {
    totalAccounts: number
    connectedAccounts: number
    disconnectedAccounts: number
    expiringTokens: number
    byPlatform: Record<SocialNetwork, { total: number; connected: number }>
  } {
    const stmt = this.getStatement(
      'getConnectionStats',
      `
      SELECT 
        COUNT(*) as total_accounts,
        COUNT(CASE WHEN is_connected = 1 THEN 1 END) as connected_accounts,
        COUNT(CASE WHEN is_connected = 0 THEN 1 END) as disconnected_accounts,
        COUNT(CASE WHEN is_connected = 1 AND token_expires_at IS NOT NULL AND token_expires_at <= datetime('now', '+24 hours') THEN 1 END) as expiring_tokens,
        COUNT(CASE WHEN platform = 'facebook' THEN 1 END) as facebook_total,
        COUNT(CASE WHEN platform = 'facebook' AND is_connected = 1 THEN 1 END) as facebook_connected,
        COUNT(CASE WHEN platform = 'instagram' THEN 1 END) as instagram_total,
        COUNT(CASE WHEN platform = 'instagram' AND is_connected = 1 THEN 1 END) as instagram_connected,
        COUNT(CASE WHEN platform = 'twitter' THEN 1 END) as twitter_total,
        COUNT(CASE WHEN platform = 'twitter' AND is_connected = 1 THEN 1 END) as twitter_connected,
        COUNT(CASE WHEN platform = 'linkedin' THEN 1 END) as linkedin_total,
        COUNT(CASE WHEN platform = 'linkedin' AND is_connected = 1 THEN 1 END) as linkedin_connected
      FROM social_accounts 
      WHERE workspace_id = ?
    `
    )

    const result = stmt.get(workspaceId) as any

    return {
      totalAccounts: result.total_accounts || 0,
      connectedAccounts: result.connected_accounts || 0,
      disconnectedAccounts: result.disconnected_accounts || 0,
      expiringTokens: result.expiring_tokens || 0,
      byPlatform: {
        facebook: {
          total: result.facebook_total || 0,
          connected: result.facebook_connected || 0,
        },
        instagram: {
          total: result.instagram_total || 0,
          connected: result.instagram_connected || 0,
        },
        twitter: {
          total: result.twitter_total || 0,
          connected: result.twitter_connected || 0,
        },
        linkedin: {
          total: result.linkedin_total || 0,
          connected: result.linkedin_connected || 0,
        },
      },
    }
  }

  /**
   * Check if platform account already exists in workspace
   */
  public accountExists(
    workspaceId: string,
    platform: SocialNetwork,
    accountId: string,
    excludeId?: string
  ): boolean {
    let stmt
    let params: any[]

    if (excludeId) {
      stmt = this.getStatement(
        'accountExistsExclude',
        `
        SELECT 1 FROM social_accounts 
        WHERE workspace_id = ? AND platform = ? AND account_id = ? AND id != ?
        LIMIT 1
      `
      )
      params = [workspaceId, platform, accountId, excludeId]
    } else {
      stmt = this.getStatement(
        'accountExists',
        `
        SELECT 1 FROM social_accounts 
        WHERE workspace_id = ? AND platform = ? AND account_id = ?
        LIMIT 1
      `
      )
      params = [workspaceId, platform, accountId]
    }

    return !!stmt.get(...params)
  }

  /**
   * Update account name
   */
  public updateAccountName(
    id: string,
    accountName: string
  ): SocialAccount | null {
    if (!this.exists(id)) {
      return null
    }

    const stmt = this.getStatement(
      'updateAccountName',
      `
      UPDATE social_accounts 
      SET account_name = ?, updated_at = ?
      WHERE id = ?
    `
    )

    stmt.run(accountName, new Date().toISOString(), id)
    return this.findById(id)
  }

  /**
   * Get accounts for specific platforms
   */
  public findByPlatforms(
    workspaceId: string,
    platforms: SocialNetwork[]
  ): SocialAccount[] {
    if (platforms.length === 0) {
      return []
    }

    const placeholders = platforms.map(() => '?').join(',')
    const stmt = this.getStatement(
      `findByPlatforms_${platforms.join('_')}`,
      `
      SELECT * FROM social_accounts 
      WHERE workspace_id = ? AND platform IN (${placeholders})
      ORDER BY platform, account_name
    `
    )

    const rows = stmt.all(workspaceId, ...platforms)
    return rows.map(row => this.mapRowToEntity(row))
  }

  /**
   * Bulk disconnect accounts
   */
  public bulkDisconnect(
    workspaceId: string,
    platforms?: SocialNetwork[]
  ): number {
    return this.transaction(() => {
      let stmt
      let params: any[]

      if (platforms && platforms.length > 0) {
        const placeholders = platforms.map(() => '?').join(',')
        stmt = this.getStatement(
          `bulkDisconnectPlatforms_${platforms.join('_')}`,
          `
          UPDATE social_accounts 
          SET is_connected = 0, connected_at = NULL, access_token = NULL, 
              refresh_token = NULL, token_expires_at = NULL, updated_at = ?
          WHERE workspace_id = ? AND platform IN (${placeholders})
        `
        )
        params = [new Date().toISOString(), workspaceId, ...platforms]
      } else {
        stmt = this.getStatement(
          'bulkDisconnectAll',
          `
          UPDATE social_accounts 
          SET is_connected = 0, connected_at = NULL, access_token = NULL, 
              refresh_token = NULL, token_expires_at = NULL, updated_at = ?
          WHERE workspace_id = ?
        `
        )
        params = [new Date().toISOString(), workspaceId]
      }

      const result = stmt.run(...params)
      return result.changes
    })
  }

  /**
   * Delete social account with validation
   */
  public delete(id: string): boolean {
    if (!this.exists(id)) {
      return false
    }

    // No special validation needed for social accounts
    const stmt = this.getStatement(
      'delete',
      'DELETE FROM social_accounts WHERE id = ?'
    )
    const result = stmt.run(id)

    return result.changes > 0
  }

  /**
   * Count social accounts by workspace
   */
  public countByWorkspace(workspaceId: string): number {
    const stmt = this.getStatement(
      'countByWorkspace',
      `
      SELECT COUNT(*) as count FROM social_accounts WHERE workspace_id = ?
    `
    )

    const result = stmt.get(workspaceId) as { count: number }
    return result.count
  }

  /**
   * Get social accounts without sensitive data (for public APIs)
   */
  public findPublicByWorkspaceId(
    workspaceId: string
  ): Array<Omit<SocialAccount, 'accessToken' | 'refreshToken'>> {
    const stmt = this.getStatement(
      'findPublicByWorkspaceId',
      `
      SELECT 
        id, workspace_id, platform, account_id, account_name,
        is_connected, connected_at, token_expires_at, created_at, updated_at
      FROM social_accounts 
      WHERE workspace_id = ?
      ORDER BY platform, account_name
    `
    )

    const rows = stmt.all(workspaceId)
    return rows.map((row: any) => ({
      id: row.id,
      workspaceId: row.workspace_id,
      platform: row.platform,
      accountId: row.account_id,
      accountName: row.account_name,
      isConnected: Boolean(row.is_connected),
      connectedAt: row.connected_at ? new Date(row.connected_at) : undefined,
      tokenExpiresAt: row.token_expires_at
        ? new Date(row.token_expires_at)
        : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }))
  }
}
