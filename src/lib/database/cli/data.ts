#!/usr/bin/env node

import { initializeDatabase, closeDatabase } from '../connection'
import { DataUtils, TestScenario } from '../utils/dataUtils'

// Parse command line arguments
const args = process.argv.slice(2)
const command = args[0] || 'help'

async function main() {
  try {
    console.log('Initializing database connection...')
    const db = initializeDatabase()
    const dataUtils = new DataUtils(db)

    switch (command) {
      case 'stats':
        dataUtils.printDatabaseStats()
        dataUtils.printCampaignStats()
        break

      case 'integrity':
        dataUtils.printIntegrityReport()
        break

      case 'clear':
        const target = args[1] || 'all'
        if (target === 'all') {
          console.log(
            '⚠️  This will clear ALL data from the database. Are you sure? (y/N)'
          )
          await confirmAndExecute(() => {
            dataUtils.clearAllTables()
            console.log('All data cleared successfully')
          })
        } else if (target === 'test') {
          dataUtils.clearTestData()
        } else {
          // Clear specific tables
          const tables = target.split(',')
          console.log(
            `⚠️  This will clear data from tables: ${tables.join(', ')}. Are you sure? (y/N)`
          )
          await confirmAndExecute(() => {
            dataUtils.clearTables(tables)
            console.log('Selected tables cleared successfully')
          })
        }
        break

      case 'backup':
        const backupData = dataUtils.createDataBackup()
        const filename = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.sql`

        // Write to file (in a real implementation, you'd use fs.writeFileSync)
        console.log('Backup created successfully')
        console.log(`Backup size: ${backupData.length} characters`)
        console.log(`Suggested filename: ${filename}`)
        console.log('\nFirst 500 characters of backup:')
        console.log(backupData.substring(0, 500) + '...')
        break

      case 'scenario':
        const scenario = args[1] as TestScenario
        if (!scenario) {
          console.log('Available test scenarios:')
          console.log(
            '  empty_agency      - Create an agency with no workspaces'
          )
          console.log('  active_campaigns  - Create multiple active campaigns')
          console.log(
            '  failed_publications - Create publications with failure states'
          )
          console.log(
            '  large_dataset     - Generate large amount of test data'
          )
          break
        }

        dataUtils.generateTestScenario(scenario)
        console.log(`Test scenario '${scenario}' generated successfully`)
        break

      case 'validate':
        const report = dataUtils.validateIntegrity()
        if (report.isValid) {
          console.log('✅ Database validation passed')
          process.exit(0)
        } else {
          console.log('❌ Database validation failed')
          report.issues.forEach(issue => console.log(`  - ${issue}`))
          process.exit(1)
        }
        break

      case 'help':
      default:
        console.log('Database Data Management CLI')
        console.log('')
        console.log('Usage: npm run db:data [command] [options]')
        console.log('')
        console.log('Commands:')
        console.log('  stats                    Show database statistics')
        console.log('  integrity                Check database integrity')
        console.log(
          '  clear [target]           Clear data (all|test|table1,table2,...)'
        )
        console.log('  backup                   Create data backup as SQL')
        console.log('  scenario [name]          Generate test scenario data')
        console.log(
          '  validate                 Validate database integrity (exit code)'
        )
        console.log('  help                     Show this help message')
        console.log('')
        console.log('Examples:')
        console.log('  npm run db:data stats')
        console.log('  npm run db:data clear test')
        console.log('  npm run db:data clear campaigns,publications')
        console.log('  npm run db:data scenario empty_agency')
        console.log('  npm run db:data backup > backup.sql')
        break
    }

    closeDatabase()
  } catch (error) {
    console.error('Data operation failed:', error)
    closeDatabase()
    process.exit(1)
  }
}

async function confirmAndExecute(action: () => void): Promise<void> {
  return new Promise(resolve => {
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    rl.question('Continue? ', (answer: string) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        action()
      } else {
        console.log('Operation cancelled')
      }
      rl.close()
      resolve()
    })
  })
}

main()
