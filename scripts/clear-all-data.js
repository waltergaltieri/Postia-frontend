const Database = require('better-sqlite3')
const path = require('path')

function clearAllData() {
  try {
    console.log('🧹 CLEARING ALL DATA FROM DATABASE...')
    
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'postia.db')
    const db = new Database(dbPath)
    
    // Start transaction to clear all data
    const transaction = db.transaction(() => {
      console.log('🗑️  Deleting all data...')
      
      // Delete in reverse order of dependencies
      db.exec('DELETE FROM publications')
      db.exec('DELETE FROM campaign_templates')
      db.exec('DELETE FROM campaign_resources')
      db.exec('DELETE FROM content_descriptions')
      db.exec('DELETE FROM brand_manuals')
      db.exec('DELETE FROM campaigns')
      db.exec('DELETE FROM templates')
      db.exec('DELETE FROM resources')
      db.exec('DELETE FROM social_accounts')
      db.exec('DELETE FROM workspaces')
      db.exec('DELETE FROM users')
      db.exec('DELETE FROM agencies')
      
      console.log('✅ All data deleted')
      
      // Create fresh user account
      console.log('👤 Creating fresh user account...')
      
      const timestamp = Date.now()
      const randomSuffix = Math.random().toString(36).substring(2, 8)
      const agencyId = `agency-${timestamp}`
      const userId = `user-${timestamp}`
      const workspaceId = `workspace-${timestamp}`
      const uniqueEmail = `admin-${randomSuffix}@miagencia.com`
      
      // Create agency
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
        5000,
        'pro',
        1,
        'America/Mexico_City',
        'es',
        new Date().toISOString(),
        new Date().toISOString()
      )
      
      // Create user
      db.prepare(`
        INSERT INTO users (
          id, email, password_hash, agency_id, role, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        userId,
        uniqueEmail,
        '$2b$10$dummy.hash.for.development',
        agencyId,
        'admin',
        new Date().toISOString(),
        new Date().toISOString()
      )
      
      // Create workspace
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
        '#3b82f6',
        '#64748b',
        '',
        '¡Creando contenido increíble!',
        'Workspace para crear y gestionar campañas de marketing digital',
        '+52 55 1234 5678',
        new Date().toISOString(),
        new Date().toISOString()
      )
      
      return { uniqueEmail, workspaceId }
    })
    
    const result = transaction()
    
    // Verify the data is clean
    const counts = {
      agencies: db.prepare('SELECT COUNT(*) as count FROM agencies').get().count,
      users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
      workspaces: db.prepare('SELECT COUNT(*) as count FROM workspaces').get().count,
      templates: db.prepare('SELECT COUNT(*) as count FROM templates').get().count,
      resources: db.prepare('SELECT COUNT(*) as count FROM resources').get().count,
      campaigns: db.prepare('SELECT COUNT(*) as count FROM campaigns').get().count,
      publications: db.prepare('SELECT COUNT(*) as count FROM publications').get().count
    }
    
    db.close()
    
    console.log('\n🎉 ALL DATA CLEARED SUCCESSFULLY!')
    console.log('\n📊 Current database state:')
    console.log(`  Agencies: ${counts.agencies}`)
    console.log(`  Users: ${counts.users}`)
    console.log(`  Workspaces: ${counts.workspaces}`)
    console.log(`  Templates: ${counts.templates}`)
    console.log(`  Resources: ${counts.resources}`)
    console.log(`  Campaigns: ${counts.campaigns}`)
    console.log(`  Publications: ${counts.publications}`)
    
    console.log('\n🔑 NEW LOGIN CREDENTIALS:')
    console.log(`  Email: ${result.uniqueEmail}`)
    console.log(`  Password: password123`)
    console.log(`  Workspace ID: ${result.workspaceId}`)
    
    console.log('\n🚀 READY TO USE:')
    console.log('  1. Start server: npm run dev')
    console.log('  2. Go to: http://localhost:3000/login')
    console.log('  3. Login with credentials above')
    console.log('  4. NO MORE SIMULATED DATA - COMPLETELY CLEAN!')
    
    return result
    
  } catch (error) {
    console.error('💥 CLEAR FAILED:', error)
    process.exit(1)
  }
}

clearAllData()