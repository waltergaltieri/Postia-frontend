import { ensureDatabaseInitialized } from './initializer'

/**
 * Auto-initialize database on module load
 * This ensures the database is ready when the application starts
 */
let isInitialized = false

export function autoInitializeDatabase(): void {
  if (isInitialized) {
    return
  }

  try {
    console.log('🔄 Auto-initializing database...')
    ensureDatabaseInitialized()
    
    // Ensure demo agency exists
    const { getDatabase } = require('./connection')
    const db = getDatabase()
    
    const demoAgency = db.prepare('SELECT * FROM agencies WHERE id = ?').get('agency-demo-001')
    if (!demoAgency) {
      console.log('Creating demo agency...')
      db.prepare(`
        INSERT INTO agencies (id, name, email, plan, credits, settings_notifications, settings_timezone, settings_language)
        VALUES ('agency-demo-001', 'Demo Agency', 'demo@postia.com', 'pro', 1000, 1, 'UTC', 'es')
      `).run()
      console.log('✅ Demo agency created')
    }
    
    isInitialized = true
    console.log('✅ Database auto-initialization completed')
  } catch (error) {
    console.error('❌ Database auto-initialization failed:', error)
    // Don't throw - let the app continue and handle errors gracefully
  }
}

// Auto-initialize when this module is imported
autoInitializeDatabase()