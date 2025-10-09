import { NextResponse } from 'next/server'
import { WorkspaceService } from '@/lib/database/services'

export async function GET() {
  try {
    console.log('Debug: Starting workspace test...')
    
    // Test 1: Check database connection
    const Database = require('better-sqlite3')
    const path = require('path')
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'postia.db')
    console.log('Debug: Database path:', dbPath)
    
    try {
      const db = new Database(dbPath, { readonly: true })
      console.log('Debug: Database connection successful')
      
      // Check if workspaces table exists
      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='workspaces'").all()
      console.log('Debug: Workspaces table exists:', tables.length > 0)
      
      if (tables.length > 0) {
        // Check workspace data
        const workspaces = db.prepare("SELECT id, name, agency_id FROM workspaces LIMIT 5").all()
        console.log('Debug: Sample workspaces:', workspaces)
      }
      
      db.close()
    } catch (dbError) {
      console.error('Debug: Database error:', dbError)
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        details: dbError instanceof Error ? dbError.message : String(dbError)
      }, { status: 500 })
    }
    
    // Test 2: Can we create a WorkspaceService instance?
    const workspaceService = new WorkspaceService()
    console.log('Debug: WorkspaceService created successfully')
    
    // Test 3: Can we call a simple method?
    try {
      const result = workspaceService.validateWorkspaceName('test-agency', 'test-workspace')
      console.log('Debug: validateWorkspaceName result:', result)
    } catch (error) {
      console.error('Debug: validateWorkspaceName error:', error)
      return NextResponse.json({
        success: false,
        error: 'validateWorkspaceName failed',
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'Workspace service test passed',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Debug: Workspace test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Workspace test failed',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}