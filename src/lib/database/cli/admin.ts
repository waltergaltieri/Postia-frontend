#!/usr/bin/env node

import { initializeDatabase, closeDatabase } from '../connection'
import { MigrationRunner } from '../migrations'
import { SeedRunner } from '../seeds'
import { migrations } from '../migrations/registry'
import { seeds } from '../seeds/registry'
import { BackupManager } from './backup'
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
      case 'migrate':
        await handleMigrationCommand()
        break

      case 'seed':
        await handleSeedCommand()
        break

      case 'backup':
        await handleBackupCommand()
        break

      case 'restore':
        await handleRestoreCommand()
        break

      case 'analyze':
        await handleAnalyzeCommand()
        break

      case 'monitor':
        await handleMonitorCommand()
        break

      case 'status':
        await handleStatusCommand()
        break

      case 'reset':
        await handleResetCommand()
        break

      default:
        showHelp()
        break
    }
  } catch (error) {
    console.error('❌ Command failed:', error)
    process.exit(1)
  }
}

async function handleMigrationCommand() {
  const db = initializeDatabase()
  const runner = new MigrationRunner(db)

  try {
    switch (subcommand) {
      case 'up':
        const targetVersion = args[2] ? parseInt(args[2]) : undefined
        console.log('🔄 Running migrations...')
        runner.migrateUp(migrations, targetVersion)
        console.log('✅ Migrations completed')
        break

      case 'down':
        const downVersion = parseInt(args[2])
        if (isNaN(downVersion)) {
          console.error(
            '❌ Error: down command requires a target version number'
          )
          process.exit(1)
        }
        console.log(`🔄 Rolling back to version ${downVersion}...`)
        runner.migrateDown(migrations, downVersion)
        console.log('✅ Rollback completed')
        break

      case 'status':
        console.log('📊 Migration Status:')
        runner.getStatus(migrations)
        break

      case 'create':
        const migrationName = args[2]
        if (!migrationName) {
          console.error('❌ Error: create command requires a migration name')
          process.exit(1)
        }
        await createMigrationFile(migrationName)
        break

      default:
        console.log(
          'Usage: npm run db:admin migrate [up|down|status|create] [options]'
        )
        break
    }
  } finally {
    closeDatabase()
  }
}

async function handleSeedCommand() {
  const db = initializeDatabase()
  const runner = new SeedRunner(db)

  try {
    switch (subcommand) {
      case 'run':
        const seedName = args[2]
        console.log('🌱 Running seeds...')
        if (seedName) {
          runner.runSeed(seeds, seedName)
        } else {
          runner.runAll(seeds)
        }
        console.log('✅ Seeds completed')
        break

      case 'clear':
        await confirmAction('clear all data', () => {
          runner.clearAllData()
          console.log('✅ Database cleared')
        })
        break

      case 'reset':
        await confirmAction('clear and re-seed database', () => {
          runner.clearAllData()
          runner.runAll(seeds)
          console.log('✅ Database reset and seeded')
        })
        break

      case 'list':
        console.log('📋 Available seeds:')
        seeds.forEach(seed => {
          console.log(`  • ${seed.name}: ${seed.description}`)
        })
        break

      default:
        console.log(
          'Usage: npm run db:admin seed [run|clear|reset|list] [options]'
        )
        break
    }
  } finally {
    closeDatabase()
  }
}

async function handleBackupCommand() {
  const db = initializeDatabase()
  const backupManager = new BackupManager(db)

  try {
    switch (subcommand) {
      case 'create':
        const backupName =
          args[2] || `backup_${new Date().toISOString().replace(/[:.]/g, '-')}`
        console.log(`💾 Creating backup: ${backupName}...`)
        const backupPath = await backupManager.createBackup(backupName)
        console.log(`✅ Backup created: ${backupPath}`)
        break

      case 'list':
        console.log('📋 Available backups:')
        const backups = await backupManager.listBackups()
        if (backups.length === 0) {
          console.log('  No backups found')
        } else {
          backups.forEach(backup => {
            console.log(`  • ${backup.name} (${backup.size}, ${backup.date})`)
          })
        }
        break

      case 'auto':
        console.log('🔄 Creating automatic backup...')
        const autoBackupPath = await backupManager.createAutoBackup()
        console.log(`✅ Auto backup created: ${autoBackupPath}`)
        break

      default:
        console.log('Usage: npm run db:admin backup [create|list|auto] [name]')
        break
    }
  } finally {
    closeDatabase()
  }
}

