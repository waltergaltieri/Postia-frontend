// Test para verificar que los endpoints de análisis funcionen correctamente

async function testAnalysisAPI() {
  console.log('🧪 Probando endpoints de análisis...');
  
  try {
    // Test 1: Obtener análisis de recursos
    console.log('\n1. 🔍 Probando /api/analyses/resources...');
    
    const resourceResponse = await fetch('http://localhost:3000/api/analyses/resources?resourceIds=52a97f43afb0af579a03e904a1e72315&workspaceId=e79674d300e9fdbc0d65002cb1106c5b');
    const resourceResult = await resourceResponse.json();
    
    console.log('📊 Respuesta de recursos:', {
      success: resourceResult.success,
      dataKeys: Object.keys(resourceResult.data || {}),
      message: resourceResult.message
    });
    
    if (resourceResult.success && Object.keys(resourceResult.data).length > 0) {
      const firstAnalysis = Object.values(resourceResult.data)[0];
      console.log('🤖 Primer análisis encontrado:', {
        resourceId: firstAnalysis.resourceId,
        description: firstAnalysis.visualAnalysis?.description?.substring(0, 100) + '...',
        mood: firstAnalysis.visualAnalysis?.mood,
        suggestedUse: firstAnalysis.visualAnalysis?.suggestedUse
      });
    }
    
    // Test 2: Obtener análisis de plantillas
    console.log('\n2. 🎨 Probando /api/analyses/templates...');
    
    const templateResponse = await fetch('http://localhost:3000/api/analyses/templates?templateIds=afac7832301337f0243a8b681b21cc4d&workspaceId=e79674d300e9fdbc0d65002cb1106c5b');
    const templateResult = await templateResponse.json();
    
    console.log('📊 Respuesta de plantillas:', {
      success: templateResult.success,
      dataKeys: Object.keys(templateResult.data || {}),
      message: templateResult.message
    });
    
    if (templateResult.success && Object.keys(templateResult.data).length > 0) {
      const firstAnalysis = Object.values(templateResult.data)[0];
      console.log('🎨 Primer análisis encontrado:', {
        templateId: firstAnalysis.templateId,
        layoutStrengths: firstAnalysis.semanticAnalysis?.layoutStrengths,
        textCapacity: firstAnalysis.semanticAnalysis?.textCapacity
      });
    }
    
    console.log('\n✅ Tests de API completados');
    
  } catch (error) {
    console.error('❌ Error probando API:', error.message);
  }
}

// Ejecutar solo si el servidor está corriendo
console.log('⚠️ IMPORTANTE: Asegúrate de que el servidor esté corriendo (npm run dev)');
console.log('📍 Probando endpoints en http://localhost:3000');

// testAnalysisAPI();

console.log('\n🔧 Para probar manualmente:');
console.log('1. Ejecuta: npm run dev');
console.log('2. Abre: http://localhost:3000/api/analyses/resources?resourceIds=52a97f43afb0af579a03e904a1e72315&workspaceId=e79674d300e9fdbc0d65002cb1106c5b');
console.log('3. Abre: http://localhost:3000/api/analyses/templates?templateIds=afac7832301337f0243a8b681b21cc4d&workspaceId=e79674d300e9fdbc0d65002cb1106c5b');