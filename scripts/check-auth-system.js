const Database = require('better-sqlite3');
const path = require('path');

async function checkAuthSystem() {
  console.log('=== VERIFICANDO SISTEMA DE AUTENTICACIÓN ===\n');
  
  try {
    // 1. Verificar base de datos
    const repoDbPath = path.join(process.cwd(), 'data', 'postia.db');
    const db = new Database(repoDbPath);
    db.pragma('foreign_keys = ON');
    
    console.log('1. Verificando usuarios en la base de datos...');
    
    // Verificar tabla users
    const users = db.prepare('SELECT * FROM users').all();
    console.log(`   Usuarios encontrados: ${users.length}`);
    
    if (users.length === 0) {
      console.log('   ❌ No hay usuarios en la base de datos');
      
      // Verificar si hay agencias
      const agencies = db.prepare('SELECT * FROM agencies').all();
      console.log(`   Agencias disponibles: ${agencies.length}`);
      
      if (agencies.length > 0) {
        console.log('\n2. Creando usuario de prueba...');
        
        // Crear un usuario de prueba
        const testUserId = 'user-test-' + Date.now();
        const agencyId = agencies[0].id; // Usar la primera agencia
        
        db.prepare(`
          INSERT INTO users (id, email, password_hash, agency_id, role)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          testUserId,
          'test@postia.com',
          '$2b$10$dummy.hash.for.development', // Hash dummy para desarrollo
          agencyId,
          'admin'
        );
        
        console.log(`   ✅ Usuario creado: test@postia.com (ID: ${testUserId})`);
        console.log(`   📧 Email: test@postia.com`);
        console.log(`   🔑 Password: password123`);
        console.log(`   🏢 Agency: ${agencyId}`);
      } else {
        console.log('   ❌ No hay agencias disponibles para crear usuario');
      }
    } else {
      console.log('   ✅ Usuarios existentes:');
      users.forEach(user => {
        console.log(`     - ${user.email} (${user.role}) - Agency: ${user.agency_id}`);
      });
    }
    
    // 3. Probar AuthService
    console.log('\n3. Probando AuthService...');
    
    try {
      const { AuthService } = require('../src/lib/database/services/AuthService.ts');
      
      // Obtener todos los usuarios
      const allUsers = db.prepare('SELECT * FROM users').all();
      
      if (allUsers.length > 0) {
        const testUser = allUsers[0];
        console.log(`   Probando con usuario: ${testUser.email}`);
        
        // Probar getUserById
        const userById = AuthService.getUserById(testUser.id);
        if (userById) {
          console.log('   ✅ AuthService.getUserById funciona');
          console.log(`     Usuario: ${userById.email}, Agency: ${userById.agencyId}`);
        } else {
          console.log('   ❌ AuthService.getUserById falló');
        }
        
        // Probar autenticación
        const authResult = await AuthService.authenticate(testUser.email, 'password123');
        if (authResult) {
          console.log('   ✅ AuthService.authenticate funciona');
        } else {
          console.log('   ❌ AuthService.authenticate falló');
        }
      }
    } catch (error) {
      console.log('   ❌ Error probando AuthService:', error.message);
    }
    
    // 4. Probar endpoint de login
    console.log('\n4. Probando endpoint de login...');
    
    try {
      const { POST } = require('../src/app/api/auth/login/route.ts');
      
      const allUsers = db.prepare('SELECT * FROM users').all();
      if (allUsers.length > 0) {
        const testUser = allUsers[0];
        
        const loginRequest = new Request('http://localhost:3000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testUser.email,
            password: 'password123'
          })
        });
        
        const loginResponse = await POST(loginRequest);
        const loginData = await loginResponse.json();
        
        if (loginResponse.status === 200 && loginData.success) {
          console.log('   ✅ Endpoint de login funciona');
          console.log(`     Token generado: ${loginData.data.token.substring(0, 20)}...`);
          
          // 5. Probar endpoint /api/auth/me
          console.log('\n5. Probando endpoint /api/auth/me...');
          
          const { GET } = require('../src/app/api/auth/me/route.ts');
          
          const meRequest = new Request('http://localhost:3000/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${loginData.data.token}`
            }
          });
          
          const meResponse = await GET(meRequest);
          const meData = await meResponse.json();
          
          if (meResponse.status === 200 && meData.success) {
            console.log('   ✅ Endpoint /api/auth/me funciona');
            console.log(`     Usuario autenticado: ${meData.data.email}`);
          } else {
            console.log('   ❌ Endpoint /api/auth/me falló');
            console.log('     Response:', meData);
          }
        } else {
          console.log('   ❌ Endpoint de login falló');
          console.log('     Response:', loginData);
        }
      }
    } catch (error) {
      console.log('   ❌ Error probando endpoints:', error.message);
    }
    
    db.close();
    
    console.log('\n=== RESUMEN ===');
    console.log('Para usar el sistema:');
    console.log('1. Ve a http://localhost:3000/login');
    console.log('2. Usa las credenciales:');
    console.log('   📧 Email: test@postia.com');
    console.log('   🔑 Password: password123');
    
  } catch (error) {
    console.error('❌ Error verificando sistema de auth:', error);
  }
}

checkAuthSystem();