async function handleRestoreCommand() {
  const backupName = args[1]
  if (!backupName) {
    console.error('❌ Error: restore command requires a backup name')
    process.exit(1)
  }

  await confirmAction(`restore from backup: ${backupName}`, async () => {
    const db = initializeDatabase()
    const backupManager = new BackupManager(db)

    try {
      console.log(`🔄 Restoring from backup: ${backupName}...`)
      await backupManager.restoreBackup(backupName)
      console.log('✅ Restore completed')
    } finally {
      closeDatabase()
    }
  })
}

async function handleAnalyzeCommand() {
  const db = initializeDatabase()
  const analyzer = new DatabaseAnalyzer(db)

  try {
    switch (subcommand) {
      case 'performance':
        console.log('📊 Performance Analysis:')
        await analyzer.analyzePerformance()
        break

      case 'indexes':
        console.log('📊 Index Usage Analysis:')
        await analyzer.analyzeIndexUsage()
        break

      case 'integrity':
        console.log('🔍 Data Integrity Check:')
        await analyzer.checkDataIntegrity()
        break

      case 'size':
        console.log('📊 Database Size Analysis:')
        await analyzer.analyzeDatabaseSize()
        break

      case 'all':
        console.log('📊 Complete Database Analysis:')
        await analyzer.runCompleteAnalysis()
        break

      default:
        console.log(
          'Usage: npm run db:admin analyze [performance|indexes|integrity|size|all]'
        )
        break
    }
  } finally {
    closeDatabase()
  }
}

async function handleStatusCommand() {
  const db = initializeDatabase()

  try {
    console.log('📊 Database Status Report:')
    console.log('========================\n')

    // Migration status
    const migrationRunner = new MigrationRunner(db)
    console.log('🔄 Migration Status:')
    migrationRunner.getStatus(migrations)
    console.log('')

    // Database size
    const analyzer = new DatabaseAnalyzer(db)
    await analyzer.analyzeDatabaseSize()
    console.log('')

    // Recent backups
    const backupManager = new BackupManager(db)
    const recentBackups = await backupManager.listBackups(5)
    console.log('💾 Recent Backups:')
    if (recentBackups.length === 0) {
      console.log('  No backups found')
    } else {
      recentBackups.forEach(backup => {
        console.log(`  • ${backup.name} (${backup.size}, ${backup.date})`)
      })
    }
  } finally {
    closeDatabase()
  }
}

