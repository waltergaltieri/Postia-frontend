import type { Database } from 'better-sqlite3'
import * as fs from 'fs'
import * as path from 'path'

export interface BackupInfo {
  name: string
  path: string
  size: string
  date: string
  timestamp: number
}

export class BackupManager {
  private db: Database
  private backupDir: string

  constructor(db: Database) {
    this.db = db
    this.backupDir = path.join(process.cwd(), 'backups')
    this.ensureBackupDirectory()
  }

  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true })
    }
  }

  async createBackup(name?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupName = name || `backup_${timestamp}`
    const backupPath = path.join(this.backupDir, `${backupName}.db`)

    try {
      // Use SQLite's backup API through better-sqlite3
      const backup = this.db.backup(backupPath)

      return new Promise<string>((resolve, reject) => {
        backup.step(-1) // Copy entire database
        backup.finish()

        if (fs.existsSync(backupPath)) {
          // Create metadata file
          const metadataPath = path.join(this.backupDir, `${backupName}.json`)
          const metadata = {
            name: backupName,
            created: new Date().toISOString(),
            originalDb: this.getDatabasePath(),
            size: this.getFileSize(backupPath),
          }

          fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2))
          resolve(backupPath)
        } else {
          reject(new Error('Backup file was not created'))
        }
      })
    } catch (error) {
      throw new Error(`Failed to create backup: ${error}`)
    }
  }

  async createAutoBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupName = `auto_backup_${timestamp}`

    // Clean old auto backups (keep only last 10)
    await this.cleanOldAutoBackups()

    return this.createBackup(backupName)
  }

  async restoreBackup(backupName: string): Promise<void> {
    const backupPath = path.join(this.backupDir, `${backupName}.db`)

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`)
    }

    try {
      // Close current database connection
      this.db.close()

      // Copy backup file to current database location
      const currentDbPath = this.getDatabasePath()
      fs.copyFileSync(backupPath, currentDbPath)

      console.log(`✅ Database restored from backup: ${backupName}`)
    } catch (error) {
      throw new Error(`Failed to restore backup: ${error}`)
    }
  }

  async listBackups(limit?: number): Promise<BackupInfo[]> {
    const backups: BackupInfo[] = []

    if (!fs.existsSync(this.backupDir)) {
      return backups
    }

    const files = fs.readdirSync(this.backupDir)
    const dbFiles = files.filter(file => file.endsWith('.db'))

    for (const file of dbFiles) {
      const backupPath = path.join(this.backupDir, file)
      const metadataPath = path.join(
        this.backupDir,
        file.replace('.db', '.json')
      )

      let metadata: any = {}
      if (fs.existsSync(metadataPath)) {
        try {
          metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'))
        } catch (error) {
          // Ignore metadata parsing errors
        }
      }

      const stats = fs.statSync(backupPath)
      backups.push({
        name: file.replace('.db', ''),
        path: backupPath,
        size: this.formatFileSize(stats.size),
        date: metadata.created
          ? new Date(metadata.created).toLocaleString()
          : stats.mtime.toLocaleString(),
        timestamp: metadata.created
          ? new Date(metadata.created).getTime()
          : stats.mtime.getTime(),
      })
    }

    // Sort by timestamp (newest first)
    backups.sort((a, b) => b.timestamp - a.timestamp)

    return limit ? backups.slice(0, limit) : backups
  }

  async deleteBackup(backupName: string): Promise<void> {
    const backupPath = path.join(this.backupDir, `${backupName}.db`)
    const metadataPath = path.join(this.backupDir, `${backupName}.json`)

    if (fs.existsSync(backupPath)) {
      fs.unlinkSync(backupPath)
    }

    if (fs.existsSync(metadataPath)) {
      fs.unlinkSync(metadataPath)
    }
  }

  private async cleanOldAutoBackups(): Promise<void> {
    const backups = await this.listBackups()
    const autoBackups = backups.filter(backup =>
      backup.name.startsWith('auto_backup_')
    )

    // Keep only the 10 most recent auto backups
    const oldBackups = autoBackups.slice(10)

    for (const backup of oldBackups) {
      await this.deleteBackup(backup.name)
    }
  }

  private getDatabasePath(): string {
    // Get the database file path from environment or default location
    return (
      process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'postia.db')
    )
  }

  private getFileSize(filePath: string): number {
    const stats = fs.statSync(filePath)
    return stats.size
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'

    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i]
  }

  // Utility method to create scheduled backups
  async scheduleBackup(intervalHours: number = 24): Promise<void> {
    const createScheduledBackup = async () => {
      try {
        const backupPath = await this.createAutoBackup()
        console.log(`📅 Scheduled backup created: ${backupPath}`)
      } catch (error) {
        console.error('❌ Scheduled backup failed:', error)
      }
    }

    // Create initial backup
    await createScheduledBackup()

    // Schedule recurring backups
    setInterval(createScheduledBackup, intervalHours * 60 * 60 * 1000)
    console.log(`📅 Backup scheduled every ${intervalHours} hours`)
  }

  // Utility method to verify backup integrity
  async verifyBackup(backupName: string): Promise<boolean> {
    const backupPath = path.join(this.backupDir, `${backupName}.db`)

    if (!fs.existsSync(backupPath)) {
      return false
    }

    try {
      // Try to open the backup database to verify it's not corrupted
      const Database = require('better-sqlite3')
      const backupDb = new Database(backupPath, { readonly: true })

      // Run a simple integrity check
      const result = backupDb.prepare('PRAGMA integrity_check').get()
      backupDb.close()

      return result.integrity_check === 'ok'
    } catch (error) {
      return false
    }
  }
}
