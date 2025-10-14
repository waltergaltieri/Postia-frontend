// Temporary storage mock to fix build error

export interface Resource {
  id: string
  name: string
  filePath: string
  mimeType: string
  type: 'image' | 'video'
}

export class ResourceStorage {
  private static resources: Map<string, Resource> = new Map()

  static getByFilename(filename: string): Resource | undefined {
    // Mock implementation - return undefined for now
    return undefined
  }

  static add(resource: Resource): void {
    this.resources.set(resource.id, resource)
  }

  static remove(id: string): boolean {
    return this.resources.delete(id)
  }

  static getAll(): Resource[] {
    return Array.from(this.resources.values())
  }
}