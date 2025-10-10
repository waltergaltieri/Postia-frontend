const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

function resetEverything() {
  try {
    console.log('🔥 RESETTING EVERYTHING - NUCLEAR OPTION')
    
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'postia.db')
    
    // Delete the entire database file
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath)
      console.log('💥 Database file deleted')
    }
    
    // Delete WAL and SHM files
    const walPath = dbPath + '-wal'
    const shmPath = dbPath + '-shm'
    
    if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath)
      console.log('💥 WAL file deleted')
    }
    
    if (fs.existsSync(shmPath)) {
      fs.unlinkSync(shmPath)
      console.log('💥 SHM file deleted')
    }
    
    // Delete uploads directory
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    if (fs.existsSync(uploadsDir)) {
      fs.rmSync(uploadsDir, { recursive: true, force: true })
      console.log('💥 Uploads directory deleted')
    }
    
    console.log('\n🏗️  Recreating database from scratch...')
    
    // Recreate database and run migrations
    const db = new Database(dbPath)
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON')
    db.pragma('journal_mode = WAL')
    db.pragma('synchronous = NORMAL')
    
    // Create migrations table
    db.exec(`
      CREATE TABLE migrations (
        version INTEGER PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
    
    // Run migration 001 - Initial Schema
    console.log('📦 Running migration 001...')
    
    // Create agencies table
    db.exec(`
      CREATE TABLE agencies (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        credits INTEGER DEFAULT 0,
        plan TEXT CHECK (plan IN ('free', 'pro', 'enterprise')) DEFAULT 'free',
        settings_notifications BOOLEAN DEFAULT true,
        settings_timezone TEXT DEFAULT 'UTC',
        settings_language TEXT DEFAULT 'es',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `)
    
    // Create users table
    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        agency_id TEXT NOT NULL,
        role TEXT CHECK (role IN ('admin', 'member')) DEFAULT 'member',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE
      );
    `)
    
    // Create workspaces table
    db.exec(`
      CREATE TABLE workspaces (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        agency_id TEXT NOT NULL,
        name TEXT NOT NULL,
        branding_primary_color TEXT DEFAULT '#9333ea',
        branding_secondary_color TEXT DEFAULT '#737373',
        branding_logo TEXT,
        branding_slogan TEXT DEFAULT '',
        branding_description TEXT DEFAULT '',
        branding_whatsapp TEXT DEFAULT '',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE CASCADE
      );
    `)
    
    // Create resources table
    db.exec(`
      CREATE TABLE resources (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        url TEXT NOT NULL,
        type TEXT CHECK (type IN ('image', 'video')) NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        width INTEGER,
        height INTEGER,
        duration_seconds INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      );
    `)
    
    // Create templates table
    db.exec(`
      CREATE TABLE templates (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT CHECK (type IN ('single', 'carousel')) DEFAULT 'single',
        images TEXT NOT NULL,
        social_networks TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      );
    `)
    
    // Create campaigns table
    db.exec(`
      CREATE TABLE campaigns (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        workspace_id TEXT NOT NULL,
        name TEXT NOT NULL,
        objective TEXT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        social_networks TEXT NOT NULL,
        interval_hours INTEGER DEFAULT 24,
        content_type TEXT CHECK (content_type IN ('unified', 'optimized')) DEFAULT 'unified',
        optimization_settings TEXT,
        prompt TEXT NOT NULL,
        status TEXT CHECK (status IN ('draft', 'active', 'completed', 'paused')) DEFAULT 'draft',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
      );
    `)
    
    // Create other tables...
    db.exec(`
      CREATE TABLE social_accounts (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        workspace_id TEXT NOT NULL,
        platform TEXT CHECK (platform IN ('facebook', 'instagram', 'twitter', 'linkedin')) NOT NULL,
        account_id TEXT NOT NULL,
        account_name TEXT NOT NULL,
        is_connected BOOLEAN DEFAULT false,
        connected_at DATETIME,
        access_token TEXT,
        refresh_token TEXT,
        token_expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        UNIQUE(workspace_id, platform, account_id)
      );
    `)
    
    db.exec(`
      CREATE TABLE publications (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        campaign_id TEXT NOT NULL,
        template_id TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        social_network TEXT CHECK (social_network IN ('facebook', 'instagram', 'twitter', 'linkedin')) NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT NOT NULL,
        scheduled_date DATETIME NOT NULL,
        status TEXT CHECK (status IN ('scheduled', 'published', 'failed', 'cancelled')) DEFAULT 'scheduled',
        published_at DATETIME,
        error_message TEXT,
        external_post_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE RESTRICT,
        FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE RESTRICT
      );
    `)
    
    // Junction tables
    db.exec(`
      CREATE TABLE campaign_resources (
        campaign_id TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (campaign_id, resource_id),
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
      );
    `)
    
    db.exec(`
      CREATE TABLE campaign_templates (
        campaign_id TEXT NOT NULL,
        template_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (campaign_id, template_id),
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
      );
    `)
    
    // Record migration 001
    db.prepare(`
      INSERT INTO migrations (version, description) VALUES (?, ?)
    `).run(1, 'Create initial database schema')
    
    console.log('✅ Migration 001 completed')
    
    // Run migration 002 - AI Content Generation
    console.log('📦 Running migration 002...')
    
    // Extend campaigns table with AI fields
    db.exec(`
      ALTER TABLE campaigns ADD COLUMN short_prompt TEXT;
      ALTER TABLE campaigns ADD COLUMN long_prompt TEXT;
      ALTER TABLE campaigns ADD COLUMN selected_resources TEXT;
      ALTER TABLE campaigns ADD COLUMN selected_templates TEXT;
      ALTER TABLE campaigns ADD COLUMN platform_distribution TEXT;
      ALTER TABLE campaigns ADD COLUMN publications_per_day INTEGER DEFAULT 1;
      ALTER TABLE campaigns ADD COLUMN interval_days INTEGER DEFAULT 1;
      ALTER TABLE campaigns ADD COLUMN generation_status TEXT CHECK (generation_status IN ('configuring', 'descriptions_generated', 'content_generating', 'completed')) DEFAULT 'configuring';
    `)
    
    // Create content_descriptions table
    db.exec(`
      CREATE TABLE content_descriptions (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        campaign_id TEXT NOT NULL,
        platform TEXT CHECK (platform IN ('facebook', 'instagram', 'twitter', 'linkedin')) NOT NULL,
        scheduled_date DATETIME NOT NULL,
        content_type TEXT CHECK (content_type IN ('text_simple', 'text_image_simple', 'text_image_template', 'carousel')) NOT NULL,
        description TEXT NOT NULL,
        template_id TEXT,
        resource_ids TEXT,
        status TEXT CHECK (status IN ('pending', 'approved', 'regenerating', 'generated')) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL
      );
    `)
    
    // Create brand_manuals table
    db.exec(`
      CREATE TABLE brand_manuals (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        workspace_id TEXT NOT NULL,
        brand_voice TEXT NOT NULL,
        brand_values TEXT,
        target_audience TEXT NOT NULL,
        key_messages TEXT,
        dos_donts TEXT,
        color_palette TEXT,
        typography TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        UNIQUE(workspace_id)
      );
    `)
    
    // Extend publications table with AI generation fields
    db.exec(`
      ALTER TABLE publications ADD COLUMN content_description_id TEXT;
      ALTER TABLE publications ADD COLUMN generated_text TEXT;
      ALTER TABLE publications ADD COLUMN generated_image_url TEXT;
      ALTER TABLE publications ADD COLUMN generation_metadata TEXT;
    `)
    
    // Record migration 002
    db.prepare(`
      INSERT INTO migrations (version, description) VALUES (?, ?)
    `).run(2, 'Add AI content generation tables and extend existing tables')
    
    console.log('✅ Migration 002 completed')
    
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
    
    db.close()
    
    console.log('\n🎉 EVERYTHING RESET SUCCESSFULLY!')
    console.log('\n🔑 NEW LOGIN CREDENTIALS:')
    console.log(`  Email: ${uniqueEmail}`)
    console.log(`  Password: password123`)
    console.log(`  Workspace ID: ${workspaceId}`)
    
    console.log('\n🚀 READY TO USE:')
    console.log('  1. Start server: npm run dev')
    console.log('  2. Go to: http://localhost:3000/login')
    console.log('  3. Login with credentials above')
    console.log('  4. NO MORE SIMULATED DATA!')
    
    return {
      email: uniqueEmail,
      password: 'password123',
      workspaceId
    }
    
  } catch (error) {
    console.error('💥 RESET FAILED:', error)
    process.exit(1)
  }
}

resetEverything()