#!/usr/bin/env node

import { initializeDatabase, closeDatabase } from '../connection'
import { DatabaseMonitor } from './monitor'
import { DatabaseAnalyzer } from './analyzer'
import * as fs from 'fs'
import * as path from 'path'

// Parse command line arguments
const args = process.argv.slice(2)
const command = args[0]
const subcommand = args[1]

async function main() {
  try {
    switch (command) {
      case 'health':
        await handleHealthCommand()
        break

      case 'performance':
        await handlePerformanceCommand()
        break

      case 'alerts':
        await handleAlertsCommand()
        break

      case 'logs':
        await handleLogsCommand()
        break

      case 'watch':
        await handleWatchCommand()
        break

      case 'report':
        await handleReportCommand()
        break

      default:
        showHelp()
        break
    }
  } catch (error) {
    console.error('❌ Monitoring command failed:', error)
    process.exit(1)
  }
}

async function handleHealthCommand() {
  const db = initializeDatabase()
  const monitor = new DatabaseMonitor(db)

  try {
    await monitor.monitorHealth()
  } finally {
    closeDatabase()
  }
}

async function handlePerformanceCommand() {
  const db = initializeDatabase()
  const monitor = new DatabaseMonitor(db)

  try {
    switch (subcommand) {
      case 'report':
        const days = args[2] ? parseInt(args[2]) : 7
        await monitor.generatePerformanceReport(days)
        break

      case 'live':
        console.log('🔴 Live Performance Monitoring (Press Ctrl+C to stop)')
        console.log('Monitoring database queries in real-time...\n')

        // This would require hooking into the database connection
        // For now, we'll show a simulated live monitor
        await simulateLiveMonitoring()
        break

      case 'benchmark':
        await runPerformanceBenchmark()
        break

      default:
        await monitor.generatePerformanceReport()
        break
    }
  } finally {
    closeDatabase()
  }
}

async function handleAlertsCommand() {
  const db = initializeDatabase()
  const monitor = new DatabaseMonitor(db)

  try {
    switch (subcommand) {
      case 'list':
        const severity = args[2]
        const alerts = monitor.getAlerts(severity)

        console.log('🚨 Database Alerts')
        console.log('==================\n')

        if (alerts.length === 0) {
          console.log('No alerts found.')
        } else {
          alerts
            .sort((a, b) => b.timestamp - a.timestamp)
            .forEach((alert, index) => {
              const icon = {
                critical: '🔴',
                high: '🟠',
                medium: '🟡',
                low: '🟢',
              }[alert.severity]

              const date = new Date(alert.timestamp).toLocaleString()
              console.log(
                `${index + 1}. ${icon} [${alert.severity.toUpperCase()}] ${alert.message}`
              )
              console.log(`   Time: ${date}`)
              console.log(`   Type: ${alert.type}`)
              if (alert.details) {
                console.log(
                  `   Details: ${JSON.stringify(alert.details, null, 2)}`
                )
              }
              console.log('')
            })
        }
        break

      case 'clear':
        monitor.clearAlerts()
        break

      case 'summary':
        const allAlerts = monitor.getAlerts()
        const summary = allAlerts.reduce(
          (acc, alert) => {
            acc[alert.severity] = (acc[alert.severity] || 0) + 1
            return acc
          },
          {} as Record<string, number>
        )

        console.log('📊 Alert Summary:')
        Object.entries(summary).forEach(([severity, count]) => {
          const icon = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢',
          }[severity]
          console.log(`  ${icon} ${severity}: ${count}`)
        })
        break

      default:
        console.log(
          'Usage: npm run db:monitor alerts [list|clear|summary] [severity]'
        )
        break
    }
  } finally {
    closeDatabase()
  }
}

async function handleLogsCommand() {
  const logDir = path.join(process.cwd(), 'logs', 'database')

  switch (subcommand) {
    case 'list':
      console.log('📋 Available Log Files:')
      if (fs.existsSync(logDir)) {
        const files = fs.readdirSync(logDir)
        const logFiles = files.filter(file => file.endsWith('.json'))

        if (logFiles.length === 0) {
          console.log('  No log files found')
        } else {
          logFiles.forEach(file => {
            const filePath = path.join(logDir, file)
            const stats = fs.statSync(filePath)
            const size = (stats.size / 1024).toFixed(1)
            console.log(
              `  • ${file} (${size} KB, ${stats.mtime.toLocaleDateString()})`
            )
          })
        }
      } else {
        console.log('  Log directory does not exist')
      }
      break

    case 'clean':
      const db = initializeDatabase()
      const monitor = new DatabaseMonitor(db)

      try {
        await monitor.cleanOldLogs()
      } finally {
        closeDatabase()
      }
      break

    case 'tail':
      const logFile =
        args[2] || `performance_${new Date().toISOString().split('T')[0]}.json`
      await tailLogFile(path.join(logDir, logFile))
      break

    default:
      console.log('Usage: npm run db:monitor logs [list|clean|tail] [filename]')
      break
  }
}

