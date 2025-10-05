import type { Database } from 'better-sqlite3'
import * as fs from 'fs'
import * as path from 'path'

export interface QueryPerformanceLog {
  timestamp: number
  query: string
  executionTime: number
  rowsAffected: number
  parameters?: any[]
}

export interface PerformanceAlert {
  type: 'slow_query' | 'high_memory' | 'lock_timeout' | 'integrity_issue'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: number
  details?: any
}

export interface MonitoringConfig {
  slowQueryThreshold: number // milliseconds
  logRetentionDays: number
  alertThresholds: {
    slowQuery: number
    memoryUsage: number
    lockTimeout: number
  }
}

export class DatabaseMonitor {
  private db: Database
  private config: MonitoringConfig
  private logDir: string
  private performanceLogs: QueryPerformanceLog[] = []
  private alerts: PerformanceAlert[] = []

  constructor(db: Database, config?: Partial<MonitoringConfig>) {
    this.db = db
    this.config = {
      slowQueryThreshold: 1000, // 1 second
      logRetentionDays: 30,
      alertThresholds: {
        slowQuery: 5000, // 5 seconds
        memoryUsage: 100 * 1024 * 1024, // 100MB
        lockTimeout: 30000, // 30 seconds
      },
      ...config,
    }

    this.logDir = path.join(process.cwd(), 'logs', 'database')
    this.ensureLogDirectory()
    this.loadExistingLogs()
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true })
    }
  }

  private loadExistingLogs(): void {
    try {
      const today = new Date().toISOString().split('T')[0]
      const logFile = path.join(this.logDir, `performance_${today}.json`)

      if (fs.existsSync(logFile)) {
        const data = fs.readFileSync(logFile, 'utf8')
        this.performanceLogs = JSON.parse(data)
      }
    } catch (error) {
      console.warn('Could not load existing performance logs:', error)
    }
  }

  // Monitor query execution
  monitorQuery<T>(query: string, parameters: any[] = []): (stmt: any) => T {
    return (stmt: any) => {
      const startTime = Date.now()

      try {
        const result = stmt.run
          ? stmt.run(...parameters)
          : stmt.all(...parameters)
        const executionTime = Date.now() - startTime

        // Log performance
        this.logQueryPerformance({
          timestamp: Date.now(),
          query: query.substring(0, 200), // Truncate long queries
          executionTime,
          rowsAffected:
            result.changes || (Array.isArray(result) ? result.length : 1),
          parameters: parameters.length > 0 ? parameters : undefined,
        })

        // Check for slow queries
        if (executionTime > this.config.alertThresholds.slowQuery) {
          this.createAlert({
            type: 'slow_query',
            severity: executionTime > 10000 ? 'critical' : 'high',
            message: `Slow query detected: ${executionTime}ms`,
            timestamp: Date.now(),
            details: { query, executionTime, parameters },
          })
        }

        return result
      } catch (error) {
        const executionTime = Date.now() - startTime

        // Log failed query
        this.logQueryPerformance({
          timestamp: Date.now(),
          query: query.substring(0, 200),
          executionTime,
          rowsAffected: 0,
          parameters,
        })

        throw error
      }
    }
  }

  // Log query performance
  private logQueryPerformance(log: QueryPerformanceLog): void {
    this.performanceLogs.push(log)

    // Keep only recent logs in memory
    const cutoff = Date.now() - 24 * 60 * 60 * 1000 // 24 hours
    this.performanceLogs = this.performanceLogs.filter(
      log => log.timestamp > cutoff
    )

    // Persist to file
    this.persistLogs()
  }

  // Create performance alert
  private createAlert(alert: PerformanceAlert): void {
    this.alerts.push(alert)
    console.warn(
      `🚨 Database Alert [${alert.severity.toUpperCase()}]: ${alert.message}`
    )

    // Keep only recent alerts
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000 // 7 days
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoff)

    // Persist alerts
    this.persistAlerts()
  }

  // Persist logs to file
  private persistLogs(): void {
    try {
      const today = new Date().toISOString().split('T')[0]
      const logFile = path.join(this.logDir, `performance_${today}.json`)
      fs.writeFileSync(logFile, JSON.stringify(this.performanceLogs, null, 2))
    } catch (error) {
      console.error('Failed to persist performance logs:', error)
    }
  }

  // Persist alerts to file
  private persistAlerts(): void {
    try {
      const alertFile = path.join(this.logDir, 'alerts.json')
      fs.writeFileSync(alertFile, JSON.stringify(this.alerts, null, 2))
    } catch (error) {
      console.error('Failed to persist alerts:', error)
    }
  }

  // Generate performance report
  async generatePerformanceReport(days: number = 7): Promise<void> {
    console.log(`📊 Performance Report (Last ${days} days)`)
    console.log('='.repeat(50))

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000
    const recentLogs = this.performanceLogs.filter(
      log => log.timestamp > cutoff
    )

    if (recentLogs.length === 0) {
      console.log('No performance data available for the specified period.')
      return
    }

    // Query statistics
    console.log('\n📈 Query Statistics:')
    console.log(`  Total queries: ${recentLogs.length.toLocaleString()}`)

    const avgExecutionTime =
      recentLogs.reduce((sum, log) => sum + log.executionTime, 0) /
      recentLogs.length
    console.log(`  Average execution time: ${Math.round(avgExecutionTime)}ms`)

    const slowQueries = recentLogs.filter(
      log => log.executionTime > this.config.slowQueryThreshold
    )
    console.log(
      `  Slow queries (>${this.config.slowQueryThreshold}ms): ${slowQueries.length} (${((slowQueries.length / recentLogs.length) * 100).toFixed(1)}%)`
    )

    // Slowest queries
    console.log('\n🐌 Slowest Queries:')
    const slowestQueries = [...recentLogs]
      .sort((a, b) => b.executionTime - a.executionTime)
      .slice(0, 5)

    slowestQueries.forEach((log, index) => {
      console.log(`  ${index + 1}. ${log.executionTime}ms - ${log.query}`)
    })

    // Query patterns
    console.log('\n🔍 Query Patterns:')
    const queryPatterns = new Map<
      string,
      { count: number; totalTime: number }
    >()

    recentLogs.forEach(log => {
      // Extract query pattern (remove specific values)
      const pattern = log.query
        .replace(/\b\d+\b/g, '?')
        .replace(/'[^']*'/g, '?')
        .replace(/\s+/g, ' ')
        .trim()

      const existing = queryPatterns.get(pattern) || { count: 0, totalTime: 0 }
      queryPatterns.set(pattern, {
        count: existing.count + 1,
        totalTime: existing.totalTime + log.executionTime,
      })
    })

    const topPatterns = Array.from(queryPatterns.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)

    topPatterns.forEach(([pattern, stats], index) => {
      const avgTime = Math.round(stats.totalTime / stats.count)
      console.log(
        `  ${index + 1}. ${stats.count} executions, ${avgTime}ms avg - ${pattern}`
      )
    })

    // Recent alerts
    console.log('\n🚨 Recent Alerts:')
    const recentAlerts = this.alerts.filter(alert => alert.timestamp > cutoff)

    if (recentAlerts.length === 0) {
      console.log('  No alerts in the specified period.')
    } else {
      const alertCounts = recentAlerts.reduce(
        (counts, alert) => {
          counts[alert.severity] = (counts[alert.severity] || 0) + 1
          return counts
        },
        {} as Record<string, number>
      )

      Object.entries(alertCounts).forEach(([severity, count]) => {
        const icon =
          {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢',
          }[severity] || '⚪'
        console.log(`  ${icon} ${severity}: ${count}`)
      })

      console.log('\n  Latest alerts:')
      recentAlerts
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 5)
        .forEach(alert => {
          const date = new Date(alert.timestamp).toLocaleString()
          console.log(`    ${date} - ${alert.message}`)
        })
    }
  }

  // Monitor database health
  async monitorHealth(): Promise<void> {
    console.log('🏥 Database Health Monitor')
    console.log('='.repeat(30))

    try {
      // Check database integrity
      console.log('\n🔍 Integrity Check:')
      const integrityResult = this.db.prepare('PRAGMA integrity_check').get()
      if (integrityResult.integrity_check === 'ok') {
        console.log('  ✅ Database integrity: OK')
      } else {
        console.log('  ❌ Database integrity: FAILED')
        this.createAlert({
          type: 'integrity_issue',
          severity: 'critical',
          message: 'Database integrity check failed',
          timestamp: Date.now(),
          details: integrityResult,
        })
      }

      // Check WAL file size
      console.log('\n📁 WAL File Status:')
      const walInfo = this.db.prepare('PRAGMA wal_checkpoint(PASSIVE)').get()
      console.log(`  WAL pages: ${walInfo.busy}, Checkpointed: ${walInfo.log}`)

      if (walInfo.busy > 1000) {
        console.log('  ⚠️  Large WAL file detected - consider checkpointing')
        this.createAlert({
          type: 'high_memory',
          severity: 'medium',
          message: `Large WAL file: ${walInfo.busy} pages`,
          timestamp: Date.now(),
          details: walInfo,
        })
      }

      // Check database size
      console.log('\n💾 Database Size:')
      const pageCount = this.db.prepare('PRAGMA page_count').get()
      const pageSize = this.db.prepare('PRAGMA page_size').get()
      const totalSize = pageCount.page_count * pageSize.page_size

      console.log(`  Size: ${this.formatBytes(totalSize)}`)
      console.log(`  Pages: ${pageCount.page_count.toLocaleString()}`)

      // Check for long-running transactions
      console.log('\n⏱️  Transaction Status:')
      // Note: SQLite doesn't provide direct access to transaction info
      // This is a placeholder for potential future monitoring
      console.log('  No long-running transactions detected')

      // Performance summary
      console.log('\n📊 Recent Performance:')
      const recentLogs = this.performanceLogs.filter(
        log => log.timestamp > Date.now() - 60 * 60 * 1000 // Last hour
      )

      if (recentLogs.length > 0) {
        const avgTime =
          recentLogs.reduce((sum, log) => sum + log.executionTime, 0) /
          recentLogs.length
        const slowQueries = recentLogs.filter(
          log => log.executionTime > this.config.slowQueryThreshold
        )

        console.log(`  Queries (last hour): ${recentLogs.length}`)
        console.log(`  Average time: ${Math.round(avgTime)}ms`)
        console.log(`  Slow queries: ${slowQueries.length}`)
      } else {
        console.log('  No recent query activity')
      }
    } catch (error) {
      console.error('❌ Health check failed:', error)
      this.createAlert({
        type: 'integrity_issue',
        severity: 'high',
        message: `Health check failed: ${error}`,
        timestamp: Date.now(),
        details: { error: error.toString() },
      })
    }
  }

  // Clean old logs
  async cleanOldLogs(): Promise<void> {
    try {
      const files = fs.readdirSync(this.logDir)
      const cutoff =
        Date.now() - this.config.logRetentionDays * 24 * 60 * 60 * 1000

      let deletedCount = 0

      for (const file of files) {
        if (file.startsWith('performance_') && file.endsWith('.json')) {
          const filePath = path.join(this.logDir, file)
          const stats = fs.statSync(filePath)

          if (stats.mtime.getTime() < cutoff) {
            fs.unlinkSync(filePath)
            deletedCount++
          }
        }
      }

      console.log(`🧹 Cleaned ${deletedCount} old log files`)
    } catch (error) {
      console.error('Failed to clean old logs:', error)
    }
  }

  // Get current alerts
  getAlerts(severity?: string): PerformanceAlert[] {
    if (severity) {
      return this.alerts.filter(alert => alert.severity === severity)
    }
    return [...this.alerts]
  }

  // Clear alerts
  clearAlerts(): void {
    this.alerts = []
    this.persistAlerts()
    console.log('✅ All alerts cleared')
  }

  private formatBytes(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'

    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }
}
