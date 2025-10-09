import { Migration } from './index'

export const migration002AiContentGeneration: Migration = {
  version: 2,
  description: 'Add AI content generation tables and extend existing tables',

  up: db => {
    // Extend campaigns table with AI fields
    db.exec(`
      ALTER TABLE campaigns ADD COLUMN short_prompt TEXT;
      ALTER TABLE campaigns ADD COLUMN long_prompt TEXT;
      ALTER TABLE campaigns ADD COLUMN selected_resources TEXT; -- JSON array
      ALTER TABLE campaigns ADD COLUMN selected_templates TEXT; -- JSON array
      ALTER TABLE campaigns ADD COLUMN platform_distribution TEXT; -- JSON object
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
        resource_ids TEXT, -- JSON array
        status TEXT CHECK (status IN ('pending', 'approved', 'regenerating', 'generated')) DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
        FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE SET NULL
      );
    `)

    // Create indexes for content_descriptions
    db.exec(`
      CREATE INDEX idx_content_descriptions_campaign_id ON content_descriptions(campaign_id);
      CREATE INDEX idx_content_descriptions_platform ON content_descriptions(platform);
      CREATE INDEX idx_content_descriptions_scheduled_date ON content_descriptions(scheduled_date);
      CREATE INDEX idx_content_descriptions_status ON content_descriptions(status);
      CREATE INDEX idx_content_descriptions_campaign_status ON content_descriptions(campaign_id, status);
    `)

    // Create brand_manuals table
    db.exec(`
      CREATE TABLE brand_manuals (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        workspace_id TEXT NOT NULL,
        brand_voice TEXT NOT NULL,
        brand_values TEXT, -- JSON array
        target_audience TEXT NOT NULL,
        key_messages TEXT, -- JSON array
        dos_donts TEXT, -- JSON object with dos and donts arrays
        color_palette TEXT, -- JSON array
        typography TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        UNIQUE(workspace_id)
      );
    `)

    // Create indexes for brand_manuals
    db.exec(`
      CREATE INDEX idx_brand_manuals_workspace_id ON brand_manuals(workspace_id);
    `)

    // Extend publications table with AI generation fields
    db.exec(`
      ALTER TABLE publications ADD COLUMN content_description_id TEXT;
      ALTER TABLE publications ADD COLUMN generated_text TEXT;
      ALTER TABLE publications ADD COLUMN generated_image_url TEXT;
      ALTER TABLE publications ADD COLUMN generation_metadata TEXT; -- JSON object
    `)

    // Add foreign key constraint for content_description_id
    db.exec(`
      CREATE INDEX idx_publications_content_description_id ON publications(content_description_id);
    `)

    // Create triggers for updated_at timestamps on new tables
    const newTables = ['content_descriptions', 'brand_manuals']

    newTables.forEach(table => {
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
    // Drop triggers for new tables
    const newTables = ['content_descriptions', 'brand_manuals']
    newTables.forEach(table => {
      db.exec(`DROP TRIGGER IF EXISTS update_${table}_updated_at;`)
    })

    // Drop new tables
    db.exec(`DROP TABLE IF EXISTS content_descriptions;`)
    db.exec(`DROP TABLE IF EXISTS brand_manuals;`)

    // Remove added columns from publications table
    // Note: SQLite doesn't support DROP COLUMN, so we need to recreate the table
    db.exec(`
      CREATE TABLE publications_backup AS 
      SELECT 
        id, campaign_id, template_id, resource_id, social_network, 
        content, image_url, scheduled_date, status, published_at, 
        error_message, external_post_id, created_at, updated_at
      FROM publications;
    `)

    db.exec(`DROP TABLE publications;`)

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

    // Restore data
    db.exec(`
      INSERT INTO publications 
      SELECT * FROM publications_backup;
    `)

    db.exec(`DROP TABLE publications_backup;`)

    // Recreate publications indexes
    db.exec(`
      CREATE INDEX idx_publications_campaign_id ON publications(campaign_id);
      CREATE INDEX idx_publications_scheduled_date ON publications(scheduled_date);
      CREATE INDEX idx_publications_status ON publications(status);
      CREATE INDEX idx_publications_social_network ON publications(social_network);
      CREATE INDEX idx_publications_calendar ON publications(scheduled_date, status);
      CREATE INDEX idx_publications_date_status_campaign ON publications(scheduled_date, status, campaign_id);
      CREATE INDEX idx_publications_campaign_status ON publications(campaign_id, status);
    `)

    // Recreate publications trigger
    db.exec(`
      CREATE TRIGGER update_publications_updated_at
      AFTER UPDATE ON publications
      FOR EACH ROW
      BEGIN
        UPDATE publications SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `)

    // Remove added columns from campaigns table
    // Note: SQLite doesn't support DROP COLUMN, so we need to recreate the table
    db.exec(`
      CREATE TABLE campaigns_backup AS 
      SELECT 
        id, workspace_id, name, objective, start_date, end_date, 
        social_networks, interval_hours, content_type, optimization_settings, 
        prompt, status, created_at, updated_at
      FROM campaigns;
    `)

    db.exec(`DROP TABLE campaigns;`)

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

    // Restore data
    db.exec(`
      INSERT INTO campaigns 
      SELECT * FROM campaigns_backup;
    `)

    db.exec(`DROP TABLE campaigns_backup;`)

    // Recreate campaigns indexes
    db.exec(`
      CREATE INDEX idx_campaigns_workspace_id ON campaigns(workspace_id);
      CREATE INDEX idx_campaigns_status ON campaigns(workspace_id, status);
      CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);
      CREATE INDEX idx_campaigns_name ON campaigns(workspace_id, name);
      CREATE INDEX idx_campaigns_workspace_status_dates ON campaigns(workspace_id, status, start_date, end_date);
    `)

    // Recreate campaigns trigger
    db.exec(`
      CREATE TRIGGER update_campaigns_updated_at
      AFTER UPDATE ON campaigns
      FOR EACH ROW
      BEGIN
        UPDATE campaigns SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
    `)
  },
}