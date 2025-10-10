const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

function migrateJsonToDatabase() {
  try {
    console.log('🚀 Starting migration from JSON files to SQLite database...')
    
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'postia.db')
    const templatesJsonPath = path.join(process.cwd(), 'data', 'templates.json')
    const resourcesJsonPath = path.join(process.cwd(), 'data', 'resources.json')
    
    const db = new Database(dbPath)
    
    // Start transaction
    const transaction = db.transaction(() => {
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
      } else {
        console.log('⚠️  templates.json not found')
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
      } else {
        console.log('⚠️  resources.json not found')
      }
      
      return { migratedTemplates, migratedResources }
    })
    
    const result = transaction()
    
    // Verify migration
    const templateCount = db.prepare('SELECT COUNT(*) as count FROM templates').get().count
    const resourceCount = db.prepare('SELECT COUNT(*) as count FROM resources').get().count
    
    console.log('\n📊 Migration Results:')
    console.log(`  Templates: ${result.migratedTemplates} migrated, ${templateCount} total in DB`)
    console.log(`  Resources: ${result.migratedResources} migrated, ${resourceCount} total in DB`)
    
    db.close()
    
    console.log('\n✅ Migration completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('  1. Update API endpoints to use database repositories')
    console.log('  2. Remove JSON storage files')
    console.log('  3. Test the application')
    
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

migrateJsonToDatabase()