# Database Validation and Error Handling System

This document explains how to use the comprehensive validation and error handling system implemented for the Postia database layer.

## Overview

The system provides:

- **DatabaseValidations**: Business rule validations and access control
- **Error Handling**: Structured error types and automatic error transformation
- **Logging**: Comprehensive operation logging and performance monitoring
- **Recovery**: Automatic recovery from transient database errors

## Components

### 1. DatabaseValidations

Located in `validations/DatabaseValidations.ts`, this class provides static methods for validating business rules and data integrity.

#### Access Control Validations

```typescript
import { DatabaseValidations } from '../validations/DatabaseValidations'

// Validate workspace belongs to agency
const hasAccess = DatabaseValidations.validateWorkspaceAccess(
  workspaceId,
  agencyId
)

// Validate user belongs to agency
const userAccess = DatabaseValidations.validateUserAccess(userId, agencyId)

// Validate resource belongs to workspace
const resourceAccess = DatabaseValidations.validateResourceAccess(
  resourceId,
  workspaceId
)
```

#### Usage Validations

```typescript
// Check if resource can be deleted
const resourceUsage = DatabaseValidations.validateResourceUsage(resourceId)
if (!resourceUsage.canDelete) {
  console.log('Cannot delete:', resourceUsage.usage)
}

// Check if template can be deleted
const templateUsage = DatabaseValidations.validateTemplateUsage(templateId)
if (!templateUsage.canDelete) {
  console.log('Cannot delete:', templateUsage.usage)
}
```

#### Date and Configuration Validations

```typescript
// Validate campaign dates
const dateValidation = DatabaseValidations.validateCampaignDates(
  startDate,
  endDate
)
if (!dateValidation.isValid) {
  console.log('Date errors:', dateValidation.errors)
}

// Validate branding configuration
const brandingValidation = DatabaseValidations.validateBranding({
  primaryColor: '#9333ea',
  secondaryColor: '#737373',
  logo: 'https://example.com/logo.png',
})
```

### 2. Error Handling

The error handling system provides structured error types and automatic error transformation.

#### Error Types

```typescript
import {
  DatabaseError,
  ValidationError,
  AccessDeniedError,
  RecordNotFoundError,
  ResourceInUseError,
  BusinessRuleError,
} from '../errors'

// Validation errors
throw new ValidationError(['Name is required', 'Email is invalid'])

// Access control errors
throw new AccessDeniedError('workspace', 'delete', userId)

// Record not found errors
throw new RecordNotFoundError('workspaces', workspaceId)

// Resource in use errors
throw new ResourceInUseError('template', templateId, [
  'Used in 3 active campaigns',
])

// Business rule violations
throw new BusinessRuleError('Cannot delete workspace with active campaigns')
```

#### Error Handler Usage

```typescript
import { DatabaseErrorHandler } from '../errors';

// Wrap synchronous operations
const result = DatabaseErrorHandler.wrapSyncOperation(() => {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
}, { operation: 'findUser', userId });

// Wrap asynchronous operations
const result = await DatabaseErrorHandler.wrapOperation(async () => {
  return await someAsyncDatabaseOperation();
}, { operation: 'asyncOperation' });

// Execute with retry logic
const result = DatabaseErrorHandler.executeWithRetry(
  db,
  (database) => {
    return database.prepare('INSERT INTO ...').run(...);
  },
  3, // max retries
  { operation: 'insertRecord' }
);
```

### 3. Logging

The logging system tracks all database operations, errors, and performance metrics.

#### Basic Logging

```typescript
import { DatabaseLogger } from '../errors'

// Log different levels
DatabaseLogger.error('Database connection failed', { error: errorMessage })
DatabaseLogger.warn('Slow query detected', {
  duration: 1500,
  query: 'SELECT ...',
})
DatabaseLogger.info('Operation completed successfully', {
  operation: 'createUser',
})
DatabaseLogger.debug('Query parameters', { params: [userId, name] })
```

#### Performance Logging

```typescript
// Log query performance
DatabaseLogger.logQuery('SELECT * FROM users WHERE id = ?', 150, {
  operation: 'findUser',
  userId: 'abc123',
})

// Log transaction performance
DatabaseLogger.logTransaction('createCampaign', 300, true, {
  campaignId: 'xyz789',
})
```

#### Connection and Migration Logging

```typescript
// Log connection events
DatabaseLogger.logConnection('connect', { database: 'postia.db' })
DatabaseLogger.logConnection('error', { error: 'Connection timeout' })

// Log migration events
DatabaseLogger.logMigration(5, 'up', true, 250)
DatabaseLogger.logMigration(4, 'down', false, undefined, migrationError)
```