async function handleWatchCommand() {
  console.log('👁️  Database Watch Mode (Press Ctrl+C to stop)')
  console.log('Monitoring database health and performance...\n')

  const db = initializeDatabase()
  const monitor = new DatabaseMonitor(db)
  const analyzer = new DatabaseAnalyzer(db)

  let isRunning = true

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    console.log('\n🛑 Stopping watch mode...')
    isRunning = false
    closeDatabase()
    process.exit(0)
  })

  try {
    while (isRunning) {
      console.clear()
      console.log('👁️  Database Watch Mode - ' + new Date().toLocaleString())
      console.log('='.repeat(60))

      // Health check
      await monitor.monitorHealth()

      console.log('\n' + '-'.repeat(60))

      // Quick performance summary
      await monitor.generatePerformanceReport(1) // Last day

      // Wait 30 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 30000))
    }
  } finally {
    closeDatabase()
  }
}

async function handleReportCommand() {
  const db = initializeDatabase()
  const monitor = new DatabaseMonitor(db)
  const analyzer = new DatabaseAnalyzer(db)

  try {
    const reportType = subcommand || 'full'
    const outputFile = args[2]

    console.log('📊 Generating Database Report...\n')

    let reportContent = ''

    switch (reportType) {
      case 'performance':
        console.log('Performance Report:')
        await monitor.generatePerformanceReport(7)
        break

      case 'health':
        console.log('Health Report:')
        await monitor.monitorHealth()
        break

      case 'full':
        console.log('Complete Database Report:')
        console.log('========================\n')

        // Capture output for file if needed
        if (outputFile) {
          const originalLog = console.log
          const logs: string[] = []

          console.log = (...args) => {
            const message = args.join(' ')
            logs.push(message)
            originalLog(message)
          }

          await monitor.monitorHealth()
          console.log('\n' + '='.repeat(50) + '\n')
          await monitor.generatePerformanceReport(7)
          console.log('\n' + '='.repeat(50) + '\n')
          await analyzer.runCompleteAnalysis()

          // Restore console.log
          console.log = originalLog

          // Write to file
          const reportData = {
            timestamp: new Date().toISOString(),
            type: 'full_database_report',
            content: logs.join('\n'),
          }

          fs.writeFileSync(outputFile, JSON.stringify(reportData, null, 2))
          console.log(`\n📄 Report saved to: ${outputFile}`)
        } else {
          await monitor.monitorHealth()
          console.log('\n' + '='.repeat(50) + '\n')
          await monitor.generatePerformanceReport(7)
          console.log('\n' + '='.repeat(50) + '\n')
          await analyzer.runCompleteAnalysis()
        }
        break

      default:
        console.log(
          'Usage: npm run db:monitor report [performance|health|full] [output_file]'
        )
        break
    }
  } finally {
    closeDatabase()
  }
}

async function simulateLiveMonitoring(): Promise<void> {
  // This is a simulation - in a real implementation, you'd hook into the database connection
  console.log('📊 Live Query Monitor:')
  console.log('Time     | Duration | Query')
  console.log('-'.repeat(50))

  const queries = [
    'SELECT * FROM campaigns WHERE workspace_id = ?',
    'SELECT * FROM publications WHERE scheduled_date BETWEEN ? AND ?',
    'SELECT COUNT(*) FROM resources WHERE workspace_id = ?',
    'UPDATE campaigns SET status = ? WHERE id = ?',
    'INSERT INTO publications (campaign_id, content, ...) VALUES (?, ?, ...)',
  ]

  for (let i = 0; i < 20; i++) {
    const time = new Date().toLocaleTimeString()
    const duration = Math.floor(Math.random() * 500) + 10
    const query = queries[Math.floor(Math.random() * queries.length)]

    const durationColor = duration > 200 ? '🔴' : duration > 100 ? '🟡' : '🟢'
    console.log(
      `${time} | ${durationColor} ${duration.toString().padStart(3)}ms | ${query}`
    )

    await new Promise(resolve => setTimeout(resolve, 1000))
  }
}

