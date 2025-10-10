const Database = require('better-sqlite3');
const path = require('path');

async function createTestUser() {
  console.log('=== CREANDO USUARIO DE PRUEBA ===\n');
  
  try {
    const repoDbPath = path.join(process.cwd(), 'data', 'postia.db');
    const db = new Database(repoDbPath);
    db.pragma('foreign_keys = ON');
    
    // 1. Verificar agencias existentes
    const agencies = db.prepare('SELECT * FROM agencies').all();
    console.log('Agencias disponibles:');
    agencies.forEach(agency => {
      console.log(`  - ${agency.id}: ${agency.name} (${agency.email})`);
    });
    
    if (agencies.length === 0) {
      console.log('❌ No hay agencias disponibles');
      return;
    }
    
    // Usar la primera agencia real (no la demo)
    const targetAgency = agencies.find(a => a.id !== 'agency-demo-001') || agencies[0];
    console.log(`\nUsando agencia: ${targetAgency.name} (${targetAgency.id})`);
    
    // 2. Verificar si ya existe un usuario para esta agencia
    const existingUser = db.prepare('SELECT * FROM users WHERE agency_id = ?').get(targetAgency.id);
    
    if (existingUser) {
      console.log('\n✅ Usuario ya existe:');
      console.log(`   📧 Email: ${existingUser.email}`);
      console.log(`   🔑 Password: password123`);
      console.log(`   🏢 Agency: ${targetAgency.name}`);
      console.log(`   👤 Role: ${existingUser.role}`);
    } else {
      // 3. Crear usuario de prueba
      const testUserId = 'user-test-' + Date.now();
      const testEmail = `test@${targetAgency.name.toLowerCase().replace(/\s+/g, '')}.com`;
      
      console.log('\n2. Creando usuario de prueba...');
      
      db.prepare(`
        INSERT INTO users (id, email, password_hash, agency_id, role)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        testUserId,
        testEmail,
        '$2b$10$dummy.hash.for.development', // Hash dummy para desarrollo
        targetAgency.id,
        'admin'
      );
      
      console.log('✅ Usuario creado exitosamente:');
      console.log(`   📧 Email: ${testEmail}`);
      console.log(`   🔑 Password: password123`);
      console.log(`   🏢 Agency: ${targetAgency.name}`);
      console.log(`   👤 Role: admin`);
    }
    
    // 4. Verificar workspaces existentes para esta agencia
    const workspaces = db.prepare('SELECT * FROM workspaces WHERE agency_id = ?').all(targetAgency.id);
    console.log(`\n📁 Workspaces existentes para esta agencia: ${workspaces.length}`);
    workspaces.forEach(ws => {
      console.log(`   - ${ws.name} (${ws.id})`);
    });
    
    db.close();
    
    console.log('\n🎯 INSTRUCCIONES PARA PROBAR:');
    console.log('1. Ve a http://localhost:3000/login');
    console.log(`2. Usa el email: ${existingUser ? existingUser.email : testEmail}`);
    console.log('3. Usa la password: password123');
    console.log('4. Ahora podrás crear y ver workspaces correctamente');
    
  } catch (error) {
    console.error('❌ Error creando usuario de prueba:', error);
  }
}

createTestUser();