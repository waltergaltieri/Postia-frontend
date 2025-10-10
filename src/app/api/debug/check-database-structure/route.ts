import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('DEBUG: Checking database structure...')
    
    const Database = require('better-sqlite3')
    const path = require('path')
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'postia.db')
    
    const db = new Database(dbPath, { readonly: true })
    
    // Get all tables
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all()
    
    console.log('DEBUG: Tables found:', tables.map(t => t.name))
    
    // Get migration status
    const migrations = db.prepare(`
      SELECT version, description, applied_at 
      FROM migrations 
      ORDER BY version
    `).all()
    
    console.log('DEBUG: Migrations applied:', migrations)
    
    // Check each table structure
    const tableStructures = {}
    for (const table of tables) {
      const columns = db.prepare(`PRAGMA table_info(${table.name})`).all()
      tableStructures[table.name] = columns
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
      'brand_manuals',
      'migrations'
    ]
    
    const missingTables = expectedTables.filter(
      table => !tables.some(t => t.name === table)
    )
    
    // Check for sample data
    const sampleData = {}
    for (const table of tables) {
      if (table.name !== 'migrations') {
        const count = db.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get()
        sampleData[table.name] = count.count
      }
    }
    
    db.close()
    
    return NextResponse.json({
      success: true,
      database: {
        path: dbPath,
        tablesFound: tables.map(t => t.name),
        missingTables,
        migrationsApplied: migrations,
        tableStructures,
        sampleData
      },
      analysis: {
        databaseExists: true,
        migrationsComplete: migrations.length >= 2,
        allTablesPresent: missingTables.length === 0,
        hasData: Object.values(sampleData).some(count => count > 0)
      }
    })
    
  } catch (error) {
    console.error('DEBUG: Database structure check failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Database structure check failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}