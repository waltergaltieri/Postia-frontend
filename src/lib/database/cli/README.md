# Database CLI Administration Tools

This directory contains comprehensive command-line tools for managing the Postia database, including migrations, seeds, backups, and monitoring utilities.

## Available Commands

### Main Admin CLI

```bash
npm run db:admin <command> [subcommand] [options]
```

### Quick Access Commands

```bash
npm run db:backup <subcommand>    # Direct backup access
npm run db:analyze <subcommand>   # Direct analysis access
```

## Command Reference

### Migration Management

#### Run Migrations

```bash
# Run all pending migrations
npm run db:admin migrate up

# Run migrations up to specific version
npm run db:admin migrate up 5

# Rollback to specific version
npm run db:admin migrate down 3

# Show migration status
npm run db:admin migrate status

# Create new migration file
npm run db:admin migrate create "add_user_preferences"
```

#### Migration Files

- Located in `src/lib/database/migrations/`
- Auto-generated with timestamp and name
- Must be added to migrations registry manually

### Seed Management

#### Run Seeds

```bash
# Run all seeds
npm run db:admin seed run

# Run specific seed
npm run db:admin seed run basic_data

# List available seeds
npm run db:admin seed list

# Clear all data
npm run db:admin seed clear

# Clear and re-seed
npm run db:admin seed reset
```

### Backup Management

#### Create Backups

```bash
# Create backup with auto-generated name
npm run db:admin backup create

# Create backup with custom name
npm run db:admin backup create my_backup_name

# Create automatic backup (with cleanup)
npm run db:admin backup auto

# List all backups
npm run db:admin backup list
```

#### Restore from Backup

```bash
# Restore from specific backup
npm run db:admin restore backup_2024-01-15T10-30-00
```

**⚠️ Warning:** Restore operations will overwrite the current database. Always create a backup before restoring.

### Database Analysis

#### Performance Analysis

```bash
# Analyze query performance
npm run db:admin analyze performance

# Analyze index usage
npm run db:admin analyze indexes

# Check data integrity
npm run db:admin analyze integrity

# Analyze database size
npm run db:admin analyze size

# Run complete analysis
npm run db:admin analyze all
```

### System Status

#### Overall Status

```bash
# Show complete database status
npm run db:admin status
```

This command shows:

- Migration status
- Database size information
- Recent backups
- Quick health check

### Complete Reset

#### Full Database Reset

```bash
# Complete database reset with backup
npm run db:admin reset
```

This command:

1. Creates a backup before reset
2. Rolls back all migrations
3. Runs all migrations
4. Runs all seeds

## Backup System

### Automatic Backups

- Auto backups are created with timestamp names
- Old auto backups are automatically cleaned (keeps last 10)
- Backups include metadata files with creation info

### Backup Storage

- Backups stored in `backups/` directory
- Each backup consists of:
  - `.db` file (SQLite database copy)
  - `.json` file (metadata)

### Backup Verification

- Backups can be verified for integrity
- Verification checks if backup file can be opened
- Runs SQLite integrity check on backup

## Analysis Tools

### Performance Monitoring

- Query plan analysis for common operations
- Index usage recommendations
- Slow query identification

### Index Analysis

- Lists all custom indexes
- Provides index usage statistics
- Suggests missing indexes for common queries

### Data Integrity Checks

- SQLite built-in integrity check
- Foreign key constraint validation
- Business logic consistency checks
- Orphaned record detection

### Size Analysis

- Overall database size metrics
- Per-table size breakdown
- Row count statistics
- Average row size calculations

## Configuration

### Environment Variables

```bash
DATABASE_PATH=/path/to/database.db    # Custom database location
NODE_ENV=development                  # Enable verbose logging
```

### Directory Structure

```
data/
├── postia.db                        # Main database file
└── postia.db-wal                    # WAL file (if using WAL mode)

backups/
├── backup_2024-01-15T10-30-00.db    # Backup database file
├── backup_2024-01-15T10-30-00.json  # Backup metadata
└── auto_backup_*.db                  # Automatic backups
```

## Best Practices

### Regular Maintenance

1. **Daily**: Check status with `npm run db:admin status`
2. **Weekly**: Run integrity check with `npm run db:admin analyze integrity`
3. **Monthly**: Run complete analysis with `npm run db:admin analyze all`

### Before Major Changes

1. Create backup: `npm run db:admin backup create pre_update`
2. Test migrations on copy
3. Run integrity check after changes

### Performance Optimization

1. Monitor slow queries regularly
2. Add suggested indexes for frequently used queries
3. Analyze database size growth trends
4. Clean up orphaned records

### Backup Strategy

1. Automatic backups run before major operations
2. Manual backups before deployments
3. Keep multiple backup generations
4. Test restore procedures regularly

## Troubleshooting

### Common Issues

#### Database Locked

```bash
# Check for active connections
lsof data/postia.db

# Force close and restart
npm run db:admin status
```

#### Corruption Detection

```bash
# Run integrity check
npm run db:admin analyze integrity

# If corruption found, restore from backup
npm run db:admin restore <backup_name>
```

#### Performance Issues

```bash
# Analyze performance
npm run db:admin analyze performance

# Check for missing indexes
npm run db:admin analyze indexes

# Analyze database size
npm run db:admin analyze size
```

#### Migration Failures

```bash
# Check migration status
npm run db:admin migrate status

# Rollback to known good state
npm run db:admin migrate down <version>

# Fix migration and retry
npm run db:admin migrate up
```

## Development Workflow

### Adding New Migrations

1. Create migration: `npm run db:admin migrate create "description"`
2. Edit generated file in `src/lib/database/migrations/`
3. Add to migrations registry
4. Test: `npm run db:admin migrate up`
5. Test rollback: `npm run db:admin migrate down <version>`

### Adding New Seeds

1. Create seed file in `src/lib/database/seeds/`
2. Add to seeds registry
3. Test: `npm run db:admin seed run <seed_name>`

### Testing Changes

1. Create backup: `npm run db:admin backup create test_backup`
2. Apply changes
3. Run integrity check: `npm run db:admin analyze integrity`
4. If issues, restore: `npm run db:admin restore test_backup`

## Security Considerations

- Backups contain sensitive data - store securely
- Database files should not be committed to version control
- Use environment variables for database paths in production
- Regular integrity checks help detect tampering
- Backup verification ensures backup reliability

## Performance Tips

- Use WAL mode for better concurrent access (enabled by default)
- Regular VACUUM operations (not automated - run manually when needed)
- Monitor index usage and add missing indexes
- Keep backup directory on fast storage
- Consider backup compression for large databases
