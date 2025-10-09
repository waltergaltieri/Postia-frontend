import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const Database = require('better-sqlite3')
    const path = require('path')
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'postia.db')
    
    const db = new Database(dbPath)
    
    console.log('RESET: Starting database reset...')
    
    // Delete all data from all tables (in correct order to respect foreign keys)
    const tables = [
      'publications',
      'campaigns', 
      'content_descriptions',
      'brand_manuals',
      'resources',
      'templates',
      'social_accounts',
      'workspaces',
      'users',
      'agencies'
    ]
    
    // Disable foreign key constraints temporarily
    db.pragma('foreign_keys = OFF')
    
    for (const table of tables) {
      try {
        db.prepare(`DELETE FROM ${table}`).run()
        console.log(`RESET: Cleared table ${table}`)
      } catch (error) {
        console.log(`RESET: Table ${table} might not exist, skipping...`)
      }
    }
    
    // Re-enable foreign key constraints
    db.pragma('foreign_keys = ON')
    
    console.log('RESET: All tables cleared')
    
    // Create your fresh account
    const timestamp = Date.now()
    const agencyId = `agency-fresh-${timestamp}`
    const userId = `user-fresh-${timestamp}`
    const now = new Date().toISOString()
    
    // Create new agency
    db.prepare(`
      INSERT INTO agencies (
        id, name, email, plan, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      agencyId,
      'Mi Agencia Limpia',
      'admin@miagencia.com',
      'pro',
      now,
      now
    )
    
    // Create new user
    db.prepare(`
      INSERT INTO users (
        id, agency_id, email, password_hash, role, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      userId,
      agencyId,
      'admin@miagencia.com',
      '$2b$10$dummy.hash.for.development',
      'admin',
      now,
      now
    )
    
    db.close()
    
    console.log('RESET: Fresh account created')
    
    return NextResponse.json({
      success: true,
      message: 'Base de datos limpiada y cuenta fresca creada',
      credentials: {
        email: 'admin@miagencia.com',
        password: 'password123'
      },
      accountDetails: {
        agencyId,
        userId,
        agencyName: 'Mi Agencia Limpia',
        plan: 'pro',
        role: 'admin'
      },
      instructions: [
        '1. Cierra sesión si estás logueado',
        '2. Usa las nuevas credenciales para hacer login',
        '3. Ahora tendrás una cuenta completamente limpia sin datos simulados',
        '4. Podrás crear espacios de trabajo desde cero'
      ]
    })
    
  } catch (error) {
    console.error('RESET: Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to reset database',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}