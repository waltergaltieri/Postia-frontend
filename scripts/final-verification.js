const Database = require('better-sqlite3');
const path = require('path');

async function finalVerification() {
  console.log('=== VERIFICACIÓN FINAL DEL SISTEMA ===\n');
  
  try {
    // 1. Verificar base de datos del repositorio
    console.log('1. Verificando base de datos del repositorio...');
    const repoDbPath = path.join(process.cwd(), 'data', 'postia.db');
    const repoDb = new Database(repoDbPath);
    
    // Verificar tablas esenciales
    const essentialTables = ['agencies', 'workspaces', 'users'];
    for (const table of essentialTables) {
      const exists = repoDb.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name = ?
      `).get(table);
      
      if (exists) {
        console.log(`   ✅ Tabla ${table} existe`);
      } else {
        console.log(`   ❌ Tabla ${table} NO existe`);
        return false;
      }
    }
    
    // Verificar agencia demo
    const demoAgency = repoDb.prepare('SELECT * FROM agencies WHERE id = ?').get('agency-demo-001');
    if (demoAgency) {
      console.log('   ✅ Agencia demo existe');
    } else {
      console.log('   ❌ Agencia demo NO existe');
      return false;
    }
    
    // Contar workspaces
    const workspaceCount = repoDb.prepare('SELECT COUNT(*) as count FROM workspaces WHERE agency_id = ?').get('agency-demo-001');
    console.log(`   ✅ Workspaces de la agencia demo: ${workspaceCount.count}`);
    
    repoDb.close();
    
    // 2. Probar repositorio
    console.log('\n2. Probando WorkspaceRepository...');
    const { WorkspaceRepository } = require('../src/lib/database/repositories/WorkspaceRepository.ts');
    
    const workspaceRepo = new WorkspaceRepository();
    
    // Listar workspaces existentes
    const existingWorkspaces = workspaceRepo.findByAgencyId('agency-demo-001');
    console.log(`   ✅ Workspaces encontrados: ${existingWorkspaces.length}`);
    
    // Crear un workspace de prueba
    const testWorkspace = {
      agencyId: 'agency-demo-001',
      name: 'Workspace Final Test ' + Date.now(),
      branding: {
        primaryColor: '#9333ea',
        secondaryColor: '#737373',
        logo: '',
        slogan: 'Test final',
        description: 'Verificación final del sistema',
        whatsapp: '',
      },
    };
    
    const newWorkspace = workspaceRepo.create(testWorkspace);
    console.log(`   ✅ Workspace creado exitosamente: ${newWorkspace.name}`);
    
    // 3. Probar API endpoints
    console.log('\n3. Probando endpoints de la API...');
    const { GET, POST } = require('../src/app/api/workspaces/route.ts');
    
    // Test GET
    const getUrl = new URL('http://localhost:3000/api/workspaces?agencyId=agency-demo-001');
    const getRequest = new Request(getUrl);
    const getResponse = await GET(getRequest);
    
    if (getResponse.status === 200) {
      console.log('   ✅ GET /api/workspaces funciona correctamente');
    } else {
      console.log('   ❌ GET /api/workspaces falló');
      return false;
    }
    
    // Test POST
    const postUrl = new URL('http://localhost:3000/api/workspaces');
    const postRequest = new Request(postUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'API Final Test ' + Date.now(),
        branding: {
          primaryColor: '#9333ea',
          secondaryColor: '#737373',
          slogan: 'API test final',
          description: 'Prueba final de la API'
        }
      })
    });
    
    const postResponse = await POST(postRequest);
    
    if (postResponse.status === 201) {
      console.log('   ✅ POST /api/workspaces funciona correctamente');
    } else {
      console.log('   ❌ POST /api/workspaces falló');
      return false;
    }
    
    console.log('\n🎉 ¡TODAS LAS VERIFICACIONES PASARON EXITOSAMENTE!');
    console.log('\n📋 RESUMEN DE LA SOLUCIÓN:');
    console.log('   • Base de datos inicializada correctamente');
    console.log('   • Agencia demo creada y disponible');
    console.log('   • WorkspaceRepository funcionando');
    console.log('   • Endpoints de API operativos');
    console.log('   • Error 500 solucionado');
    
    console.log('\n✅ El sistema está listo para crear espacios de trabajo sin errores.');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ ERROR EN LA VERIFICACIÓN:', error.message);
    console.error('Stack:', error.stack);
    return false;
  }
}

finalVerification().then(success => {
  if (success) {
    console.log('\n🚀 Sistema verificado y funcionando correctamente!');
  } else {
    console.log('\n💥 Hay problemas que necesitan ser resueltos.');
  }
});