const Database = require('better-sqlite3')
const path = require('path')

function checkCurrentData() {
  try {
    console.log('🔍 Checking current data in database...')
    
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'postia.db')
    const db = new Database(dbPath, { readonly: true })
    
    // Check agencies
    console.log('\n👥 AGENCIES:')
    const agencies = db.prepare('SELECT id, name, email FROM agencies').all()
    agencies.forEach(agency => {
      console.log(`  - ${agency.id}: ${agency.name} (${agency.email})`)
    })
    
    // Check users
    console.log('\n👤 USERS:')
    const users = db.prepare('SELECT id, email, agency_id FROM users').all()
    users.forEach(user => {
      console.log(`  - ${user.id}: ${user.email} (agency: ${user.agency_id})`)
    })
    
    // Check workspaces
    console.log('\n🏢 WORKSPACES:')
    const workspaces = db.prepare('SELECT id, name, agency_id FROM workspaces').all()
    workspaces.forEach(workspace => {
      console.log(`  - ${workspace.id}: ${workspace.name} (agency: ${workspace.agency_id})`)
    })
    
    // Check templates and resources
    const templateCount = db.prepare('SELECT COUNT(*) as count FROM templates').get().count
    const resourceCount = db.prepare('SELECT COUNT(*) as count FROM resources').get().count
    
    console.log('\n📊 CONTENT:')
    console.log(`  - Templates: ${templateCount}`)
    console.log(`  - Resources: ${resourceCount}`)
    
    db.close()
    
    console.log('\n🔍 ANALYSIS:')
    console.log(`  - Total agencies: ${agencies.length}`)
    console.log(`  - Total users: ${users.length}`)
    console.log(`  - Total workspaces: ${workspaces.length}`)
    
    if (workspaces.length > 0 && agencies.length > 1) {
      console.log('\n⚠️  ISSUE IDENTIFIED:')
      console.log('  - Multiple agencies exist')
      console.log('  - Workspaces are being shown to all users')
      console.log('  - API needs to filter by user\'s agency')
    }
    
  } catch (error) {
    console.error('❌ Check failed:', error)
  }
}

checkCurrentData()