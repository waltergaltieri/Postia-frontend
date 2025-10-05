import type { Database } from 'better-sqlite3'

export interface PerformanceMetrics {
  slowQueries: QueryMetric[]
  indexUsage: IndexMetric[]
  tableStats: TableStats[]
}

export interface QueryMetric {
  query: string
  executionTime: number
  frequency: number
}

export interface IndexMetric {
  tableName: string
  indexName: string
  isUsed: boolean
  scanCount: number
}

export interface TableStats {
  tableName: string
  rowCount: number
  sizeBytes: number
  avgRowSize: number
}

export interface IntegrityIssue {
  type: 'foreign_key' | 'constraint' | 'orphaned_record' | 'data_inconsistency'
  table: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  suggestion?: string
}

export class DatabaseAnalyzer {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

  async analyzePerformance(): Promise<void> {
    console.log('🔍 Analyzing database performance...\n')

    // Enable query statistics
    this.db.exec('PRAGMA compile_options')

    // Analyze query plans for common operations
    const commonQueries = [
      {
        name: 'Campaign listing by workspace',
        query:
          'EXPLAIN QUERY PLAN SELECT * FROM campaigns WHERE workspace_id = ? ORDER BY created_at DESC',
      },
      {
        name: 'Publication calendar view',
        query:
          'EXPLAIN QUERY PLAN SELECT * FROM publications WHERE scheduled_date BETWEEN ? AND ? ORDER BY scheduled_date',
      },
      {
        name: 'Resource search',
        query:
          'EXPLAIN QUERY PLAN SELECT * FROM resources WHERE workspace_id = ? AND name LIKE ?',
      },
      {
        name: 'Dashboard metrics',
        query:
          'EXPLAIN QUERY PLAN SELECT COUNT(*) FROM campaigns c JOIN workspaces w ON c.workspace_id = w.id WHERE w.agency_id = ?',
      },
    ]

    for (const queryInfo of commonQueries) {
      console.log(`📊 ${queryInfo.name}:`)
      try {
        const plan = this.db
          .prepare(queryInfo.query)
          .all('test-id', 'test-param')
        plan.forEach((step: any) => {
          console.log(`  ${step.detail}`)
        })
        console.log('')
      } catch (error) {
        console.log(`  ❌ Error analyzing query: ${error}`)
        console.log('')
      }
    }

    // Check for missing indexes
    await this.suggestIndexes()
  }

  async analyzeIndexUsage(): Promise<void> {
    console.log('📊 Index Usage Analysis:\n')

    try {
      // Get all indexes
      const indexes = this.db
        .prepare(
          `
        SELECT name, tbl_name, sql 
        FROM sqlite_master 
        WHERE type = 'index' AND name NOT LIKE 'sqlite_%'
        ORDER BY tbl_name, name
      `
        )
        .all()

      if (indexes.length === 0) {
        console.log('  No custom indexes found')
        return
      }

      console.log('📋 Existing Indexes:')
      let currentTable = ''

      for (const index of indexes) {
        if (index.tbl_name !== currentTable) {
          currentTable = index.tbl_name
          console.log(`\n  Table: ${currentTable}`)
        }
        console.log(`    • ${index.name}`)
        if (index.sql) {
          console.log(`      ${index.sql}`)
        }
      }

      console.log('\n🔍 Index Recommendations:')
      await this.suggestIndexes()
    } catch (error) {
      console.error('❌ Error analyzing indexes:', error)
    }
  }

