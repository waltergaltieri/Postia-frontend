import { Migration } from './index'

export const migration001InitialSchema: Migration = {
  version: 1,
  description: 'Create initial database schema',

  up: db => {
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

    // Create indexes for agencies
    db.exec(`
      CREATE INDEX idx_agencies_email ON agencies(email);
      CREATE INDEX idx_agencies_plan ON agencies(plan);
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

    // Create indexes for users
    db.exec(`
      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_users_agency_id ON users(agency_id);
      CREATE INDEX idx_users_agency_role ON users(agency_id, role);
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

    // Create indexes for workspaces
    db.exec(`
      CREATE INDEX idx_workspaces_agency_id ON workspaces(agency_id);
      CREATE INDEX idx_workspaces_name ON workspaces(agency_id, name);
    `)

    // Create social_accounts table
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

    // Create indexes for social_accounts
    db.exec(`
      CREATE INDEX idx_social_accounts_workspace_id ON social_accounts(workspace_id);
      CREATE INDEX idx_social_accounts_platform ON social_accounts(workspace_id, platform);
      CREATE INDEX idx_social_accounts_connected ON social_accounts(workspace_id, is_connected);
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

    // Create indexes for resources
    db.exec(`
      CREATE INDEX idx_resources_workspace_id ON resources(workspace_id);
      CREATE INDEX idx_resources_type ON resources(workspace_id, type);
      CREATE INDEX idx_resources_name ON resources(workspace_id, name);
      CREATE INDEX idx_resources_created_at ON resources(workspace_id, created_at DESC);
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

    // Create indexes for templates
    db.exec(`
      CREATE INDEX idx_templates_workspace_id ON templates(workspace_id);
      CREATE INDEX idx_templates_type ON templates(workspace_id, type);
      CREATE INDEX idx_templates_name ON templates(workspace_id, name);
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

    // Create indexes for campaigns
    db.exec(`
      CREATE INDEX idx_campaigns_workspace_id ON campaigns(workspace_id);
      CREATE INDEX idx_campaigns_status ON campaigns(workspace_id, status);
      CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);
      CREATE INDEX idx_campaigns_name ON campaigns(workspace_id, name);
      CREATE INDEX idx_campaigns_workspace_status_dates ON campaigns(workspace_id, status, start_date, end_date);
    `)

    // Create campaign_resources junction table
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

    // Create indexes for campaign_resources
    db.exec(`
      CREATE INDEX idx_campaign_resources_campaign ON campaign_resources(campaign_id);
      CREATE INDEX idx_campaign_resources_resource ON campaign_resources(resource_id);
    `)

    // Create campaign_templates junction table
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

    // Create indexes for campaign_templates
    db.exec(`
      CREATE INDEX idx_campaign_templates_campaign ON campaign_templates(campaign_id);
      CREATE INDEX idx_campaign_templates_template ON campaign_templates(template_id);
    `)

    // Create publications table
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

    // Create indexes for publications
    db.exec(`
      CREATE INDEX idx_publications_campaign_id ON publications(campaign_id);
      CREATE INDEX idx_publications_scheduled_date ON publications(scheduled_date);
      CREATE INDEX idx_publications_status ON publications(status);
      CREATE INDEX idx_publications_social_network ON publications(social_network);
      CREATE INDEX idx_publications_calendar ON publications(scheduled_date, status);
      CREATE INDEX idx_publications_date_status_campaign ON publications(scheduled_date, status, campaign_id);
      CREATE INDEX idx_publications_campaign_status ON publications(campaign_id, status);
    `)

    // Create triggers for updated_at timestamps
    const tables = [
      'agencies',
      'users',
      'workspaces',
      'social_accounts',
      'resources',
      'templates',
      'campaigns',
      'publications',
    ]

    tables.forEach(table => {
      db.exec(`
        CREATE TRIGGER update_${table}_updated_at
        AFTER UPDATE ON ${table}
        FOR EACH ROW
        BEGIN
          UPDATE ${table} SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
      `)
    })
  },

  down: db => {
    // Drop triggers first
    const tables = [
      'agencies',
      'users',
      'workspaces',
      'social_accounts',
      'resources',
      'templates',
      'campaigns',
      'publications',
    ]

    tables.forEach(table => {
      db.exec(`DROP TRIGGER IF EXISTS update_${table}_updated_at;`)
    })

    // Drop tables in reverse order to respect foreign key constraints
    db.exec(`DROP TABLE IF EXISTS publications;`)
    db.exec(`DROP TABLE IF EXISTS campaign_templates;`)
    db.exec(`DROP TABLE IF EXISTS campaign_resources;`)
    db.exec(`DROP TABLE IF EXISTS campaigns;`)
    db.exec(`DROP TABLE IF EXISTS templates;`)
    db.exec(`DROP TABLE IF EXISTS resources;`)
    db.exec(`DROP TABLE IF EXISTS social_accounts;`)
    db.exec(`DROP TABLE IF EXISTS workspaces;`)
    db.exec(`DROP TABLE IF EXISTS users;`)
    db.exec(`DROP TABLE IF EXISTS agencies;`)
  },
}
