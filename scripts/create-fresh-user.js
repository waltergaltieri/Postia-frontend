const Database = require('better-sqlite3')
const path = require('path')

function createFreshUser() {
  try {
    console.log('🚀 Creating fresh user account...')
    
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'postia.db')
    const db = new Database(dbPath)
    
    // Generate unique IDs and email
    const timestamp = Date.now()
    const randomSuffix = Math.random().toString(36).substring(2, 8)
    const agencyId = `agency-${timestamp}`
    const userId = `user-${timestamp}`
    const workspaceId = `workspace-${timestamp}`
    const uniqueEmail = `admin-${randomSuffix}@miagencia.com`
    
    // Start transaction
    const transaction = db.transaction(() => {
      // Create new agency
      console.log('🏢 Creating new agency...')
      db.prepare(`
        INSERT INTO agencies (
          id, name, email, credits, plan, 
          settings_notifications, settings_timezone, settings_language,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        agencyId,
        'Mi Agencia Digital',
        uniqueEmail,
        5000, // More credits for new account
        'pro', // Start with pro plan
        1,
        'America/Mexico_City', // Mexican timezone
        'es',
        new Date().toISOString(),
        new Date().toISOString()
      )
      
      // Create new user
      console.log('👤 Creating new user...')
      db.prepare(`
        INSERT INTO users (
          id, email, password_hash, agency_id, role, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        uniqueEmail,
        '$2b$10$dummy.hash.for.development', // This allows password123
        agencyId,
        'admin',
        new Date().toISOString(),
        new Date().toISOString()
      )
      
      // Create new workspace
      console.log('🏠 Creating new workspace...')
      db.prepare(`
        INSERT INTO workspaces (
          id, agency_id, name, 
          branding_primary_color, branding_secondary_color, branding_logo,
          branding_slogan, branding_description, branding_whatsapp,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        workspaceId,
        agencyId,
        'Mi Primer Workspace',
        '#3b82f6', // Nice blue color
        '#64748b', // Gray secondary
        '',
        '¡Creando contenido increíble!',
        'Workspace para crear y gestionar campañas de marketing digital',
        '+52 55 1234 5678',
        new Date().toISOString(),
        new Date().toISOString()
      )
      
      return { agencyId, userId, workspaceId }
    })
    
    const result = transaction()
    
    // Verify creation
    const agency = db.prepare('SELECT * FROM agencies WHERE id = ?').get(result.agencyId)
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.userId)
    const workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(result.workspaceId)
    
    db.close()
    
    console.log('\n✅ Fresh account created successfully!')
    console.log('\n📋 Account Details:')
    console.log(`  Agency: ${agency.name}`)
    console.log(`  Email: ${user.email}`)
    console.log(`  Password: password123`)
    console.log(`  Plan: ${agency.plan}`)
    console.log(`  Credits: ${agency.credits}`)
    console.log(`  Workspace: ${workspace.name}`)
    console.log(`  Workspace ID: ${workspace.id}`)
    
    console.log('\n🔑 Login Credentials:')
    console.log(`  Email: ${uniqueEmail}`)
    console.log(`  Password: password123`)
    
    console.log('\n🌐 URLs to test:')
    console.log(`  Login: http://localhost:3000/login`)
    console.log(`  Templates: http://localhost:3000/workspace/${workspace.id}/templates`)
    console.log(`  Resources: http://localhost:3000/workspace/${workspace.id}/resources`)
    
    console.log('\n📊 Database Status:')
    const db2 = new Database(dbPath, { readonly: true })
    const counts = {
      agencies: db2.prepare('SELECT COUNT(*) as count FROM agencies').get().count,
      users: db2.prepare('SELECT COUNT(*) as count FROM users').get().count,
      workspaces: db2.prepare('SELECT COUNT(*) as count FROM workspaces').get().count,
      templates: db2.prepare('SELECT COUNT(*) as count FROM templates').get().count,
      resources: db2.prepare('SELECT COUNT(*) as count FROM resources').get().count
    }
    db2.close()
    
    console.log(`  Total agencies: ${counts.agencies}`)
    console.log(`  Total users: ${counts.users}`)
    console.log(`  Total workspaces: ${counts.workspaces}`)
    console.log(`  Total templates: ${counts.templates}`)
    console.log(`  Total resources: ${counts.resources}`)
    
    console.log('\n🚀 Ready to use!')
    console.log('  1. Start the development server: npm run dev')
    console.log('  2. Go to http://localhost:3000/login')
    console.log('  3. Login with the credentials above')
    console.log('  4. Start creating templates and resources!')
    
    return {
      credentials: {
        email: uniqueEmail,
        password: 'password123'
      },
      ids: result
    }
    
  } catch (error) {
    console.error('❌ Failed to create fresh user:', error)
    process.exit(1)
  }
}

createFreshUser()