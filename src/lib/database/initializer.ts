import { getDatabase, initializeDatabase } from './connection'
import { migration001InitialSchema } from './migrations/001_initial_schema'
import { MigrationRunner } from './migrations'

/**
 * Initialize database with schema and demo data if needed
 */
export function ensureDatabaseInitialized(): void {
  try {
    let db
    try {
      db = getDatabase()
    } catch (error) {
      // Database not initialized, initialize it
      db = initializeDatabase()
    }

    // Check if tables exist by trying to query agencies table
    try {
      db.prepare('SELECT COUNT(*) FROM agencies').get()
    } catch (error) {
      // Tables don't exist, run migrations
      console.log('Database tables not found, initializing schema...')
      
      const migrationRunner = new MigrationRunner(db)
      migrationRunner.migrateUp([migration001InitialSchema])
      
      // Create demo agency if none exists
      const agencyCount = db.prepare('SELECT COUNT(*) as count FROM agencies').get() as { count: number }
      if (agencyCount.count === 0) {
        console.log('Creating demo agency...')
        db.prepare(`
          INSERT INTO agencies (id, name, email, plan)
          VALUES ('agency-demo-001', 'Demo Agency', 'demo@postia.com', 'pro')
        `).run()
        console.log('✓ Demo agency created')
      }
      
      console.log('✅ Database initialized successfully!')
    }
  } catch (error) {
    console.error('❌ Error ensuring database initialization:', error)
    throw error
  }
}

/**
 * Check if database is properly initialized
 */
export function isDatabaseInitialized(): boolean {
  try {
    const db = getDatabase()
    
    // Check if key tables exist
    const tables = ['agencies', 'workspaces', 'users']
    for (const table of tables) {
      try {
        db.prepare(`SELECT 1 FROM ${table} LIMIT 1`).get()
      } catch (error) {
        return false
      }
    }
    
    return true
  } catch (error) {
    return false
  }
}