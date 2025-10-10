import { NextResponse } from 'next/server'

export async function GET() {
  try {
    console.log('Testing TemplateRepository import...')
    
    // Import directly
    const { TemplateRepository } = await import('@/lib/database/repositories/TemplateRepository')
    
    console.log('TemplateRepository imported successfully')
    
    const templateRepo = new TemplateRepository()
    console.log('TemplateRepository instantiated successfully')
    
    const templates = templateRepo.findAll()
    console.log('Templates found:', templates.length)
    
    return NextResponse.json({
      success: true,
      message: 'TemplateRepository test successful',
      data: {
        templatesCount: templates.length,
        templates: templates
      }
    })
    
  } catch (error) {
    console.error('TemplateRepository test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'TemplateRepository test failed',
      details: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}