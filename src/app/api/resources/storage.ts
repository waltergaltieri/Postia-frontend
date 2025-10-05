import fs from 'fs'
import path from 'path'

// Simple file-based storage for uploaded resources
// Files are stored in public/uploads and metadata in a JSON file

interface StoredResource {
  id: string
  workspaceId: string
  name: string
  originalName: string
  filePath: string
  url: string
  type: 'image' | 'video'
  mimeType: string
  sizeBytes: number
  width?: number | null
  height?: number | null
  durationSeconds?: number | null
  createdAt: string
  updatedAt: string
}

// Paths for storage
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads')
const METADATA_FILE = path.join(process.cwd(), 'data', 'resources.json')

// Ensure directories exist
function ensureDirectories() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true })
  }
  if (!fs.existsSync(path.dirname(METADATA_FILE))) {
    fs.mkdirSync(path.dirname(METADATA_FILE), { recursive: true })
  }
}

// Load resources from JSON file
function loadResources(): Map<string, StoredResource> {
  ensureDirectories()
  
  if (!fs.existsSync(METADATA_FILE)) {
    return new Map()
  }
  
  try {
    const data = fs.readFileSync(METADATA_FILE, 'utf-8')
    const resources = JSON.parse(data)
    return new Map(Object.entries(resources))
  } catch (error) {
    console.error('Error loading resources:', error)
    return new Map()
  }
}

// Save resources to JSON file
function saveResources(resources: Map<string, StoredResource>) {
  try {
    const data = Object.fromEntries(resources)
    fs.writeFileSync(METADATA_FILE, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error saving resources:', error)
  }
}

// Load initial resources
let resourcesStorage = loadResources()

export const ResourceStorage = {
  // Get all resources for a workspace
  getByWorkspace(workspaceId: string): StoredResource[] {
    const resources = Array.from(resourcesStorage.values())
    return resources.filter(r => r.workspaceId === workspaceId)
  },

  // Get a specific resource by ID
  getById(id: string): StoredResource | undefined {
    return resourcesStorage.get(id)
  },

  // Add a new resource
  add(resource: StoredResource): void {
    resourcesStorage.set(resource.id, resource)
    saveResources(resourcesStorage)
  },

  // Update a resource
  update(id: string, updates: Partial<StoredResource>): StoredResource | null {
    const existing = resourcesStorage.get(id)
    if (!existing) return null

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    
    resourcesStorage.set(id, updated)
    saveResources(resourcesStorage)
    return updated
  },

  // Delete a resource
  delete(id: string): boolean {
    const resource = resourcesStorage.get(id)
    if (resource) {
      // Delete physical file
      try {
        const fullPath = path.join(process.cwd(), 'public', resource.filePath)
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath)
        }
      } catch (error) {
        console.error('Error deleting file:', error)
      }
    }
    
    const deleted = resourcesStorage.delete(id)
    if (deleted) {
      saveResources(resourcesStorage)
    }
    return deleted
  },

  // Get all resources (for debugging)
  getAll(): StoredResource[] {
    return Array.from(resourcesStorage.values())
  },

  // Get a resource by filename
  getByFilename(filename: string): StoredResource | undefined {
    const resources = Array.from(resourcesStorage.values())
    return resources.find(r => r.filePath.endsWith(filename))
  },

  // Clear all resources (for testing)
  clear(): void {
    resourcesStorage.clear()
    saveResources(resourcesStorage)
  },

  // Save a file to disk and return the file path
  async saveFile(file: File, resourceId: string): Promise<string> {
    ensureDirectories()
    
    const fileExtension = file.name.split('.').pop()
    const fileName = `${resourceId}.${fileExtension}`
    const filePath = `/uploads/${fileName}`
    const fullPath = path.join(UPLOADS_DIR, fileName)
    
    // Convert file to buffer and save
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(fullPath, buffer)
    
    return filePath
  }
}