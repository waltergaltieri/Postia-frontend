const fs = require('fs')
const path = require('path')

function cleanupJsonStorage() {
  try {
    console.log('🧹 Cleaning up JSON storage files...')
    
    const templatesJsonPath = path.join(process.cwd(), 'data', 'templates.json')
    const resourcesJsonPath = path.join(process.cwd(), 'data', 'resources.json')
    
    // Backup files before deletion
    const backupDir = path.join(process.cwd(), 'data', 'backup')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }
    
    let backedUp = 0
    let deleted = 0
    
    // Backup and delete templates.json
    if (fs.existsSync(templatesJsonPath)) {
      const backupPath = path.join(backupDir, `templates-${Date.now()}.json`)
      fs.copyFileSync(templatesJsonPath, backupPath)
      console.log(`📦 Backed up templates.json to ${backupPath}`)
      
      fs.unlinkSync(templatesJsonPath)
      console.log('🗑️  Deleted templates.json')
      backedUp++
      deleted++
    } else {
      console.log('⚠️  templates.json not found')
    }
    
    // Backup and delete resources.json
    if (fs.existsSync(resourcesJsonPath)) {
      const backupPath = path.join(backupDir, `resources-${Date.now()}.json`)
      fs.copyFileSync(resourcesJsonPath, backupPath)
      console.log(`📦 Backed up resources.json to ${backupPath}`)
      
      fs.unlinkSync(resourcesJsonPath)
      console.log('🗑️  Deleted resources.json')
      backedUp++
      deleted++
    } else {
      console.log('⚠️  resources.json not found')
    }
    
    // Remove storage files (but keep them for reference)
    const storageFiles = [
      path.join(process.cwd(), 'src', 'app', 'api', 'templates', 'storage.ts'),
      path.join(process.cwd(), 'src', 'app', 'api', 'resources', 'storage.ts')
    ]
    
    for (const storageFile of storageFiles) {
      if (fs.existsSync(storageFile)) {
        const backupPath = path.join(backupDir, `${path.basename(storageFile, '.ts')}-storage-${Date.now()}.ts`)
        fs.copyFileSync(storageFile, backupPath)
        console.log(`📦 Backed up ${path.basename(storageFile)} to backup directory`)
        
        // Comment out the file instead of deleting it
        const content = fs.readFileSync(storageFile, 'utf-8')
        const commentedContent = `// DEPRECATED: This file has been replaced by database repositories\n// Backed up on ${new Date().toISOString()}\n\n/*\n${content}\n*/`
        fs.writeFileSync(storageFile, commentedContent)
        console.log(`💬 Commented out ${path.basename(storageFile)}`)
      }
    }
    
    console.log('\n✅ Cleanup completed successfully!')
    console.log(`📊 Summary:`)
    console.log(`  - Files backed up: ${backedUp}`)
    console.log(`  - JSON files deleted: ${deleted}`)
    console.log(`  - Storage files commented out: ${storageFiles.length}`)
    console.log('\n📝 Next steps:')
    console.log('  1. Test the application to ensure APIs work with database')
    console.log('  2. Remove commented storage files if everything works')
    console.log('  3. Remove backup files after confirming stability')
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error)
    process.exit(1)
  }
}

cleanupJsonStorage()