const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

function setupTestData() {
  try {
    console.log('🚀 Setting up test data...')
    
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'postia.db')
    const db = new Database(dbPath)
    
    // Start transaction
    const transaction = db.transaction(() => {
      // Check if agency exists
      let agency = db.prepare('SELECT * FROM agencies WHERE id = ?').get('agency-001')
      
      if (!agency) {
        console.log('👤 Creating test agency...')
        db.prepare(`
          INSERT INTO agencies (
            id, name, email, credits, plan, 
            settings_notifications, settings_timezone, settings_language,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'agency-001',
          'Test Agency',
          'test@agency.com',
          1000,
          'pro',
          1,
          'UTC',
          'es',
          new Date().toISOString(),
          new Date().toISOString()
        )
        console.log('✅ Test agency created')
      } else {
        console.log('✅ Test agency already exists')
      }
      
      // Check if user exists
      let user = db.prepare('SELECT * FROM users WHERE id = ?').get('user-001')
      
      if (!user) {
        console.log('👤 Creating test user...')
        db.prepare(`
          INSERT INTO users (
            id, email, password_hash, agency_id, role, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(
          'user-001',
          'test@agency.com',
          '$2b$10$dummy.hash.for.development',
          'agency-001',
          'admin',
          new Date().toISOString(),
          new Date().toISOString()
        )
        console.log('✅ Test user created')
      } else {
        console.log('✅ Test user already exists')
      }
      
      // Check if workspace exists
      let workspace = db.prepare('SELECT * FROM workspaces WHERE id = ?').get('workspace-001')
      
      if (!workspace) {
        console.log('🏢 Creating test workspace...')
        db.prepare(`
          INSERT INTO workspaces (
            id, agency_id, name, 
            branding_primary_color, branding_secondary_color, branding_logo,
            branding_slogan, branding_description, branding_whatsapp,
            created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          'workspace-001',
          'agency-001',
          'Test Workspace',
          '#9333ea',
          '#737373',
          '',
          'Test Slogan',
          'Test Description',
          '',
          new Date().toISOString(),
          new Date().toISOString()
        )
        console.log('✅ Test workspace created')
      } else {
        console.log('✅ Test workspace already exists')
      }
    })
    
    transaction()
    
    // Now migrate JSON data
    console.log('\n📦 Migrating JSON data...')
    
    const templatesJsonPath = path.join(process.cwd(), 'data', 'templates.json')
    const resourcesJsonPath = path.join(process.cwd(), 'data', 'resources.json')
    
    let migratedTemplates = 0
    let migratedResources = 0
    
    // Migrate Templates
    if (fs.existsSync(templatesJsonPath)) {
      console.log('📄 Reading templates.json...')
      const templatesData = JSON.parse(fs.readFileSync(templatesJsonPath, 'utf-8'))
      
      const insertTemplate = db.prepare(`
        INSERT OR REPLACE INTO templates (
          id, workspace_id, name, type, images, social_networks, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      for (const [id, template] of Object.entries(templatesData)) {
        try {
          insertTemplate.run(
            template.id,
            template.workspaceId,
            template.name,
            template.type,
            JSON.stringify(template.images),
            JSON.stringify(template.socialNetworks),
            template.createdAt,
            template.updatedAt
          )
          migratedTemplates++
        } catch (error) {
          console.error(`❌ Error migrating template ${id}:`, error.message)
        }
      }
      
      console.log(`✅ Migrated ${migratedTemplates} templates`)
    }
    
    // Migrate Resources
    if (fs.existsSync(resourcesJsonPath)) {
      console.log('📄 Reading resources.json...')
      const resourcesData = JSON.parse(fs.readFileSync(resourcesJsonPath, 'utf-8'))
      
      const insertResource = db.prepare(`
        INSERT OR REPLACE INTO resources (
          id, workspace_id, name, original_name, file_path, url, type, 
          mime_type, size_bytes, width, height, duration_seconds, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      
      for (const [id, resource] of Object.entries(resourcesData)) {
        try {
          insertResource.run(
            resource.id,
            resource.workspaceId,
            resource.name,
            resource.originalName,
            resource.filePath,
            resource.url,
            resource.type,
            resource.mimeType,
            resource.sizeBytes,
            resource.width,
            resource.height,
            resource.durationSeconds,
            resource.createdAt,
            resource.updatedAt
          )
          migratedResources++
        } catch (error) {
          console.error(`❌ Error migrating resource ${id}:`, error.message)
        }
      }
      
      console.log(`✅ Migrated ${migratedResources} resources`)
    }
    
    // Verify final state
    const templateCount = db.prepare('SELECT COUNT(*) as count FROM templates').get().count
    const resourceCount = db.prepare('SELECT COUNT(*) as count FROM resources').get().count
    const workspaceCount = db.prepare('SELECT COUNT(*) as count FROM workspaces').get().count
    const agencyCount = db.prepare('SELECT COUNT(*) as count FROM agencies').get().count
    
    console.log('\n📊 Final Database State:')
    console.log(`  Agencies: ${agencyCount}`)
    console.log(`  Workspaces: ${workspaceCount}`)
    console.log(`  Templates: ${templateCount}`)
    console.log(`  Resources: ${resourceCount}`)
    
    db.close()
    
    console.log('\n✅ Test data setup completed successfully!')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
    process.exit(1)
  }
}

setupTestData()