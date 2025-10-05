#!/usr/bin/env node

import { initializeDatabase, closeDatabase } from '../connection'
import { MigrationRunner } from '../migrations'
import { migrations } from '../migrations/registry'

// Parse command line arguments
const args = process.argv.slice(2)
const command = args[0] || 'up'

async function main() {
  try {
    console.log('Initializing database connection...')
    const db = initializeDatabase()
    const runner = new MigrationRunner(db)

    switch (command) {
      case 'up':
        const targetVersion = args[1] ? parseInt(args[1]) : undefined
        runner.migrateUp(migrations, targetVersion)
        break

      case 'down':
        const downVersion = parseInt(args[1])
        if (isNaN(downVersion)) {
          console.error('Error: down command requires a target version number')
          process.exit(1)
        }
        runner.migrateDown(migrations, downVersion)
        break

      case 'reset':
        console.log(
          '⚠️  This will reset the entire database. Are you sure? (y/N)'
        )
        const readline = require('readline')
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        })

        rl.question('Continue? ', (answer: string) => {
          if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            runner.reset(migrations)
            console.log('Database reset completed')
          } else {
            console.log('Reset cancelled')
          }
          rl.close()
          closeDatabase()
        })
        return // Don't close database yet

      case 'status':
        runner.getStatus(migrations)
        break

      default:
        console.log('Usage: npm run db:migrate [command] [options]')
        console.log('')
        console.log('Commands:')
        console.log(
          '  up [version]    Run migrations up to target version (default: latest)'
        )
        console.log(
          '  down <version>  Rollback migrations down to target version'
        )
        console.log(
          '  reset           Reset database (rollback all migrations)'
        )
        console.log('  status          Show migration status')
        console.log('')
        console.log('Examples:')
        console.log('  npm run db:migrate up')
        console.log('  npm run db:migrate up 5')
        console.log('  npm run db:migrate down 3')
        console.log('  npm run db:migrate status')
        break
    }

    closeDatabase()
  } catch (error) {
    console.error('Migration failed:', error)
    closeDatabase()
    process.exit(1)
  }
}

main()
