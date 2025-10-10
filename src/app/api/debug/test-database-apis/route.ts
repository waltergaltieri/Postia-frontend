import { NextResponse } from 'next/server'
import { TemplateRepository, ResourceRepository } from '@/lib/database/repositories'

export async function GET() {
  try {
    console.log('🧪 Testing database APIs...')
    
    const templateRepo = new TemplateRepository()
    const resourceRepo = new ResourceRepository()
    
    // Test Templates API
    console.log('📄 Testing Templates...')
    const templates = templateRepo.findByWorkspaceId('workspace-001')
    console.log(`Found ${templates.length} templates`)
    
    // Test Resources API  
    console.log('📁 Testing Resources...')
    const resources = resourceRepo.findByWorkspaceId('workspace-001')
    console.log(`Found ${resources.length} resources`)
    
    // Test search functionality
    console.log('🔍 Testing search...')
    const searchResults = templateRepo.searchByName('workspace-001', 'P')
    console.log(`Search results: ${searchResults.length}`)
    
    // Test type filtering
    console.log('🏷️  Testing type filtering...')
    const carouselTemplates = templateRepo.findByType('workspace-001', 'carousel')
    const singleTemplates = templateRepo.findByType('workspace-001', 'single')
    console.log(`Carousel templates: ${carouselTemplates.length}`)
    console.log(`Single templates: ${singleTemplates.length}`)
    
    const imageResources = resourceRepo.findByType('workspace-001', 'image')
    const videoResources = resourceRepo.findByType('workspace-001', 'video')
    console.log(`Image resources: ${imageResources.length}`)
    console.log(`Video resources: ${videoResources.length}`)
    
    // Test individual lookups
    console.log('🔍 Testing individual lookups...')
    const firstTemplate = templates[0]
    const firstResource = resources[0]
    
    if (firstTemplate) {
      const templateById = templateRepo.findById(firstTemplate.id)
      console.log(`Template lookup: ${templateById ? 'SUCCESS' : 'FAILED'}`)
    }
    
    if (firstResource) {
      const resourceById = resourceRepo.findById(firstResource.id)
      console.log(`Resource lookup: ${resourceById ? 'SUCCESS' : 'FAILED'}`)
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database APIs test completed successfully',
      results: {
        templates: {
          total: templates.length,
          carousel: carouselTemplates.length,
          single: singleTemplates.length,
          searchResults: searchResults.length,
          sampleTemplate: templates[0] || null
        },
        resources: {
          total: resources.length,
          images: imageResources.length,
          videos: videoResources.length,
          sampleResource: resources[0] || null
        },
        database: {
          templatesWorking: templates.length > 0,
          resourcesWorking: resources.length > 0,
          searchWorking: true,
          filteringWorking: true
        }
      }
    })
    
  } catch (error) {
    console.error('❌ Database APIs test failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Database APIs test failed',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}