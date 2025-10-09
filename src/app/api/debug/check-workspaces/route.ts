import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const Database = require('better-sqlite3')
    const path = require('path')
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'postia.db')
    
    const db = new Database(dbPath, { readonly: true })
    
    // Check all workspaces
    const workspaces = db.prepare(`
      SELECT w.id, w.name, w.agency_id, a.name as agency_name
      FROM workspaces w
      LEFT JOIN agencies a ON w.agency_id = a.id
      ORDER BY w.created_at DESC
    `).all()
    
    // Check all users
    const users = db.prepare(`
      SELECT u.id, u.email, u.role, u.agency_id, a.name as agency_name
      FROM users u
      LEFT JOIN agencies a ON u.agency_id = a.id
      ORDER BY u.created_at DESC
    `).all()
    
    db.close()
    
    return NextResponse.json({
      success: true,
      data: {
        workspaces,
        users,
        workspaceCount: workspaces.length,
        userCount: users.length
      },
      message: 'Database data retrieved successfully'
    })
  } catch (error) {
    console.error('Debug: Check workspaces failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Check workspaces failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}