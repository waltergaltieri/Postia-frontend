# Database Seeds

This directory contains seed files for populating the database with sample data for development and testing purposes.

## Overview

The seed system provides comprehensive sample data that covers all aspects of the Postia MVP, including:

- Multiple agencies with different plans and configurations
- Users with various roles across agencies
- Workspaces with diverse branding and settings
- Resources (images and videos) with realistic metadata
- Templates for different content types and social networks
- Campaigns in various states (active, draft, completed, paused)
- Publications with different statuses and scheduling scenarios
- Social account connections with realistic authentication states

## Available Seeds

### 1. Basic Data Seed (`001_basic_data.ts`)

Creates foundational data including:

- **3 Agencies**: Demo (Pro plan), Startup (Free plan), Enterprise (Enterprise plan)
- **8 Users**: Distributed across agencies with admin and member roles
- **9 Workspaces**: Each with unique branding, colors, and business descriptions
- **19 Resources**: Mix of images and videos with realistic file metadata
- **16 Templates**: Single and carousel templates for different social networks
- **16 Social Accounts**: Connected and disconnected accounts across platforms

**Business Scenarios Covered:**

- Restaurant/Food industry (La Tradición)
- Fitness/Health industry (Fitness Revolution)
- Technology/Software (TechSolutions Pro)
- Fashion/Retail (Boutique Elegance)
- Sustainability/Eco-friendly (EcoFriendly Store)
- Remote Work/Digital Nomads (Digital Nomad Hub)
- Finance/Corporate (Global Finance Corp)
- Healthcare (Healthcare Innovation)
- Education (Education Excellence)

### 2. Campaign Data Seed (`002_campaign_data.ts`)

Creates comprehensive campaign and publication data:

- **12 Campaigns**: Covering all possible states and scenarios
  - 4 Active campaigns with ongoing content
  - 3 Draft campaigns ready for launch
  - 3 Completed campaigns (historical data)
  - 2 Paused campaigns for testing resume functionality

- **20 Publications**: Diverse publication scenarios
  - 4 Published (historical data with external post IDs)
  - 13 Scheduled (future publications for calendar testing)
  - 2 Failed (with realistic error messages)
  - 1 Cancelled (for testing cancellation workflows)

**Campaign Types:**

- Seasonal promotions (Winter menu, Spring collection)
- Motivational content (New Year fitness, 30-day challenges)
- Product launches (Cloud services, fashion collections)
- Corporate communications (Annual reports, webinar series)
- Community building (Digital nomad networks)

## Usage

### Running Seeds

```bash
# List available seeds
npm run db:seed list

# Run all seeds
npm run db:seed run

# Run specific seed
npm run db:seed run basic_data
npm run db:seed run campaign_data

# Clear all data
npm run db:seed clear

# Reset database (clear + run all seeds)
npm run db:seed reset
```

### Data Management

```bash
# Show database statistics
npm run db:data stats

# Check database integrity
npm run db:data integrity

# Clear specific data
npm run db:data clear test
npm run db:data clear campaigns,publications

# Create backup
npm run db:data backup > backup.sql

# Generate test scenarios
npm run db:data scenario empty_agency
```

## Data Structure

### Agency Distribution

- **Demo Agency**: Full-featured with 4 workspaces (restaurant, fitness, tech, boutique)
- **Startup Agency**: 2 workspaces (eco-store, nomad hub) - simulates growing business
- **Enterprise Agency**: 3 workspaces (finance, healthcare, education) - corporate scenarios

### User Roles

- **Admin users**: Full access to agency settings and all workspaces
- **Member users**: Limited access, workspace-specific permissions

### Campaign States

- **Active**: Currently running campaigns with scheduled publications
- **Draft**: Prepared campaigns ready for activation
- **Completed**: Historical campaigns with published content
- **Paused**: Temporarily stopped campaigns for testing resume functionality

### Publication States

- **Scheduled**: Future publications for calendar and scheduling testing
- **Published**: Historical content with external platform IDs
- **Failed**: Error scenarios with realistic failure messages
- **Cancelled**: Cancelled publications for workflow testing

## Testing Scenarios

The seed data supports comprehensive testing of:

1. **Multi-tenancy**: Different agencies with isolated data
2. **User permissions**: Admin vs member access patterns
3. **Campaign lifecycle**: All states and transitions
4. **Publication scheduling**: Past, present, and future content
5. **Error handling**: Failed publications and error recovery
6. **Social media integration**: Connected and disconnected accounts
7. **Content management**: Resources, templates, and campaigns
8. **Dashboard analytics**: Statistics and reporting data
9. **Calendar functionality**: Scheduled and published content
10. **Data integrity**: Referential integrity and constraints

## Customization

### Adding New Seeds

1. Create a new seed file in this directory
2. Implement the `Seed` interface
3. Add to `registry.ts`
4. Document the seed purpose and data structure

### Modifying Existing Seeds

When modifying seeds:

- Maintain referential integrity
- Update documentation
- Test with `npm run db:data integrity`
- Ensure backward compatibility

### Data Relationships

The seed data maintains proper relationships:

- Agencies → Users, Workspaces
- Workspaces → Resources, Templates, Campaigns, Social Accounts
- Campaigns → Publications, Resources (many-to-many), Templates (many-to-many)
- Publications → Campaigns, Templates, Resources

## Best Practices

1. **Realistic Data**: Use business-appropriate names, descriptions, and scenarios
2. **Comprehensive Coverage**: Include edge cases and error scenarios
3. **Referential Integrity**: Maintain proper foreign key relationships
4. **Temporal Data**: Include past, present, and future dates for testing
5. **Error Scenarios**: Include failed states for robust testing
6. **Performance Testing**: Provide sufficient data volume for performance validation

## Troubleshooting

### Common Issues

1. **Unique Constraint Errors**: Clear existing data before re-running seeds
2. **Foreign Key Errors**: Ensure parent records exist before creating children
3. **Date Issues**: Verify date formats and ranges are valid
4. **JSON Fields**: Ensure proper JSON formatting for arrays and objects

### Validation

```bash
# Check for data integrity issues
npm run db:data integrity

# Validate specific aspects
npm run db:data validate
```

### Recovery

```bash
# Complete reset
npm run db:reset

# Clear and re-seed
npm run db:seed clear && npm run db:seed run
```
