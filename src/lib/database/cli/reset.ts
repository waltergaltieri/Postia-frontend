#!/usr/bin/env node

import { initializeDatabase, closeDatabase } from '../connection'
import { MigrationRunner } from '../migrations'
import { SeedRunner } from '../seeds'
import { migrations } from '../migrations/registry'
import { seeds } from '../seeds/registry'

async function main() {
  try {
    console.log(
      '⚠️  This will completely reset the database (rollback all migrations and re-run them with seeds).'
    )
    console.log('Are you sure you want to continue? (y/N)')

    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    rl.question('Continue? ', (answer: string) => {
      if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
        performReset()
      } else {
        console.log('Reset cancelled')
        rl.close()
      }
    })

    function performReset() {
      console.log('Initializing database connection...')
      const db = initializeDatabase()

      const migrationRunner = new MigrationRunner(db)
      const seedRunner = new SeedRunner(db)

      console.log('\n1. Rolling back all migrations...')
      migrationRunner.reset(migrations)

      console.log('\n2. Running migrations...')
      migrationRunner.migrateUp(migrations)

      console.log('\n3. Running seeds...')
      seedRunner.runAll(seeds)

      console.log('\n✅ Database reset completed successfully!')
      console.log('\nDatabase is now ready with:')
      console.log('- Fresh schema from migrations')
      console.log('- Sample data from seeds')

      rl.close()
      closeDatabase()
    }
  } catch (error) {
    console.error('Database reset failed:', error)
    closeDatabase()
    process.exit(1)
  }
}

main()
