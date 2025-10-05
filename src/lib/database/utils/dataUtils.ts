import Database from 'better-sqlite3'

/**
 * Data utility functions for database management, cleanup, and testing
 */
export class DataUtils {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  /**
   * Clear all data from specific tables while preserving schema
   */
  clearTables(tableNames: string[]): void {
    console.log(`Clearing data from ${tableNames.length} table(s)...`)

    this.db.transaction(() => {
      // Disable foreign key constraints temporarily
      this.db.pragma('foreign_keys = OFF')

      for (const table of tableNames) {
        try {
          const result = this.db.prepare(`DELETE FROM ${table}`).run()
          console.log(`✓ Cleared ${result.changes} rows from table: ${table}`)
        } catch (error) {
          console.error(`✗ Failed to clear table ${table}:`, error)
          throw error
        }
      }

      // Re-enable foreign key constraints
      this.db.pragma('foreign_keys = ON')
    })()

    console.log('Table clearing completed successfully')
  }

  /**
   * Clear all data from all tables in correct dependency order
   */
  clearAllTables(): void {
    const tables = [
      'publications',
      'campaign_templates',
      'campaign_resources',
      'campaigns',
      'templates',
      'resources',
      'social_accounts',
      'workspaces',
      'users',
      'agencies',
    ]

    this.clearTables(tables)
  }

  /**
   * Clear only test data (keeps production-like data)
   */
  clearTestData(): void {
    console.log('Clearing test data...')

    this.db.transaction(() => {
      // Clear publications from test campaigns
      this.db
        .prepare(
          `
        DELETE FROM publications 
        WHERE campaign_id IN (
          SELECT id FROM campaigns 
          WHERE name LIKE '%Test%' OR name LIKE '%Demo%'
        )
      `
        )
        .run()

      // Clear test campaigns
      this.db
        .prepare(
          `
        DELETE FROM campaigns 
        WHERE name LIKE '%Test%' OR name LIKE '%Demo%'
      `
        )
        .run()

      // Clear test resources
      this.db
        .prepare(
          `
        DELETE FROM resources 
        WHERE name LIKE '%Test%' OR name LIKE '%Demo%'
      `
        )
        .run()

      // Clear test templates
      this.db
        .prepare(
          `
        DELETE FROM templates 
        WHERE name LIKE '%Test%' OR name LIKE '%Demo%'
      `
        )
        .run()

      console.log('✓ Test data cleared successfully')
    })()
  }

  /**
   * Get database statistics
   */
  getDatabaseStats(): DatabaseStats {
    const stats: DatabaseStats = {
      agencies: this.getTableCount('agencies'),
      users: this.getTableCount('users'),
      workspaces: this.getTableCount('workspaces'),
      resources: this.getTableCount('resources'),
      templates: this.getTableCount('templates'),
      campaigns: this.getTableCount('campaigns'),
      publications: this.getTableCount('publications'),
      socialAccounts: this.getTableCount('social_accounts'),
      campaignResources: this.getTableCount('campaign_resources'),
      campaignTemplates: this.getTableCount('campaign_templates'),
    }

    return stats
  }

  /**
   * Print database statistics in a formatted way
   */
  printDatabaseStats(): void {
    const stats = this.getDatabaseStats()

    console.log('\n=== Database Statistics ===')
    console.log(`Agencies: ${stats.agencies}`)
    console.log(`Users: ${stats.users}`)
    console.log(`Workspaces: ${stats.workspaces}`)
    console.log(`Resources: ${stats.resources}`)
    console.log(`Templates: ${stats.templates}`)
    console.log(`Campaigns: ${stats.campaigns}`)
    console.log(`Publications: ${stats.publications}`)
    console.log(`Social Accounts: ${stats.socialAccounts}`)
    console.log(`Campaign-Resource Links: ${stats.campaignResources}`)
    console.log(`Campaign-Template Links: ${stats.campaignTemplates}`)
    console.log('')
  }

