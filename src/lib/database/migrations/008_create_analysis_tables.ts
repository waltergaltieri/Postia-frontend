import { Migration } from './index'

export const migration008CreateAnalysisTables: Migration = {
  version: 8,
  description: 'Create analysis tables for storing AI-generated resource and template analyses',

  up: db => {
    // Create resource_analyses table
    db.exec(`
      CREATE TABLE resource_analyses (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        resource_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        campaign_id TEXT,
        visual_analysis TEXT NOT NULL,
        semantic_analysis TEXT,
        analysis_version TEXT NOT NULL DEFAULT '1.0',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
      );
    `)

    // Create template_analyses table
    db.exec(`
      CREATE TABLE template_analyses (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        template_id TEXT NOT NULL,
        workspace_id TEXT NOT NULL,
        campaign_id TEXT,
        semantic_analysis TEXT NOT NULL,
        analysis_version TEXT NOT NULL DEFAULT '1.0',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
        FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
      );
    `)

    // Create indexes for optimal query performance
    db.exec(`
      CREATE INDEX idx_resource_analyses_resource_id ON resource_analyses(resource_id);
      CREATE INDEX idx_resource_analyses_workspace_id ON resource_analyses(workspace_id);
      CREATE INDEX idx_resource_analyses_campaign_id ON resource_analyses(campaign_id);
      CREATE INDEX idx_resource_analyses_version ON resource_analyses(analysis_version);
      CREATE INDEX idx_resource_analyses_resource_workspace ON resource_analyses(resource_id, workspace_id);
    `)

    db.exec(`
      CREATE INDEX idx_template_analyses_template_id ON template_analyses(template_id);
      CREATE INDEX idx_template_analyses_workspace_id ON template_analyses(workspace_id);
      CREATE INDEX idx_template_analyses_campaign_id ON template_analyses(campaign_id);
      CREATE INDEX idx_template_analyses_version ON template_analyses(analysis_version);
      CREATE INDEX idx_template_analyses_template_workspace ON template_analyses(template_id, workspace_id);
    `)

    console.log('✅ Created analysis tables for AI-generated resource and template analyses')
  },

  down: db => {
    // Drop indexes first
    db.exec(`
      DROP INDEX IF EXISTS idx_resource_analyses_resource_id;
      DROP INDEX IF EXISTS idx_resource_analyses_workspace_id;
      DROP INDEX IF EXISTS idx_resource_analyses_campaign_id;
      DROP INDEX IF EXISTS idx_resource_analyses_version;
      DROP INDEX IF EXISTS idx_resource_analyses_resource_workspace;
    `)

    db.exec(`
      DROP INDEX IF EXISTS idx_template_analyses_template_id;
      DROP INDEX IF EXISTS idx_template_analyses_workspace_id;
      DROP INDEX IF EXISTS idx_template_analyses_campaign_id;
      DROP INDEX IF EXISTS idx_template_analyses_version;
      DROP INDEX IF EXISTS idx_template_analyses_template_workspace;
    `)

    // Drop tables
    db.exec('DROP TABLE IF EXISTS template_analyses;')
    db.exec('DROP TABLE IF EXISTS resource_analyses;')

    console.log('✅ Dropped analysis tables')
  }
}