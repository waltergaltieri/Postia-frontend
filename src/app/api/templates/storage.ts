import fs from 'fs'
import path from 'path'

// Simple file-based storage for templates
// Template metadata stored in a JSON file

interface StoredTemplate {
  id: string
  workspaceId: string
  name: string
  type: 'single' | 'carousel'
  images: string[]
  socialNetworks: string[]
  createdAt: string
  updatedAt: string
}

// Path for template metadata
const TEMPLATES_FILE = path.join(process.cwd(), 'data', 'templates.json')

// Ensure data directory exists
function ensureDataDirectory() {
  const dataDir = path.dirname(TEMPLATES_FILE)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Load templates from JSON file
function loadTemplates(): Map<string, StoredTemplate> {
  ensureDataDirectory()
  
  if (!fs.existsSync(TEMPLATES_FILE)) {
    return new Map()
  }
  
  try {
    const data = fs.readFileSync(TEMPLATES_FILE, 'utf-8')
    const templates = JSON.parse(data)
    return new Map(Object.entries(templates))
  } catch (error) {
    console.error('Error loading templates:', error)
    return new Map()
  }
}

// Save templates to JSON file
function saveTemplates(templates: Map<string, StoredTemplate>) {
  try {
    const data = Object.fromEntries(templates)
    fs.writeFileSync(TEMPLATES_FILE, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error saving templates:', error)
  }
}

// Load initial templates
let templatesStorage = loadTemplates()

export const TemplateStorage = {
  // Get all templates for a workspace
  getByWorkspace(workspaceId: string): StoredTemplate[] {
    const templates = Array.from(templatesStorage.values())
    return templates.filter(t => t.workspaceId === workspaceId)
  },

  // Get a specific template by ID
  getById(id: string): StoredTemplate | undefined {
    return templatesStorage.get(id)
  },

  // Add a new template
  add(template: StoredTemplate): void {
    templatesStorage.set(template.id, template)
    saveTemplates(templatesStorage)
  },

  // Update a template
  update(id: string, updates: Partial<StoredTemplate>): StoredTemplate | null {
    const existing = templatesStorage.get(id)
    if (!existing) return null

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    
    templatesStorage.set(id, updated)
    saveTemplates(templatesStorage)
    return updated
  },

  // Delete a template
  delete(id: string): boolean {
    const deleted = templatesStorage.delete(id)
    if (deleted) {
      saveTemplates(templatesStorage)
    }
    return deleted
  },

  // Get all templates (for debugging)
  getAll(): StoredTemplate[] {
    return Array.from(templatesStorage.values())
  },

  // Clear all templates (for testing)
  clear(): void {
    templatesStorage.clear()
    saveTemplates(templatesStorage)
  }
}