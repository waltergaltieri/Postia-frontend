import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const Database = require('better-sqlite3')
    const path = require('path')
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'postia.db')
    
    const db = new Database(dbPath, { readonly: true })
    
    // Get all users
    const users = db.prepare(`
      SELECT u.id, u.email, u.role, u.agency_id, a.name as agency_name
      FROM users u
      LEFT JOIN agencies a ON u.agency_id = a.id
      ORDER BY u.created_at DESC
    `).all()
    
    // Get all agencies
    const agencies = db.prepare(`
      SELECT id, name, email, plan
      FROM agencies
      ORDER BY created_at DESC
    `).all()
    
    db.close()
    
    return NextResponse.json({
      success: true,
      users,
      agencies,
      userCount: users.length,
      agencyCount: agencies.length
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}