  async checkDataIntegrity(): Promise<void> {
    console.log('🔍 Data Integrity Check:\n')

    const issues: IntegrityIssue[] = []

    try {
      // SQLite built-in integrity check
      console.log('1. SQLite Integrity Check:')
      const integrityResult = this.db.prepare('PRAGMA integrity_check').get()
      if (integrityResult.integrity_check === 'ok') {
        console.log('  ✅ Database structure is intact')
      } else {
        console.log('  ❌ Database integrity issues found:')
        console.log(`     ${integrityResult.integrity_check}`)
        issues.push({
          type: 'constraint',
          table: 'database',
          description: integrityResult.integrity_check,
          severity: 'critical',
        })
      }

      // Foreign key constraint check
      console.log('\n2. Foreign Key Constraints:')
      this.db.exec('PRAGMA foreign_keys = ON')
      const fkResult = this.db.prepare('PRAGMA foreign_key_check').all()

      if (fkResult.length === 0) {
        console.log('  ✅ All foreign key constraints are valid')
      } else {
        console.log('  ❌ Foreign key violations found:')
        fkResult.forEach((violation: any) => {
          console.log(
            `     Table: ${violation.table}, Row: ${violation.rowid}, Parent: ${violation.parent}`
          )
          issues.push({
            type: 'foreign_key',
            table: violation.table,
            description: `Foreign key violation in row ${violation.rowid}`,
            severity: 'high',
            suggestion: 'Check referenced records exist',
          })
        })
      }

      // Business logic integrity checks
      console.log('\n3. Business Logic Integrity:')
      await this.checkBusinessLogicIntegrity(issues)

      // Orphaned records check
      console.log('\n4. Orphaned Records Check:')
      await this.checkOrphanedRecords(issues)

      // Summary
      console.log('\n📊 Integrity Summary:')
      if (issues.length === 0) {
        console.log('  ✅ No integrity issues found')
      } else {
        const critical = issues.filter(i => i.severity === 'critical').length
        const high = issues.filter(i => i.severity === 'high').length
        const medium = issues.filter(i => i.severity === 'medium').length
        const low = issues.filter(i => i.severity === 'low').length

        console.log(`  ❌ Found ${issues.length} issues:`)
        if (critical > 0) console.log(`     🔴 Critical: ${critical}`)
        if (high > 0) console.log(`     🟠 High: ${high}`)
        if (medium > 0) console.log(`     🟡 Medium: ${medium}`)
        if (low > 0) console.log(`     🟢 Low: ${low}`)

        console.log('\n📋 Detailed Issues:')
        issues.forEach((issue, index) => {
          const severity = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢',
          }[issue.severity]

          console.log(
            `  ${index + 1}. ${severity} ${issue.table}: ${issue.description}`
          )
          if (issue.suggestion) {
            console.log(`     💡 Suggestion: ${issue.suggestion}`)
          }
        })
      }
    } catch (error) {
      console.error('❌ Error during integrity check:', error)
    }
  }

  async analyzeDatabaseSize(): Promise<void> {
    console.log('📊 Database Size Analysis:\n')

    try {
      // Overall database size
      const dbStats = this.db.prepare('PRAGMA page_count').get()
      const pageSize = this.db.prepare('PRAGMA page_size').get()
      const totalSize = dbStats.page_count * pageSize.page_size

      console.log('📈 Overall Statistics:')
      console.log(`  Database size: ${this.formatBytes(totalSize)}`)
      console.log(`  Page count: ${dbStats.page_count.toLocaleString()}`)
      console.log(`  Page size: ${pageSize.page_size} bytes`)

      // Table sizes
      console.log('\n📋 Table Sizes:')
      const tables = this.db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
      `
        )
        .all()

      const tableStats: TableStats[] = []

      for (const table of tables) {
        try {
          const rowCount = this.db
            .prepare(`SELECT COUNT(*) as count FROM ${table.name}`)
            .get()

          // Estimate table size (this is approximate)
          const sampleRows = this.db
            .prepare(`SELECT * FROM ${table.name} LIMIT 100`)
            .all()
          let avgRowSize = 0

          if (sampleRows.length > 0) {
            const totalSampleSize = sampleRows.reduce((sum, row) => {
              return sum + JSON.stringify(row).length
            }, 0)
            avgRowSize = totalSampleSize / sampleRows.length
          }

          const estimatedSize = rowCount.count * avgRowSize

          tableStats.push({
            tableName: table.name,
            rowCount: rowCount.count,
            sizeBytes: estimatedSize,
            avgRowSize,
          })

          console.log(`  ${table.name}:`)
          console.log(`    Rows: ${rowCount.count.toLocaleString()}`)
          console.log(`    Estimated size: ${this.formatBytes(estimatedSize)}`)
          console.log(`    Avg row size: ${Math.round(avgRowSize)} bytes`)
        } catch (error) {
          console.log(`  ${table.name}: Error analyzing (${error})`)
        }
      }

      // Show largest tables
      console.log('\n🏆 Largest Tables:')
      tableStats
        .sort((a, b) => b.sizeBytes - a.sizeBytes)
        .slice(0, 5)
        .forEach((table, index) => {
          console.log(
            `  ${index + 1}. ${table.tableName}: ${this.formatBytes(table.sizeBytes)} (${table.rowCount.toLocaleString()} rows)`
          )
        })
    } catch (error) {
      console.error('❌ Error analyzing database size:', error)
    }
  }

  async runCompleteAnalysis(): Promise<void> {
    console.log('🔍 Running Complete Database Analysis')
    console.log('=====================================\n')

    await this.analyzeDatabaseSize()
    console.log('\n' + '='.repeat(50) + '\n')

    await this.analyzeIndexUsage()
    console.log('\n' + '='.repeat(50) + '\n')

    await this.analyzePerformance()
    console.log('\n' + '='.repeat(50) + '\n')

    await this.checkDataIntegrity()
    console.log('\n✅ Complete analysis finished')
  }

  private async suggestIndexes(): Promise<void> {
    console.log('💡 Index Suggestions:')

    const suggestions = [
      {
        table: 'publications',
        columns: ['campaign_id', 'status'],
        reason: 'Frequently filtered by campaign and status',
      },
      {
        table: 'publications',
        columns: ['scheduled_date', 'social_network'],
        reason: 'Calendar views filter by date and network',
      },
      {
        table: 'resources',
        columns: ['workspace_id', 'type', 'created_at'],
        reason: 'Resource listing with type filter and sorting',
      },
      {
        table: 'campaigns',
        columns: ['workspace_id', 'status', 'start_date'],
        reason: 'Dashboard queries filter by workspace, status, and date',
      },
    ]

    for (const suggestion of suggestions) {
      const indexName = `idx_${suggestion.table}_${suggestion.columns.join('_')}`

      // Check if index already exists
      const existingIndex = this.db
        .prepare(
          `
        SELECT name FROM sqlite_master 
        WHERE type = 'index' AND name = ?
      `
        )
        .get(indexName)

      if (!existingIndex) {
        console.log(
          `  📌 CREATE INDEX ${indexName} ON ${suggestion.table}(${suggestion.columns.join(', ')});`
        )
        console.log(`     Reason: ${suggestion.reason}`)
      }
    }
  }

  private async checkBusinessLogicIntegrity(
    issues: IntegrityIssue[]
  ): Promise<void> {
    // Check campaign date consistency
    const invalidCampaigns = this.db
      .prepare(
        `
      SELECT id, name, start_date, end_date 
      FROM campaigns 
      WHERE start_date >= end_date
    `
      )
      .all()

    if (invalidCampaigns.length > 0) {
      console.log(
        `  ❌ Found ${invalidCampaigns.length} campaigns with invalid date ranges`
      )
      invalidCampaigns.forEach((campaign: any) => {
        issues.push({
          type: 'data_inconsistency',
          table: 'campaigns',
          description: `Campaign "${campaign.name}" has start_date >= end_date`,
          severity: 'medium',
          suggestion: 'Fix campaign date ranges',
        })
      })
    } else {
      console.log('  ✅ Campaign date ranges are valid')
    }

    // Check publication scheduling consistency
    const invalidPublications = this.db
      .prepare(
        `
      SELECT p.id, c.name as campaign_name, p.scheduled_date, c.start_date, c.end_date
      FROM publications p
      JOIN campaigns c ON p.campaign_id = c.id
      WHERE p.scheduled_date < c.start_date OR p.scheduled_date > c.end_date
    `
      )
      .all()

    if (invalidPublications.length > 0) {
      console.log(
        `  ❌ Found ${invalidPublications.length} publications scheduled outside campaign dates`
      )
      issues.push({
        type: 'data_inconsistency',
        table: 'publications',
        description: `${invalidPublications.length} publications scheduled outside their campaign date ranges`,
        severity: 'medium',
        suggestion: 'Reschedule publications within campaign dates',
      })
    } else {
      console.log('  ✅ Publication scheduling is consistent')
    }
  }

  private async checkOrphanedRecords(issues: IntegrityIssue[]): Promise<void> {
    // Check for orphaned campaign resources
    const orphanedCampaignResources = this.db
      .prepare(
        `
      SELECT cr.campaign_id, cr.resource_id
      FROM campaign_resources cr
      LEFT JOIN campaigns c ON cr.campaign_id = c.id
      LEFT JOIN resources r ON cr.resource_id = r.id
      WHERE c.id IS NULL OR r.id IS NULL
    `
      )
      .all()

    if (orphanedCampaignResources.length > 0) {
      console.log(
        `  ❌ Found ${orphanedCampaignResources.length} orphaned campaign-resource relationships`
      )
      issues.push({
        type: 'orphaned_record',
        table: 'campaign_resources',
        description: `${orphanedCampaignResources.length} orphaned campaign-resource relationships`,
        severity: 'low',
        suggestion: 'Clean up orphaned relationships',
      })
    } else {
      console.log('  ✅ No orphaned campaign-resource relationships')
    }

    // Check for orphaned campaign templates
    const orphanedCampaignTemplates = this.db
      .prepare(
        `
      SELECT ct.campaign_id, ct.template_id
      FROM campaign_templates ct
      LEFT JOIN campaigns c ON ct.campaign_id = c.id
      LEFT JOIN templates t ON ct.template_id = t.id
      WHERE c.id IS NULL OR t.id IS NULL
    `
      )
      .all()

    if (orphanedCampaignTemplates.length > 0) {
      console.log(
        `  ❌ Found ${orphanedCampaignTemplates.length} orphaned campaign-template relationships`
      )
      issues.push({
        type: 'orphaned_record',
        table: 'campaign_templates',
        description: `${orphanedCampaignTemplates.length} orphaned campaign-template relationships`,
        severity: 'low',
        suggestion: 'Clean up orphaned relationships',
      })
    } else {
      console.log('  ✅ No orphaned campaign-template relationships')
    }
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'

    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }
}
