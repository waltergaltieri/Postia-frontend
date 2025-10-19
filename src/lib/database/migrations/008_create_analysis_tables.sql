-- Migration: Create analysis tables for storing AI-generated resource and template analyses
-- This enables caching of expensive AI operations for better performance

-- Table for storing resource analyses (visual + semantic)
CREATE TABLE IF NOT EXISTS resource_analyses (
  id TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  campaign_id TEXT,                    -- Optional: analysis specific to a campaign
  visual_analysis TEXT NOT NULL,       -- JSON: ResourceAnalysis from VisualAnalyzerAgent
  semantic_analysis TEXT,              -- JSON: SemanticResourceIndex from SemanticResourceAnalyzerAgent
  analysis_version TEXT NOT NULL DEFAULT '1.0',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
);

-- Table for storing template analyses (semantic only)
CREATE TABLE IF NOT EXISTS template_analyses (
  id TEXT PRIMARY KEY,
  template_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  campaign_id TEXT,                    -- Optional: analysis specific to a campaign
  semantic_analysis TEXT NOT NULL,     -- JSON: SemanticTemplateIndex from SemanticResourceAnalyzerAgent
  analysis_version TEXT NOT NULL DEFAULT '1.0',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE,
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL
);

-- Indexes for optimal query performance
CREATE INDEX IF NOT EXISTS idx_resource_analyses_resource_id ON resource_analyses(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_analyses_workspace_id ON resource_analyses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_resource_analyses_campaign_id ON resource_analyses(campaign_id);
CREATE INDEX IF NOT EXISTS idx_resource_analyses_version ON resource_analyses(analysis_version);

CREATE INDEX IF NOT EXISTS idx_template_analyses_template_id ON template_analyses(template_id);
CREATE INDEX IF NOT EXISTS idx_template_analyses_workspace_id ON template_analyses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_template_analyses_campaign_id ON template_analyses(campaign_id);
CREATE INDEX IF NOT EXISTS idx_template_analyses_version ON template_analyses(analysis_version);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_resource_analyses_resource_workspace ON resource_analyses(resource_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_template_analyses_template_workspace ON template_analyses(template_id, workspace_id);