### 4. Enhanced Repository Pattern

The `EnhancedBaseRepository` integrates all validation and error handling features.

#### Basic Usage

```typescript
import { EnhancedBaseRepository } from './EnhancedBaseRepository'

class UserRepository extends EnhancedBaseRepository<
  User,
  CreateUserData,
  UpdateUserData
> {
  constructor() {
    super('users')
  }

  // Implement required abstract methods
  protected mapRowToEntity(row: any): User {
    return {
      id: row.id,
      email: row.email,
      // ... other fields
    }
  }

  protected mapEntityToRow(data: CreateUserData | UpdateUserData): any {
    return {
      email: data.email,
      // ... other fields
    }
  }

  protected getCreateValidationErrors(data: CreateUserData): string[] {
    const errors: string[] = []
    if (!data.email) errors.push('Email is required')
    return errors
  }

  protected getUpdateValidationErrors(data: UpdateUserData): string[] {
    const errors: string[] = []
    if (data.email === '') errors.push('Email cannot be empty')
    return errors
  }

  protected validateDeletion(id: string): void {
    // Check if user can be deleted
    const hasActiveWorkspaces = this.executeQuery(
      this.getStatement(
        'checkWorkspaces',
        'SELECT 1 FROM workspaces WHERE user_id = ?'
      ),
      [id],
      'checkWorkspaces'
    )

    if (hasActiveWorkspaces) {
      throw new BusinessRuleError('Cannot delete user with active workspaces')
    }
  }
}
```

#### Advanced Features

```typescript
class WorkspaceRepository extends EnhancedBaseRepository<...> {
  // Method with access validation
  updateWithAccessValidation(id: string, data: UpdateWorkspaceData, userAgencyId: string): Workspace {
    // Validate access
    if (!DatabaseValidations.validateWorkspaceAccess(id, userAgencyId)) {
      throw new AccessDeniedError('workspace', 'update', undefined, {
        workspaceId: id,
        userAgencyId
      });
    }

    return this.update(id, data);
  }

  // Method with business rule validation
  deleteWithValidation(id: string): boolean {
    const validation = DatabaseValidations.validateWorkspaceDeletion(id);

    if (!validation.canDelete) {
      throw new BusinessRuleError(
        `Cannot delete workspace: ${validation.errors.join(', ')}`,
        { workspaceId: id, errors: validation.errors }
      );
    }

    return this.delete(id);
  }
}
```

## Error Response Format

For API endpoints, use the standardized error response format:

```typescript
import { DatabaseErrorHandler, isDatabaseError } from '../errors'

try {
  const result = await repository.create(data)
  return { success: true, data: result }
} catch (error) {
  if (isDatabaseError(error)) {
    return DatabaseErrorHandler.createErrorResponse(error)
  }

  // Handle other errors
  throw error
}
```

This returns a consistent error format:

```json
{
  "success": false,
  "error": {
    "code": "DB_VALIDATION_ERROR",
    "message": "Validation failed: Name is required, Email is invalid",
    "details": {
      "operation": "create",
      "table": "users"
    },
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

## Log Files

The system creates three log files in the `logs/` directory:

- `database.log`: General database operations and events
- `database-errors.log`: Error-specific logs for debugging
- `database-performance.log`: Query and transaction performance metrics

## Best Practices

1. **Always use validation methods** before performing operations
2. **Wrap database operations** with error handlers
3. **Use appropriate error types** for different scenarios
4. **Log important operations** for audit trails
5. **Validate access permissions** before data operations
6. **Check resource usage** before deletions
7. **Use transactions** for multi-step operations

## Configuration

Set environment variables to control logging behavior:

```bash
# Set log level (ERROR, WARN, INFO, DEBUG)
NODE_ENV=development  # Enables DEBUG level logging

# Database path
DATABASE_PATH=./data/postia.db
```

## Testing

The validation and error handling system is designed to be testable:

```typescript
import { DatabaseValidations, ValidationError } from '../database'

describe('DatabaseValidations', () => {
  test('should validate campaign dates', () => {
    const futureDate = new Date(Date.now() + 86400000) // tomorrow
    const laterDate = new Date(Date.now() + 172800000) // day after tomorrow

    const result = DatabaseValidations.validateCampaignDates(
      futureDate,
      laterDate
    )
    expect(result.isValid).toBe(true)
  })

  test('should reject invalid dates', () => {
    const pastDate = new Date(Date.now() - 86400000) // yesterday
    const futureDate = new Date(Date.now() + 86400000) // tomorrow

    const result = DatabaseValidations.validateCampaignDates(
      pastDate,
      futureDate
    )
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('La fecha de inicio debe ser en el futuro')
  })
})
```