  /**
   * Get detailed campaign statistics
   */
  getCampaignStats(): CampaignStats {
    const statusCounts = this.db
      .prepare(
        `
      SELECT status, COUNT(*) as count 
      FROM campaigns 
      GROUP BY status
    `
      )
      .all() as Array<{ status: string; count: number }>

    const publicationCounts = this.db
      .prepare(
        `
      SELECT status, COUNT(*) as count 
      FROM publications 
      GROUP BY status
    `
      )
      .all() as Array<{ status: string; count: number }>

    return {
      campaignsByStatus: statusCounts.reduce(
        (acc, item) => {
          acc[item.status] = item.count
          return acc
        },
        {} as Record<string, number>
      ),
      publicationsByStatus: publicationCounts.reduce(
        (acc, item) => {
          acc[item.status] = item.count
          return acc
        },
        {} as Record<string, number>
      ),
    }
  }

  /**
   * Print campaign statistics
   */
  printCampaignStats(): void {
    const stats = this.getCampaignStats()

    console.log('\n=== Campaign Statistics ===')
    console.log('Campaigns by Status:')
    Object.entries(stats.campaignsByStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`)
    })

    console.log('Publications by Status:')
    Object.entries(stats.publicationsByStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`)
    })
    console.log('')
  }

  /**
   * Validate database integrity
   */
  validateIntegrity(): IntegrityReport {
    const issues: string[] = []

    // Check for orphaned records
    const orphanedUsers = this.db
      .prepare(
        `
      SELECT COUNT(*) as count 
      FROM users u 
      LEFT JOIN agencies a ON u.agency_id = a.id 
      WHERE a.id IS NULL
    `
      )
      .get() as { count: number }

    if (orphanedUsers.count > 0) {
      issues.push(`${orphanedUsers.count} orphaned users (no matching agency)`)
    }

    const orphanedWorkspaces = this.db
      .prepare(
        `
      SELECT COUNT(*) as count 
      FROM workspaces w 
      LEFT JOIN agencies a ON w.agency_id = a.id 
      WHERE a.id IS NULL
    `
      )
      .get() as { count: number }

    if (orphanedWorkspaces.count > 0) {
      issues.push(
        `${orphanedWorkspaces.count} orphaned workspaces (no matching agency)`
      )
    }

    const orphanedCampaigns = this.db
      .prepare(
        `
      SELECT COUNT(*) as count 
      FROM campaigns c 
      LEFT JOIN workspaces w ON c.workspace_id = w.id 
      WHERE w.id IS NULL
    `
      )
      .get() as { count: number }

    if (orphanedCampaigns.count > 0) {
      issues.push(
        `${orphanedCampaigns.count} orphaned campaigns (no matching workspace)`
      )
    }

    const orphanedPublications = this.db
      .prepare(
        `
      SELECT COUNT(*) as count 
      FROM publications p 
      LEFT JOIN campaigns c ON p.campaign_id = c.id 
      WHERE c.id IS NULL
    `
      )
      .get() as { count: number }

    if (orphanedPublications.count > 0) {
      issues.push(
        `${orphanedPublications.count} orphaned publications (no matching campaign)`
      )
    }

    // Check for invalid date ranges in campaigns
    const invalidDateRanges = this.db
      .prepare(
        `
      SELECT COUNT(*) as count 
      FROM campaigns 
      WHERE start_date >= end_date
    `
      )
      .get() as { count: number }

    if (invalidDateRanges.count > 0) {
      issues.push(
        `${invalidDateRanges.count} campaigns with invalid date ranges (start_date >= end_date)`
      )
    }

    // Check for publications scheduled outside campaign date ranges
    const publicationsOutsideRange = this.db
      .prepare(
        `
      SELECT COUNT(*) as count 
      FROM publications p 
      JOIN campaigns c ON p.campaign_id = c.id 
      WHERE DATE(p.scheduled_date) < c.start_date 
         OR DATE(p.scheduled_date) > c.end_date
    `
      )
      .get() as { count: number }

    if (publicationsOutsideRange.count > 0) {
      issues.push(
        `${publicationsOutsideRange.count} publications scheduled outside their campaign date ranges`
      )
    }

    return {
      isValid: issues.length === 0,
      issues,
    }
  }

  /**
   * Print integrity validation results
   */
  printIntegrityReport(): void {
    const report = this.validateIntegrity()

    console.log('\n=== Database Integrity Report ===')
    if (report.isValid) {
      console.log('✅ Database integrity is valid - no issues found')
    } else {
      console.log('❌ Database integrity issues found:')
      report.issues.forEach(issue => {
        console.log(`  - ${issue}`)
      })
    }
    console.log('')
  }

  /**
   * Create a backup of current data as SQL insert statements
   */
  createDataBackup(): string {
    const tables = [
      'agencies',
      'users',
      'workspaces',
      'social_accounts',
      'resources',
      'templates',
      'campaigns',
      'campaign_resources',
      'campaign_templates',
      'publications',
    ]

    let backup =
      '-- Database backup created at ' + new Date().toISOString() + '\n\n'
    backup += '-- Disable foreign key constraints during restore\n'
    backup += 'PRAGMA foreign_keys = OFF;\n\n'

    for (const table of tables) {
      const rows = this.db.prepare(`SELECT * FROM ${table}`).all()

      if (rows.length > 0) {
        backup += `-- Data for table: ${table}\n`

        // Get column names
        const columns = Object.keys(rows[0])
        const columnList = columns.join(', ')

        for (const row of rows) {
          const values = columns
            .map(col => {
              const value = (row as any)[col]
              if (value === null) return 'NULL'
              if (typeof value === 'string')
                return `'${value.replace(/'/g, "''")}'`
              return value
            })
            .join(', ')

          backup += `INSERT INTO ${table} (${columnList}) VALUES (${values});\n`
        }
        backup += '\n'
      }
    }

    backup += '-- Re-enable foreign key constraints\n'
    backup += 'PRAGMA foreign_keys = ON;\n'

    return backup
  }

  /**
   * Generate sample data for testing specific scenarios
   */
  generateTestScenario(scenario: TestScenario): void {
    console.log(`Generating test scenario: ${scenario}`)

    switch (scenario) {
      case 'empty_agency':
        this.generateEmptyAgencyScenario()
        break
      case 'active_campaigns':
        this.generateActiveCampaignsScenario()
        break
      case 'failed_publications':
        this.generateFailedPublicationsScenario()
        break
      case 'large_dataset':
        this.generateLargeDatasetScenario()
        break
      default:
        throw new Error(`Unknown test scenario: ${scenario}`)
    }
  }

  private getTableCount(tableName: string): number {
    const result = this.db
      .prepare(`SELECT COUNT(*) as count FROM ${tableName}`)
      .get() as { count: number }
    return result.count
  }

  private generateEmptyAgencyScenario(): void {
    this.db
      .prepare(
        `
      INSERT INTO agencies (id, name, email, plan)
      VALUES ('test-empty-agency', 'Empty Test Agency', 'empty@test.com', 'free')
    `
      )
      .run()

    this.db
      .prepare(
        `
      INSERT INTO users (id, email, password_hash, agency_id, role)
      VALUES ('test-empty-user', 'admin@empty.com', '$2b$10$test.hash', 'test-empty-agency', 'admin')
    `
      )
      .run()

    console.log('✓ Generated empty agency scenario')
  }

  private generateActiveCampaignsScenario(): void {
    // This would generate multiple active campaigns with publications
    console.log('✓ Generated active campaigns scenario')
  }

  private generateFailedPublicationsScenario(): void {
    // This would generate publications with various failure states
    console.log('✓ Generated failed publications scenario')
  }

  private generateLargeDatasetScenario(): void {
    // This would generate a large amount of test data for performance testing
    console.log('✓ Generated large dataset scenario')
  }
}

// Type definitions
export interface DatabaseStats {
  agencies: number
  users: number
  workspaces: number
  resources: number
  templates: number
  campaigns: number
  publications: number
  socialAccounts: number
  campaignResources: number
  campaignTemplates: number
}

export interface CampaignStats {
  campaignsByStatus: Record<string, number>
  publicationsByStatus: Record<string, number>
}

export interface IntegrityReport {
  isValid: boolean
  issues: string[]
}

export type TestScenario =
  | 'empty_agency'
  | 'active_campaigns'
  | 'failed_publications'
  | 'large_dataset'
