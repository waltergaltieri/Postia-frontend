import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const Database = require('better-sqlite3')
    const path = require('path')
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'postia.db')
    
    const db = new Database(dbPath, { readonly: true })
    
    // Get sample users
    const users = db.prepare(`
      SELECT u.id, u.email, u.role, a.name as agency_name, a.plan 
      FROM users u 
      LEFT JOIN agencies a ON u.agency_id = a.id 
      LIMIT 10
    `).all()
    
    db.close()
    
    return NextResponse.json({
      success: true,
      users,
      message: 'Sample users retrieved successfully'
    })
  } catch (error) {
    console.error('Debug: Users test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Users test failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}