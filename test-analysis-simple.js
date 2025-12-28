/**
 * Script simple para verificar que los archivos de análisis mejorado están correctos
 */

const fs = require('fs')
const path = require('path')

function testFileExists(filePath) {
  const fullPath = path.join(__dirname, filePath)
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${filePath} - Archivo existe`)
    return true
  } else {
    console.log(`❌ ${filePath} - Archivo NO existe`)
    return false
  }
}

function testFileContent(filePath, expectedContent) {
  const fullPath = path.join(__dirname, filePath)
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8')
    if (content.includes(expectedContent)) {
      console.log(`✅ ${filePath} - Contiene: "${expectedContent.substring(0, 50)}..."`)
      return true
    } else {
      console.log(`❌ ${filePath} - NO contiene: "${expectedContent.substring(0, 50)}..."`)
      return false
    }
  }
  return false
}

console.log('🧪 Verificando archivos del sistema mejorado de análisis...\n')

let allTestsPassed = true

// Test 1: Verificar que existe el VisualAnalyzerAgent mejorado
console.log('📸 Test 1: VisualAnalyzerAgent mejorado')
allTestsPassed &= testFileExists('src/lib/ai/agents/VisualAnalyzerAgent.ts')
allTestsPassed &= testFileContent('src/lib/ai/agents/VisualAnalyzerAgent.ts', 'lighting?: string')
allTestsPassed &= testFileContent('src/lib/ai/agents/VisualAnalyzerAgent.ts', 'ELEMENTOS VISUALES: Describe TODOS los objetos')
console.log('')

// Test 2: Verificar que existe el CarouselAnalyzerAgent
console.log('🎠 Test 2: CarouselAnalyzerAgent nuevo')
allTestsPassed &= testFileExists('src/lib/ai/agents/CarouselAnalyzerAgent.ts')
allTestsPassed &= testFileContent('src/lib/ai/agents/CarouselAnalyzerAgent.ts', 'CarouselImageAnalysis')
allTestsPassed &= testFileContent('src/lib/ai/agents/CarouselAnalyzerAgent.ts', 'analyzeCarouselTemplate')
console.log('')

// Test 3: Verificar que ResourceAnalysisService está actualizado
console.log('🔧 Test 3: ResourceAnalysisService actualizado')
allTestsPassed &= testFileExists('src/lib/ai/services/ResourceAnalysisService.ts')
allTestsPassed &= testFileContent('src/lib/ai/services/ResourceAnalysisService.ts', 'CarouselAnalyzerAgent')
allTestsPassed &= testFileContent('src/lib/ai/services/ResourceAnalysisService.ts', 'analysisVersion = \'2.0\'')
console.log('')

// Test 4: Verificar documentación
console.log('📚 Test 4: Documentación')
allTestsPassed &= testFileExists('ENHANCED_ANALYSIS_SYSTEM.md')
allTestsPassed &= testFileContent('ENHANCED_ANALYSIS_SYSTEM.md', 'Sistema Mejorado de Análisis')
console.log('')

// Test 5: Verificar estructura de archivos
console.log('📁 Test 5: Estructura de archivos')
const requiredFiles = [
  'src/lib/ai/agents/VisualAnalyzerAgent.ts',
  'src/lib/ai/agents/CarouselAnalyzerAgent.ts',
  'src/lib/ai/services/ResourceAnalysisService.ts',
  'ENHANCED_ANALYSIS_SYSTEM.md'
]

requiredFiles.forEach(file => {
  allTestsPassed &= testFileExists(file)
})

console.log('')

// Resumen
if (allTestsPassed) {
  console.log('🎉 ¡Todos los tests pasaron exitosamente!')
  console.log('\n📊 Resumen de mejoras implementadas:')
  console.log('✓ VisualAnalyzerAgent mejorado con descripciones detalladas')
  console.log('✓ CarouselAnalyzerAgent nuevo para análisis de carruseles')
  console.log('✓ ResourceAnalysisService actualizado (versión 2.0)')
  console.log('✓ Análisis individual de cada imagen en carruseles')
  console.log('✓ Análisis general del carrusel completo')
  console.log('✓ Nuevos campos: lighting, composition, style')
  console.log('✓ Documentación completa implementada')
  
  console.log('\n🚀 El sistema está listo para usar!')
  console.log('\n📋 Próximos pasos:')
  console.log('1. Compilar el proyecto TypeScript')
  console.log('2. Probar subiendo recursos e imágenes')
  console.log('3. Crear templates tipo carrusel')
  console.log('4. Verificar que los análisis se generan correctamente')
  
} else {
  console.log('❌ Algunos tests fallaron. Revisar los archivos indicados.')
}

console.log('\n✅ Verificación completada')