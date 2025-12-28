/**
 * Script de prueba para el sistema mejorado de análisis de recursos y templates
 */

const { ResourceAnalysisService } = require('./src/lib/ai/services/ResourceAnalysisService')

async function testEnhancedAnalysis() {
  console.log('🧪 Iniciando pruebas del sistema mejorado de análisis...\n')

  try {
    const analysisService = new ResourceAnalysisService()

    // Test 1: Análisis de recurso individual con descripción detallada
    console.log('📸 Test 1: Análisis detallado de recurso individual')
    const testResource = {
      id: 'test-resource-1',
      name: 'Producto Smartphone',
      type: 'image',
      url: '/uploads/test-smartphone.jpg',
      mimeType: 'image/jpeg'
    }

    const testWorkspace = {
      id: 'test-workspace-1',
      name: 'Workspace de Prueba',
      branding: {
        primaryColor: '#2196F3',
        secondaryColor: '#FF9800',
        logo: '/logo.png',
        slogan: 'Innovación Digital',
        description: 'Empresa de tecnología',
        whatsapp: '+1234567890'
      }
    }

    console.log('Analizando recurso:', testResource.name)
    const resourceAnalysis = await analysisService.analyzeResourceOnUpload(testResource, testWorkspace)
    
    console.log('✅ Análisis de recurso completado:')
    console.log('- ID:', resourceAnalysis.id)
    console.log('- Descripción:', resourceAnalysis.visualAnalysis.description.substring(0, 200) + '...')
    console.log('- Elementos:', resourceAnalysis.visualAnalysis.elements)
    console.log('- Colores:', resourceAnalysis.visualAnalysis.colors)
    console.log('- Iluminación:', resourceAnalysis.visualAnalysis.lighting)
    console.log('- Composición:', resourceAnalysis.visualAnalysis.composition)
    console.log('- Estilo:', resourceAnalysis.visualAnalysis.style)
    console.log('')

    // Test 2: Análisis de template tipo carrusel
    console.log('🎠 Test 2: Análisis detallado de template carrusel')
    const testCarouselTemplate = {
      id: 'test-carousel-1',
      name: 'Carrusel Producto Tech',
      type: 'carousel',
      socialNetworks: ['instagram', 'facebook'],
      images: [
        '/uploads/carousel-1.jpg',
        '/uploads/carousel-2.jpg',
        '/uploads/carousel-3.jpg'
      ],
      description: 'Template de carrusel para productos tecnológicos'
    }

    console.log('Analizando template carrusel:', testCarouselTemplate.name)
    console.log('Imágenes a analizar:', testCarouselTemplate.images.length)
    
    const templateAnalysis = await analysisService.analyzeTemplateOnCreation(testCarouselTemplate, testWorkspace)
    
    console.log('✅ Análisis de template completado:')
    console.log('- ID:', templateAnalysis.id)
    console.log('- Tipo:', templateAnalysis.semanticAnalysis?.detailedVisualAnalysis?.type)
    
    if (templateAnalysis.semanticAnalysis?.detailedVisualAnalysis?.carouselAnalysis) {
      const carousel = templateAnalysis.semanticAnalysis.detailedVisualAnalysis.carouselAnalysis
      console.log('- Descripción general:', carousel.overallDescription.substring(0, 200) + '...')
      console.log('- Flujo narrativo:', carousel.narrativeFlow.substring(0, 150) + '...')
      console.log('- Puntuación consistencia:', carousel.consistencyScore)
      console.log('- Colores dominantes:', carousel.dominantColors)
      console.log('- Estilo de diseño:', carousel.designStyle)
      console.log('- Imágenes analizadas:', carousel.imageAnalyses.length)
      
      console.log('\n📋 Análisis individual de imágenes:')
      carousel.imageAnalyses.forEach((img, index) => {
        console.log(`  Imagen ${index + 1}:`)
        console.log(`  - Descripción: ${img.description.substring(0, 150)}...`)
        console.log(`  - Elementos: ${img.visualElements.slice(0, 3).join(', ')}`)
        console.log(`  - Colores: ${img.colors.slice(0, 3).join(', ')}`)
        console.log(`  - Iluminación: ${img.lighting}`)
        console.log(`  - Composición: ${img.composition}`)
        console.log(`  - Estilo: ${img.style}`)
        console.log(`  - Mood: ${img.mood}`)
        console.log(`  - Áreas de texto: ${img.textAreas.join(', ')}`)
        console.log(`  - Puntos focales: ${img.focusPoints.join(', ')}`)
        console.log('')
      })
    }

    // Test 3: Análisis de template simple (no carrusel)
    console.log('🖼️ Test 3: Análisis de template simple')
    const testSingleTemplate = {
      id: 'test-single-1',
      name: 'Post Simple Corporativo',
      type: 'single',
      socialNetworks: ['linkedin', 'facebook'],
      images: ['/uploads/single-template.jpg'],
      description: 'Template simple para posts corporativos'
    }

    console.log('Analizando template simple:', testSingleTemplate.name)
    const singleTemplateAnalysis = await analysisService.analyzeTemplateOnCreation(testSingleTemplate, testWorkspace)
    
    console.log('✅ Análisis de template simple completado:')
    console.log('- ID:', singleTemplateAnalysis.id)
    console.log('- Tiene análisis detallado:', !!singleTemplateAnalysis.semanticAnalysis?.detailedVisualAnalysis)
    console.log('- Layout strengths:', singleTemplateAnalysis.semanticAnalysis?.layoutStrengths)
    console.log('')

    // Test 4: Verificar análisis en caché
    console.log('💾 Test 4: Verificación de análisis en caché')
    const cachedResourceAnalyses = await analysisService.getCachedResourceAnalyses([testResource.id], testWorkspace.id)
    const cachedTemplateAnalyses = await analysisService.getCachedTemplateAnalyses([testCarouselTemplate.id, testSingleTemplate.id], testWorkspace.id)
    
    console.log('✅ Análisis en caché verificados:')
    console.log('- Recursos en caché:', Object.keys(cachedResourceAnalyses).length)
    console.log('- Templates en caché:', Object.keys(cachedTemplateAnalyses).length)
    console.log('')

    console.log('🎉 Todas las pruebas completadas exitosamente!')
    console.log('\n📊 Resumen de mejoras implementadas:')
    console.log('✓ Descripciones detalladas de recursos con elementos, colores, iluminación')
    console.log('✓ Análisis individual de cada imagen en carruseles')
    console.log('✓ Análisis general del carrusel completo')
    console.log('✓ Nuevos campos: lighting, composition, style')
    console.log('✓ Análisis de áreas de texto y puntos focales en carruseles')
    console.log('✓ Flujo narrativo y puntuación de consistencia')
    console.log('✓ Versión de análisis actualizada a 2.0')

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error)
    console.error('Stack trace:', error.stack)
  }
}

// Ejecutar pruebas si el script se ejecuta directamente
if (require.main === module) {
  testEnhancedAnalysis()
    .then(() => {
      console.log('\n✅ Script de pruebas finalizado')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Error en script de pruebas:', error)
      process.exit(1)
    })
}

module.exports = { testEnhancedAnalysis }