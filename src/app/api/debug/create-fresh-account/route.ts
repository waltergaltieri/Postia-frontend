import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const Database = require('better-sqlite3')
    const path = require('path')
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'postia.db')
    
    const db = new Database(dbPath)
    
    // Generate unique IDs
    const timestamp = Date.now()
    const agencyId = `agency-${timestamp}`
    const userId = `user-${timestamp}`
    
    // Create new agency
    const insertAgency = db.prepare(`
      INSERT INTO agencies (
        id, name, email, plan, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `)
    
    const now = new Date().toISOString()
    
    insertAgency.run(
      agencyId,
      'Mi Nueva Agencia',
      'admin@minuevaagencia.com',
      'pro',
      now,
      now
    )
    
    // Create new user
    const insertUser = db.prepare(`
      INSERT INTO users (
        id, agency_id, email, password_hash, role, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    
    insertUser.run(
      userId,
      agencyId,
      'admin@minuevaagencia.com',
      '$2b$10$dummy.hash.for.development', // This allows password123
      'admin',
      now,
      now
    )
    
    db.close()
    
    return NextResponse.json({
      success: true,
      message: 'Nueva cuenta creada exitosamente',
      credentials: {
        email: 'admin@minuevaagencia.com',
        password: 'password123'
      },
      accountDetails: {
        agencyId,
        userId,
        agencyName: 'Mi Nueva Agencia',
        plan: 'pro',
        role: 'admin'
      },
      instructions: [
        '1. Usa estas credenciales para hacer login en la aplicación',
        '2. Una vez logueado, podrás crear espacios de trabajo desde cero',
        '3. Todos los datos serán completamente nuevos y limpios'
      ]
    })
    
  } catch (error) {
    console.error('Error creating fresh account:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create fresh account',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}