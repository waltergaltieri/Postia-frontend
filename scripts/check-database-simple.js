const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

function checkDatabase() {
  try {
    console.log('🔍 Checking database structure...')
    
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'postia.db')
    console.log('📁 Database path:', dbPath)
    
    // Check if database exists
    if (!fs.existsSync(dbPath)) {
      console.log('❌ Database file does not exist!')
      return
    }
    
    const db = new Database(dbPath, { readonly: true })
    
    // Get all tables
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all()
    
    console.log('\n📋 Tables found:', tables.map(t => t.name))
    
    // Check migration status
    try {
      const migrations = db.prepare(`
        SELECT version, description, applied_at 
        FROM migrations 
        ORDER BY version
      `).all()
      
      console.log('\n📊 Migrations applied:')
      migrations.forEach(m => {
        console.log(`  v${m.version}: ${m.description} (${m.applied_at})`)
      })
    } catch (error) {
      console.log('⚠️  No migrations table found')
    }
    
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
      'brand_manuals'
    ]
    
    const missingTables = expectedTables.filter(
      table => !tables.some(t => t.name === table)
    )
    
    if (missingTables.length > 0) {
      console.log('\n❌ Missing tables:', missingTables)
    } else {
      console.log('\n✅ All expected tables present')
    }
    
    // Check for sample data
    console.log('\n📊 Data counts:')
    for (const table of tables) {
      if (table.name !== 'migrations') {
        try {
          const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get()
          console.log(`  ${table.name}: ${count.count} records`)
        } catch (error) {
          console.log(`  ${table.name}: Error reading (${error.message})`)
        }
      }
    }
    
    // Check table structures for key tables
    console.log('\n🏗️  Table structures:')
    const keyTables = ['resources', 'templates', 'campaigns']
    for (const tableName of keyTables) {
      if (tables.some(t => t.name === tableName)) {
        console.log(`\n  ${tableName}:`)
        const columns = db.prepare(`PRAGMA table_info(${tableName})`).all()
        columns.forEach(col => {
          console.log(`    ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`)
        })
      }
    }
    
    db.close()
    console.log('\n✅ Database check complete!')
    
  } catch (error) {
    console.error('❌ Database check failed:', error)
  }
}

checkDatabase()