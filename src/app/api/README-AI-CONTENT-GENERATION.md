# AI Content Generation APIs

This document describes the APIs implemented for real content generation after step 4 of the campaign creation process.

## Campaign Generation APIs

### POST /api/campaigns/[id]/generate-content
**Purpose**: Activate real content generation after step 4 confirmation

**Request Body**:
```typescript
{
  contentPlan: ContentPlanItem[]
  workspace: WorkspaceData
  resources: ResourceData[]
  templates: TemplateData[]
}
```

**Response**:
```typescript
{
  generationId: string
  campaignId: string
  status: 'started'
  totalPublications: number
  message: string
}
```

**Features**:
- Validates campaign existence and user access
- Starts asynchronous content generation using ContentGenerationOrchestrator
- Returns immediate response with generation ID
- Prevents duplicate generations for the same campaign

### GET /api/campaigns/[id]/generation-progress
**Purpose**: Get real-time generation progress and status

**Response**:
```typescript
{
  campaignId: string
  status: 'not_started' | 'in_progress' | 'completed' | 'completed_with_errors' | 'failed'
  progress: {
    total: number
    completed: number
    percentage: number
  }
  currentPublication: {
    id: string
    step: string
  } | null
  currentAgent: string | null
  currentStep: string | null
  errors: Array<{
    publicationId: string
    agentType: string
    message: string
    timestamp: Date
    retryCount: number
  }>
  estimatedTimeRemaining: number | null
  isActive: boolean
  startedAt: Date
  completedAt: Date | null
  generationStats: {
    successfulPublications: number
    failedPublications: number
    totalProcessingTime: number
  }
}
```

**Features**:
- Real-time progress tracking
- Detailed error reporting
- Time estimation
- Processing statistics

### POST /api/campaigns/[id]/cancel-generation
**Purpose**: Cancel ongoing content generation process

**Response**:
```typescript
{
  campaignId: string
  cancelled: boolean
  status: 'cancelled' | 'not_active'
  cancellationTime: string
  progressAtCancellation: {
    total: number
    completed: number
    percentage: number
    errors: number
  } | null
  message: string
}
```

**Features**:
- Safe cancellation of active generations
- Progress snapshot at cancellation time
- Proper cleanup of resources

## Specialized Agent APIs

### POST /api/ai/agents/text-only
**Purpose**: Direct access to TextOnlyAgent for text-only content generation

**Request Body**:
```typescript
{
  contentPlan: ContentPlanItem
  workspace: WorkspaceData
}
```

**Response**:
```typescript
{
  success: boolean
  agentType: 'text-only'
  publicationId: string
  result: {
    text: string
    metadata: GenerationMetadata
  }
  processingStats: {
    processingTimeMs: number
    textLength: number
    socialNetwork: string
    contentType: string
  }
}
```

### POST /api/ai/agents/text-image
**Purpose**: Direct access to TextImageAgent for text + simple image generation

**Request Body**:
```typescript
{
  contentPlan: ContentPlanItem
  workspace: WorkspaceData
  resources: ResourceData[]
}
```

**Response**:
```typescript
{
  success: boolean
  agentType: 'text-image'
  publicationId: string
  result: {
    text: string
    imageUrl: string
    metadata: GenerationMetadata
  }
  processingStats: {
    processingTimeMs: number
    textLength: number
    imageGenerated: boolean
    resourcesCount: number
    socialNetwork: string
    contentType: string
  }
}
```

### POST /api/ai/agents/text-template
**Purpose**: Direct access to TextTemplateAgent for text + template-based image generation

**Request Body**:
```typescript
{
  contentPlan: ContentPlanItem
  workspace: WorkspaceData
  resources: ResourceData[]
  template: TemplateData
}
```

**Response**:
```typescript
{
  success: boolean
  agentType: 'text-template'
  publicationId: string
  result: {
    text: string
    imageUrl: string
    templateTexts: Record<string, string>
    metadata: GenerationMetadata
  }
  processingStats: {
    processingTimeMs: number
    textLength: number
    imageGenerated: boolean
    templateTextsCount: number
    resourcesCount: number
    templateId: string
    templateName: string
    socialNetwork: string
    contentType: string
  }
}
```

### POST /api/ai/agents/carousel
**Purpose**: Direct access to CarouselAgent for carousel content generation

**Request Body**:
```typescript
{
  contentPlan: ContentPlanItem
  workspace: WorkspaceData
  resources: ResourceData[]
  template: TemplateData
}
```

**Response**:
```typescript
{
  success: boolean
  agentType: 'carousel'
  publicationId: string
  result: {
    text: string
    imageUrls: string[]
    templateTexts: Record<string, string>[]
    metadata: GenerationMetadata
  }
  processingStats: {
    processingTimeMs: number
    textLength: number
    carouselImagesCount: number
    templateTextsCount: number
    resourcesCount: number
    templateId: string
    templateName: string
    socialNetwork: string
    contentType: string
  }
}
```

## Authentication & Authorization

All APIs use the `withAuth` middleware which:
- Validates Bearer tokens
- Extracts user information
- Ensures agency-level access control
- Provides error handling for unauthorized requests

## Error Handling

All APIs implement consistent error handling:
- 401: Authentication required/invalid
- 403: Access denied
- 404: Resource not found
- 400: Validation errors
- 500: Internal server errors

## Integration with ContentGenerationOrchestrator

The main generation API integrates with the ContentGenerationOrchestrator which:
- Routes content to appropriate specialized agents
- Manages sequential processing
- Tracks progress in real-time
- Handles error recovery
- Persists results to database
- Manages generation lifecycle

## Usage Flow

1. User completes step 4 of campaign creation
2. Frontend calls `POST /api/campaigns/[id]/generate-content` with content plan
3. API starts asynchronous generation and returns immediately
4. Frontend polls `GET /api/campaigns/[id]/generation-progress` for updates
5. User can cancel with `POST /api/campaigns/[id]/cancel-generation` if needed
6. Once complete, user is redirected to campaign list/calendar

## Direct Agent Usage

The specialized agent endpoints can be used for:
- Testing individual agents
- Custom content generation workflows
- Debugging generation issues
- Manual content regeneration