# Content Generation Orchestrator

## Overview

The Content Generation Orchestrator is the main component that coordinates all AI agents for generating campaign content. It implements task 4 from the AI Content Generation specification.

## Components Implemented

### 1. ContentGenerationOrchestrator
**File**: `ContentGenerationOrchestrator.ts`

Main orchestrator that coordinates all specialized agents and manages the complete content generation flow.

**Key Features**:
- Sequential publication processing
- Agent routing by content type (text-only, text-image, text-template, carousel)
- Real-time progress tracking
- Automatic error recovery
- Database persistence
- Generation cancellation
- Concurrent generation prevention

**Methods**:
- `generateCampaignContent()` - Main method to process entire campaign
- `getGenerationProgress()` - Get current progress status
- `cancelGeneration()` - Cancel active generation
- `isGenerationActive()` - Check if generation is running

### 2. ProgressTrackingService
**File**: `ProgressTrackingService.ts`

Specialized service for real-time progress tracking with intelligent time estimation.

**Key Features**:
- Real-time progress monitoring
- Time estimation based on actual performance
- Progress caching for performance
- Error tracking per publication
- Completion status management

**Methods**:
- `createProgress()` - Initialize progress tracking
- `updateCurrentPublication()` - Update current processing status
- `incrementCompleted()` - Mark publication as completed
- `addError()` - Record generation errors
- `completeProgress()` - Mark generation as finished

### 3. ErrorHandlingService
**File**: `ErrorHandlingService.ts`

Intelligent error recovery system with multiple strategies and automatic retries.

**Key Features**:
- Automatic retry with exponential backoff
- Multiple recovery strategies (fallback agents, content optimization, etc.)
- Error classification (retryable vs non-retryable)
- Error history tracking
- User notifications
- Intelligent strategy selection

**Recovery Strategies**:
- `exponential_backoff` - For rate limits
- `retry_with_timeout` - For network issues
- `fallback_agent` - For API failures
- `simplified_generation` - For resource issues
- `content_optimization` - For length limits
- `standard_retry` - Default strategy

### 4. DatabaseService (Placeholder)
**File**: `../database/DatabaseService.ts`

Placeholder database service for data persistence operations.

**Note**: This is a placeholder implementation that logs operations. In production, this should be replaced with actual database operations using the existing SQLite setup.

## Usage Example

```typescript
import { createContentGenerationOrchestrator } from './orchestrator'

const orchestrator = createContentGenerationOrchestrator()

// Generate content for entire campaign
await orchestrator.generateCampaignContent({
  campaignId: 'campaign-123',
  contentPlan: contentPlanItems,
  workspace: workspaceData,
  resources: resourcesArray,
  templates: templatesArray
})

// Monitor progress
const progress = await orchestrator.getGenerationProgress('campaign-123')
console.log(`Progress: ${progress.completedPublications}/${progress.totalPublications}`)

// Cancel if needed
await orchestrator.cancelGeneration('campaign-123')
```

## Integration with Existing System

The orchestrator integrates with:

1. **Specialized Agents** (from `../agents/`):
   - TextOnlyAgent
   - TextImageAgent  
   - TextTemplateAgent
   - CarouselAgent

2. **Database Layer** (placeholder):
   - Campaign status updates
   - Publication creation
   - Progress persistence

3. **UI Components** (existing):
   - ContentGenerationLoadingScreen
   - GenerationProgressIndicator
   - GenerationNotifications

## Testing

Comprehensive test suite included:

- **ContentGenerationOrchestrator.test.ts**: Full orchestrator integration tests
- **ProgressTrackingService.test.ts**: Progress tracking functionality
- **ErrorHandlingService.test.ts**: Error recovery scenarios
- **orchestrator-integration.test.ts**: Overall integration verification

## Requirements Fulfilled

This implementation fulfills the following requirements from the specification:

- **1.1, 1.2, 1.3**: Campaign content generation with progress tracking
- **7.1, 7.2**: Real-time progress monitoring and tracking
- **7.5, 9.3, 9.4**: Error handling, recovery, and user notifications

## Next Steps

1. Replace DatabaseService placeholder with actual database implementation
2. Integrate with existing campaign creation flow
3. Connect with ContentGenerationLoadingScreen component
4. Add API endpoints for progress monitoring
5. Implement WebSocket/polling for real-time updates

## Architecture

```
ContentGenerationOrchestrator
├── ProgressTrackingService (progress monitoring)
├── ErrorHandlingService (error recovery)
├── DatabaseService (data persistence)
└── Specialized Agents
    ├── TextOnlyAgent
    ├── TextImageAgent
    ├── TextTemplateAgent
    └── CarouselAgent
```

The orchestrator follows a clean architecture pattern with separation of concerns, making it easy to test, maintain, and extend.