async function handleMonitorCommand() {
  // Delegate to monitoring CLI
  const { spawn } = require('child_process')
  const monitorArgs = args.slice(1) // Remove 'monitor' from args

  const child = spawn(
    'tsx',
    ['src/lib/database/cli/monitoring.ts', ...monitorArgs],
    {
      stdio: 'inherit',
      cwd: process.cwd(),
    }
  )

  return new Promise<void>((resolve, reject) => {
    child.on('close', (code: number) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Monitoring command failed with code ${code}`))
      }
    })
  })
}

async function handleResetCommand() {
  await confirmAction('completely reset the database', async () => {
    const db = initializeDatabase()

    try {
      // Create backup before reset
      const backupManager = new BackupManager(db)
      console.log('💾 Creating backup before reset...')
      const backupPath = await backupManager.createBackup(
        `pre_reset_${new Date().toISOString().replace(/[:.]/g, '-')}`
      )
      console.log(`✅ Backup created: ${backupPath}`)

      // Reset database
      const migrationRunner = new MigrationRunner(db)
      const seedRunner = new SeedRunner(db)

      console.log('🔄 Rolling back all migrations...')
      migrationRunner.reset(migrations)

      console.log('🔄 Running migrations...')
      migrationRunner.migrateUp(migrations)

      console.log('🌱 Running seeds...')
      seedRunner.runAll(seeds)

      console.log('✅ Database reset completed successfully!')
    } finally {
      closeDatabase()
    }
  })
}

async function createMigrationFile(name: string) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .split('T')[0]
    .replace(/-/g, '')
  const filename = `${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}.ts`
  const migrationPath = path.join(
    process.cwd(),
    'src/lib/database/migrations',
    filename
  )

  const template = `import type { Database } from 'better-sqlite3';
import type { Migration } from '../types';

export const migration_${timestamp}_${name.toLowerCase().replace(/\s+/g, '_')}: Migration = {
  version: ${Date.now()},
  description: '${name}',
  
  up: (db: Database) => {
    // TODO: Implement migration up
    db.exec(\`
      -- Add your migration SQL here
    \`);
  },
  
  down: (db: Database) => {
    // TODO: Implement migration down
    db.exec(\`
      -- Add your rollback SQL here
    \`);
  }
};
`

  fs.writeFileSync(migrationPath, template)
  console.log(`✅ Migration file created: ${migrationPath}`)
  console.log("📝 Don't forget to add it to the migrations registry!")
}

async function confirmAction(
  action: string,
  callback: () => void | Promise<void>
) {
  console.log(`⚠️  This will ${action}. Are you sure? (y/N)`)

  const readline = require('readline')
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise<void>(resolve => {
    rl.question('Continue? ', async (answer: string) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        await callback()
      } else {
        console.log('❌ Action cancelled')
      }
      rl.close()
      resolve()
    })
  })
}

function showHelp() {
  console.log('Postia Database Administration CLI')
  console.log('==================================\n')

  console.log('Usage: npm run db:admin <command> [subcommand] [options]\n')

  console.log('Commands:')
  console.log('  migrate <subcommand>    Database migration management')
  console.log('    up [version]            Run migrations up to version')
  console.log('    down <version>          Rollback to version')
  console.log('    status                  Show migration status')
  console.log('    create <name>           Create new migration file')
  console.log('')
  console.log('  seed <subcommand>       Database seeding management')
  console.log('    run [name]              Run all seeds or specific seed')
  console.log('    clear                   Clear all data')
  console.log('    reset                   Clear and re-seed')
  console.log('    list                    List available seeds')
  console.log('')
  console.log('  backup <subcommand>     Database backup management')
  console.log('    create [name]           Create backup')
  console.log('    list                    List available backups')
  console.log('    auto                    Create automatic backup')
  console.log('')
  console.log('  restore <backup>        Restore from backup')
  console.log('')
  console.log('  analyze <subcommand>    Database analysis tools')
  console.log('    performance             Analyze query performance')
  console.log('    indexes                 Analyze index usage')
  console.log('    integrity               Check data integrity')
  console.log('    size                    Analyze database size')
  console.log('    all                     Run complete analysis')
  console.log('')
  console.log('  monitor <subcommand>    Database monitoring tools')
  console.log('    health                  Check database health')
  console.log('    performance             Performance monitoring')
  console.log('    alerts                  Alert management')
  console.log('    logs                    Log management')
  console.log('    watch                   Continuous monitoring')
  console.log('    report                  Generate reports')
  console.log('')
  console.log('  status                  Show overall database status')
  console.log('  reset                   Complete database reset')
  console.log('')
  console.log('Examples:')
  console.log('  npm run db:admin migrate up')
  console.log('  npm run db:admin backup create my_backup')
  console.log('  npm run db:admin analyze performance')
  console.log('  npm run db:admin monitor health')
  console.log('  npm run db:admin status')
}

main()
