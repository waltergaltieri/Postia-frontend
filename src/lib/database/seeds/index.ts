import Database from 'better-sqlite3'

// Seed interface
export interface Seed {
  name: string
  description: string
  run: (db: Database.Database) => void
}

// Seed runner class
export class SeedRunner {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  /**
   * Run all seeds
   */
  runAll(seeds: Seed[]): void {
    console.log(`Running ${seeds.length} seed(s)...`)

    for (const seed of seeds) {
      console.log(`Running seed: ${seed.name} - ${seed.description}`)

      try {
        this.db.transaction(() => {
          seed.run(this.db)
        })()

        console.log(`✓ Seed ${seed.name} completed successfully`)
      } catch (error) {
        console.error(`✗ Seed ${seed.name} failed:`, error)
        throw error
      }
    }

    console.log('All seeds completed successfully')
  }

  /**
   * Run specific seed by name
   */
  runSeed(seeds: Seed[], seedName: string): void {
    const seed = seeds.find(s => s.name === seedName)

    if (!seed) {
      throw new Error(`Seed '${seedName}' not found`)
    }

    console.log(`Running seed: ${seed.name} - ${seed.description}`)

    try {
      this.db.transaction(() => {
        seed.run(this.db)
      })()

      console.log(`✓ Seed ${seed.name} completed successfully`)
    } catch (error) {
      console.error(`✗ Seed ${seed.name} failed:`, error)
      throw error
    }
  }

  /**
   * Clear all data from tables (for reset)
   */
  clearAllData(): void {
    console.log('Clearing all data...')

    this.db.transaction(() => {
      // Disable foreign key constraints temporarily
      this.db.pragma('foreign_keys = OFF')

      // Clear all tables in reverse dependency order
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

      for (const table of tables) {
        this.db.prepare(`DELETE FROM ${table}`).run()
        console.log(`✓ Cleared table: ${table}`)
      }

      // Re-enable foreign key constraints
      this.db.pragma('foreign_keys = ON')
    })()

    console.log('All data cleared successfully')
  }
}
