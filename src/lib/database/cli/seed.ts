#!/usr/bin/env node

import { initializeDatabase, closeDatabase } from '../connection'
import { SeedRunner } from '../seeds'
import { seeds } from '../seeds/registry'

// Parse command line arguments
const args = process.argv.slice(2)
const command = args[0] || 'run'

async function main() {
  try {
    console.log('Initializing database connection...')
    const db = initializeDatabase()
    const runner = new SeedRunner(db)

    switch (command) {
      case 'run':
        const seedName = args[1]
        if (seedName) {
          runner.runSeed(seeds, seedName)
        } else {
          runner.runAll(seeds)
        }
        break

      case 'clear':
        console.log(
          '⚠️  This will clear all data from the database. Are you sure? (y/N)'
        )
        const readline = require('readline')
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        })

        rl.question('Continue? ', (answer: string) => {
          if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            runner.clearAllData()
            console.log('Database cleared successfully')
          } else {
            console.log('Clear cancelled')
          }
          rl.close()
          closeDatabase()
        })
        return // Don't close database yet

      case 'reset':
        console.log(
          '⚠️  This will clear all data and re-run seeds. Are you sure? (y/N)'
        )
        const readline2 = require('readline')
        const rl2 = readline2.createInterface({
          input: process.stdin,
          output: process.stdout,
        })

        rl2.question('Continue? ', (answer: string) => {
          if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
            runner.clearAllData()
            runner.runAll(seeds)
            console.log('Database reset and seeded successfully')
          } else {
            console.log('Reset cancelled')
          }
          rl2.close()
          closeDatabase()
        })
        return // Don't close database yet

      case 'list':
        console.log('\nAvailable seeds:')
        seeds.forEach(seed => {
          console.log(`  ${seed.name}: ${seed.description}`)
        })
        console.log('')
        break

      default:
        console.log('Usage: npm run db:seed [command] [options]')
        console.log('')
        console.log('Commands:')
        console.log('  run [name]      Run all seeds or specific seed by name')
        console.log('  clear           Clear all data from database')
        console.log('  reset           Clear all data and re-run seeds')
        console.log('  list            List available seeds')
        console.log('')
        console.log('Examples:')
        console.log('  npm run db:seed run')
        console.log('  npm run db:seed run basic_data')
        console.log('  npm run db:seed list')
        break
    }

    closeDatabase()
  } catch (error) {
    console.error('Seed operation failed:', error)
    closeDatabase()
    process.exit(1)
  }
}

main()
