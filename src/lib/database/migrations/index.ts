import Database from 'better-sqlite3'

// Migration interface
export interface Migration {
  version: number
  description: string
  up: (db: Database.Database) => void
  down: (db: Database.Database) => void
}

// Migration runner class
export class MigrationRunner {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
    this.initializeMigrationsTable()
  }

  /**
   * Initialize the migrations control table
   */
  private initializeMigrationsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        description TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)
  }

  /**
   * Get the current database version
   */
  getCurrentVersion(): number {
    const result = this.db
      .prepare(
        `
      SELECT MAX(version) as version FROM migrations
    `
      )
      .get() as { version: number | null }

    return result.version || 0
  }

  /**
   * Get all applied migrations
   */
  getAppliedMigrations(): Array<{
    version: number
    description: string
    applied_at: string
  }> {
    return this.db
      .prepare(
        `
      SELECT version, description, applied_at 
      FROM migrations 
      ORDER BY version ASC
    `
      )
      .all() as Array<{
      version: number
      description: string
      applied_at: string
    }>
  }

  /**
   * Run migrations up to target version
   */
  migrateUp(migrations: Migration[], targetVersion?: number): void {
    const currentVersion = this.getCurrentVersion()
    const maxVersion =
      targetVersion || Math.max(...migrations.map(m => m.version))

    const migrationsToRun = migrations
      .filter(m => m.version > currentVersion && m.version <= maxVersion)
      .sort((a, b) => a.version - b.version)

    if (migrationsToRun.length === 0) {
      console.log('No migrations to run')
      return
    }

    console.log(`Running ${migrationsToRun.length} migration(s)...`)

    for (const migration of migrationsToRun) {
      console.log(
        `Applying migration ${migration.version}: ${migration.description}`
      )

      this.db.transaction(() => {
        try {
          migration.up(this.db)

          this.db
            .prepare(
              `
            INSERT INTO migrations (version, description) 
            VALUES (?, ?)
          `
            )
            .run(migration.version, migration.description)

          console.log(`✓ Migration ${migration.version} applied successfully`)
        } catch (error) {
          console.error(`✗ Migration ${migration.version} failed:`, error)
          throw error
        }
      })()
    }

    console.log('All migrations completed successfully')
  }

  /**
   * Rollback migrations down to target version
   */
  migrateDown(migrations: Migration[], targetVersion: number): void {
    const currentVersion = this.getCurrentVersion()

    if (targetVersion >= currentVersion) {
      console.log('Target version is not lower than current version')
      return
    }

    const migrationsToRollback = migrations
      .filter(m => m.version > targetVersion && m.version <= currentVersion)
      .sort((a, b) => b.version - a.version) // Reverse order for rollback

    if (migrationsToRollback.length === 0) {
      console.log('No migrations to rollback')
      return
    }

    console.log(`Rolling back ${migrationsToRollback.length} migration(s)...`)

    for (const migration of migrationsToRollback) {
      console.log(
        `Rolling back migration ${migration.version}: ${migration.description}`
      )

      this.db.transaction(() => {
        try {
          migration.down(this.db)

          this.db
            .prepare(
              `
            DELETE FROM migrations WHERE version = ?
          `
            )
            .run(migration.version)

          console.log(
            `✓ Migration ${migration.version} rolled back successfully`
          )
        } catch (error) {
          console.error(
            `✗ Migration ${migration.version} rollback failed:`,
            error
          )
          throw error
        }
      })()
    }

    console.log('All rollbacks completed successfully')
  }

  /**
   * Reset database by rolling back all migrations
   */
  reset(migrations: Migration[]): void {
    console.log('Resetting database...')
    this.migrateDown(migrations, 0)
    console.log('Database reset completed')
  }

  /**
   * Get migration status
   */
  getStatus(migrations: Migration[]): void {
    const currentVersion = this.getCurrentVersion()
    const appliedMigrations = this.getAppliedMigrations()
    const availableMigrations = migrations.sort((a, b) => a.version - b.version)

    console.log('\n=== Migration Status ===')
    console.log(`Current database version: ${currentVersion}`)
    console.log(`Available migrations: ${availableMigrations.length}`)
    console.log(`Applied migrations: ${appliedMigrations.length}`)

    console.log('\n=== Applied Migrations ===')
    if (appliedMigrations.length === 0) {
      console.log('No migrations applied')
    } else {
      appliedMigrations.forEach(migration => {
        console.log(
          `✓ ${migration.version}: ${migration.description} (${migration.applied_at})`
        )
      })
    }

    const pendingMigrations = availableMigrations.filter(
      m => m.version > currentVersion
    )
    console.log('\n=== Pending Migrations ===')
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations')
    } else {
      pendingMigrations.forEach(migration => {
        console.log(`○ ${migration.version}: ${migration.description}`)
      })
    }
    console.log('')
  }
}
