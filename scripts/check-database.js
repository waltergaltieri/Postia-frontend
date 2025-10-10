const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

// Import migrations
const { migrations } = require('../src/lib/database/migrations/registry.ts')
const { MigrationRunner } = require('../src/lib/database/migrations/index.ts')

async function checkDatabase() {
  try {
    console.log('🔍 Checking database structure...')
    
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'postia.db')
    console.log('📁 Database path:', dbPath)
    
    // Ensure data directory exists
    const dataDir = path.dirname(dbPath)
    if (!fs.existsSync(dataDir)) {
      console.log('📁 Creating data directory...')
      fs.mkdirSync(dataDir, { recursive: true })
    }
    
    const db = new Database(dbPath)
    
    // Initialize migration runner
    const migrationRunner = new MigrationRunner(db)
    
    // Check current migration status
    console.log('\n📊 Migration Status:')
    migrationRunner.getStatus(migrations)
    
    // Run pending migrations
    console.log('\n🚀 Running pending migrations...')
    migrationRunner.migrateUp(migrations)
    
    // Get all tables
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all()
    
    console.log('\n📋 Tables found:', tables.map(t => t.name))
    
    // Check for expected tables
    const expectedTables = [
      'agencies',
      'users', 
      'workspaces',
      'social_accounts',
      'resources',
      'templates',
      'campaigns',
      'campaign_resources',
      'campaign_templates',
      'publications',
      'content_descriptions',
      'brand_manuals',
      'migrations'
    ]
    
    const missingTables = expectedTables.filter(
      table => !tables.some(t => t.name === table)
    )
    
    if (missingTables.length > 0) {
      console.log('❌ Missing tables:', missingTables)
    } else {
      console.log('✅ All expected tables present')
    }
    
    // Check for sample data
    console.log('\n📊 Data counts:')
    for (const table of tables) {
      if (table.name !== 'migrations') {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get()
        console.log(`  ${table.name}: ${count.count} records`)
      }
    }
    
    db.close()
    console.log('\n✅ Database check complete!')
    
  } catch (error) {
    console.error('❌ Database check failed:', error)
    process.exit(1)
  }
}

checkDatabase()