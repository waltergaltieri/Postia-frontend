import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('DEBUG DB: Testing direct database access...')
    
    const Database = require('better-sqlite3')
    const path = require('path')
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'postia.db')
    
    console.log('DEBUG DB: Database path:', dbPath)
    
    const db = new Database(dbPath, { readonly: true })
    
    // Test query for the user we just created
    const user = db.prepare(`
      SELECT id, email, password_hash, role, agency_id 
      FROM users 
      WHERE email = ?
    `).get('admin@minuevaagencia.com')
    
    console.log('DEBUG DB: User found:', user)
    
    db.close()
    
    return NextResponse.json({
      success: true,
      user: user || null,
      message: user ? 'User found in database' : 'User not found in database'
    })
    
  } catch (error) {
    console.error('DEBUG DB: Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Database test failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}