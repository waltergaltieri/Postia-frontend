import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('Simple DB test called')
    
    const Database = require('better-sqlite3')
    const path = require('path')
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'postia.db')
    
    console.log('Database path:', dbPath)
    
    const db = new Database(dbPath, { readonly: true })
    
    // Simple query
    const templateCount = db.prepare('SELECT COUNT(*) as count FROM templates').get()
    const resourceCount = db.prepare('SELECT COUNT(*) as count FROM resources').get()
    
    db.close()
    
    return NextResponse.json({
      success: true,
      message: 'Simple DB test successful',
      data: {
        templates: templateCount.count,
        resources: resourceCount.count
      }
    })
    
  } catch (error) {
    console.error('Simple DB test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Simple DB test failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}