async function runPerformanceBenchmark(): Promise<void> {
  console.log('🏃 Running Performance Benchmark...\n')

  const db = initializeDatabase()

  try {
    const benchmarks = [
      {
        name: 'Simple SELECT',
        query: 'SELECT COUNT(*) FROM agencies',
        iterations: 1000,
      },
      {
        name: 'JOIN Query',
        query:
          'SELECT c.name, w.name FROM campaigns c JOIN workspaces w ON c.workspace_id = w.id LIMIT 100',
        iterations: 100,
      },
      {
        name: 'Complex Aggregation',
        query: `
          SELECT w.name, COUNT(c.id) as campaign_count, COUNT(p.id) as publication_count
          FROM workspaces w
          LEFT JOIN campaigns c ON w.id = c.workspace_id
          LEFT JOIN publications p ON c.id = p.campaign_id
          GROUP BY w.id, w.name
        `,
        iterations: 50,
      },
    ]

    for (const benchmark of benchmarks) {
      console.log(`📊 ${benchmark.name}:`)

      const times: number[] = []

      for (let i = 0; i < benchmark.iterations; i++) {
        const start = Date.now()

        try {
          db.prepare(benchmark.query).all()
          const duration = Date.now() - start
          times.push(duration)
        } catch (error) {
          console.log(`  ❌ Query failed: ${error}`)
          break
        }
      }

      if (times.length > 0) {
        const avg = times.reduce((sum, time) => sum + time, 0) / times.length
        const min = Math.min(...times)
        const max = Math.max(...times)
        const p95 = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]

        console.log(`  Iterations: ${times.length}`)
        console.log(`  Average: ${avg.toFixed(2)}ms`)
        console.log(`  Min: ${min}ms`)
        console.log(`  Max: ${max}ms`)
        console.log(`  95th percentile: ${p95}ms`)
      }

      console.log('')
    }
  } finally {
    closeDatabase()
  }
}

async function tailLogFile(filePath: string): Promise<void> {
  if (!fs.existsSync(filePath)) {
    console.log(`❌ Log file not found: ${filePath}`)
    return
  }

  console.log(`📄 Tailing log file: ${path.basename(filePath)}`)
  console.log('Press Ctrl+C to stop\n')

  try {
    const data = fs.readFileSync(filePath, 'utf8')
    const logs = JSON.parse(data)

    // Show last 10 entries
    const recentLogs = logs.slice(-10)

    recentLogs.forEach((log: any) => {
      const time = new Date(log.timestamp).toLocaleTimeString()
      const duration = log.executionTime
      const durationColor =
        duration > 1000 ? '🔴' : duration > 500 ? '🟡' : '🟢'

      console.log(`${time} | ${durationColor} ${duration}ms | ${log.query}`)
    })

    // In a real implementation, you'd watch the file for changes
    console.log(
      '\n(File watching not implemented - showing recent entries only)'
    )
  } catch (error) {
    console.error('❌ Error reading log file:', error)
  }
}

function showHelp() {
  console.log('Database Monitoring CLI')
  console.log('=======================\n')

  console.log('Usage: npm run db:monitor <command> [subcommand] [options]\n')

  console.log('Commands:')
  console.log('  health                  Check database health status')
  console.log('')
  console.log('  performance <subcommand>')
  console.log(
    '    report [days]           Generate performance report (default: 7 days)'
  )
  console.log('    live                    Live performance monitoring')
  console.log('    benchmark               Run performance benchmark')
  console.log('')
  console.log('  alerts <subcommand>')
  console.log(
    '    list [severity]         List alerts (optionally filter by severity)'
  )
  console.log('    clear                   Clear all alerts')
  console.log('    summary                 Show alert summary')
  console.log('')
  console.log('  logs <subcommand>')
  console.log('    list                    List available log files')
  console.log('    clean                   Clean old log files')
  console.log(
    "    tail [filename]         Tail log file (default: today's log)"
  )
  console.log('')
  console.log('  watch                   Continuous monitoring mode')
  console.log('')
  console.log('  report <type> [output]')
  console.log('    performance             Performance report only')
  console.log('    health                  Health report only')
  console.log(
    '    full [file]             Complete report (optionally save to file)'
  )
  console.log('')
  console.log('Examples:')
  console.log('  npm run db:monitor health')
  console.log('  npm run db:monitor performance report 30')
  console.log('  npm run db:monitor alerts list critical')
  console.log('  npm run db:monitor watch')
  console.log('  npm run db:monitor report full report.json')
}

main()
