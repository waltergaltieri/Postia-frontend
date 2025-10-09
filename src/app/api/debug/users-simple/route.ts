import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const Database = require('better-sqlite3')
    const path = require('path')
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'postia.db')
    
    const db = new Database(dbPath, { readonly: true })
    
    // Get users with their agencies
    const users = db.prepare(`
      SELECT 
        u.id, 
        u.email, 
        u.role, 
        u.agency_id,
        a.name as agency_name
      FROM users u
      LEFT JOIN agencies a ON u.agency_id = a.id
      ORDER BY u.email
    `).all()
    
    db.close()
    
    // Format for easy reading
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      password: 'password123', // All users use this password in development
      role: user.role,
      agency: user.agency_name
    }))
    
    return NextResponse.json({
      success: true,
      users: formattedUsers,
      loginInstructions: {
        message: 'Use any of these emails with password "password123" to login',
        loginEndpoint: '/api/auth/login',
        method: 'POST',
        body: {
          email: 'user@example.com',
          password: 'password123'
        }
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}