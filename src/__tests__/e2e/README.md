# End-to-End Tests for AI Content Generation

This directory contains comprehensive end-to-end tests for the AI content generation system, covering the complete flow from step 4 (content plan confirmation) to calendar visualization.

## Test Coverage

### Requirements Covered

- **1.1**: Complete generation flow from step 4 to calendar
- **2.1**: Calendar visualization of generated content  
- **8.1**: Integration with Gemini APIs for text and image generation

### Test Suites

#### 1. AI Content Generation Flow (`ai-content-generation-flow.test.ts`)
- **Purpose**: Tests the complete backend flow from content plan to database persistence
- **Coverage**:
  - Content generation orchestration
  - All four agent types (text-only, text-image, text-template, carousel)
  - Database persistence of generated content
  - Progress tracking and error handling
  - Performance under load
  - Data integrity validation

#### 2. Gemini API Integration (`gemini-api-integration.test.ts`)
- **Purpose**: Tests real integration with Gemini APIs (requires API keys)
- **Coverage**:
  - Gemini text generation service
  - Nano Banana image generation service
  - API error handling and retry mechanisms
  - Rate limiting and quota management
  - Content quality validation
  - Performance and reliability testing

#### 3. UI Generation Flow (`ui-generation-flow.test.ts`)
- **Purpose**: Tests the complete user interface flow
- **Coverage**:
  - Step 4 to loading screen transition
  - Progress indicators and real-time updates
  - Error handling in UI
  - Calendar visualization of generated content
  - Publication detail modals
  - Regeneration functionality

## Running Tests

### Prerequisites

1. **Database Setup**: Ensure database is initialized with migrations
   ```bash
   npm run db:migrate
   ```

2. **API Keys** (optional, for integration tests):
   ```bash
   export GEMINI_API_KEY="your-gemini-api-key"
   export NANO_BANANA_API_KEY="your-nano-banana-key"
   ```

### Running All Tests

```bash
# Run all end-to-end tests
npm run test:e2e

# Or using the test runner directly
npx tsx src/__tests__/e2e/run-e2e-tests.ts
```

### Running Specific Test Suites

```bash
# Run only the main flow tests
npm run test:e2e --suite flow

# Run only API integration tests (requires API keys)
npm run test:e2e --suite api

# Run only UI flow tests
npm run test:e2e --suite ui
```

### Running Individual Test Files

```bash
# Run specific test file
npx vitest run src/__tests__/e2e/ai-content-generation-flow.test.ts

# Run with verbose output
npx vitest run src/__tests__/e2e/ai-content-generation-flow.test.ts --reporter=verbose

# Run with specific timeout
npx vitest run src/__tests__/e2e/gemini-api-integration.test.ts --timeout=300000
```

## Test Environment

### Environment Variables

- `NODE_ENV=test` - Set automatically by test runner
- `DATABASE_PATH=:memory:` - Uses in-memory database for tests
- `GEMINI_API_KEY` - Required for API integration tests
- `NANO_BANANA_API_KEY` - Required for image generation tests

### Mock Configuration

Tests use comprehensive mocking for:
- External API calls (when not testing real integration)
- Database operations (with in-memory database)
- File system operations
- Next.js router and navigation
- Redux store state

## Test Data

### Mock Content Plan
```typescript
const mockContentPlan = [
  {
    id: 'plan-1',
    socialNetwork: 'instagram',
    contentType: 'text-image',
    idea: 'Showcase new product features',
    scheduledDate: new Date('2024-02-15T10:00:00Z'),
    resourceIds: ['resource-1'],
    templateId: 'template-1'
  },
  // ... more items
]
```

### Mock Generated Content
```typescript
const mockGeneratedContent = {
  text: 'Generated Instagram content with hashtags #product #innovation',
  imageUrl: 'https://generated.com/instagram.jpg',
  metadata: {
    agentUsed: 'text-image',
    processingTimeMs: 4000,
    retryCount: 0
  }
}
```

## Performance Expectations

### Response Times
- **Text Generation**: < 15 seconds average
- **Image Generation**: < 45 seconds average
- **Complete Campaign**: < 2 minutes for 4 publications
- **UI Responsiveness**: < 100ms for user interactions

### Load Testing
- **Concurrent Generations**: Up to 3 simultaneous campaigns
- **Publication Volume**: Up to 10 publications per campaign
- **Memory Usage**: < 500MB during generation

## Error Scenarios Tested

### API Errors
- Network timeouts
- Rate limit exceeded
- Invalid API keys
- Quota exhaustion
- Malformed responses

### Generation Errors
- Invalid content plans
- Missing resources/templates
- Agent failures
- Partial generation failures

### UI Errors
- Network disconnections
- Invalid user inputs
- Navigation errors
- State management issues

## Debugging Tests

### Verbose Output
```bash
npx vitest run src/__tests__/e2e/ai-content-generation-flow.test.ts --reporter=verbose
```

### Debug Mode
```bash
DEBUG=1 npx vitest run src/__tests__/e2e/ai-content-generation-flow.test.ts
```

### Browser DevTools (for UI tests)
```bash
npx vitest run src/__tests__/e2e/ui-generation-flow.test.ts --ui
```

## Continuous Integration

### GitHub Actions Configuration
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run db:migrate
      - run: npm run test:e2e
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          NANO_BANANA_API_KEY: ${{ secrets.NANO_BANANA_API_KEY }}
```

### Test Reports
Tests generate detailed reports including:
- Test execution times
- API response times
- Memory usage statistics
- Error logs and stack traces
- Coverage reports

## Maintenance

### Adding New Tests
1. Create test file in appropriate category
2. Follow existing naming conventions
3. Include comprehensive error scenarios
4. Add performance expectations
5. Update this README

### Updating Mock Data
1. Keep mock data synchronized with real API responses
2. Update test expectations when APIs change
3. Maintain backward compatibility where possible

### Performance Monitoring
1. Monitor test execution times
2. Update performance expectations as needed
3. Investigate and fix performance regressions
4. Add new performance tests for new features

## Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Ensure database is properly initialized
npm run db:migrate
```

#### API Key Issues
```bash
# Check API keys are set correctly
echo $GEMINI_API_KEY
echo $NANO_BANANA_API_KEY
```

#### Memory Issues
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
```

#### Timeout Issues
```bash
# Increase test timeout
npx vitest run --timeout=300000
```

### Getting Help

1. Check test output for specific error messages
2. Review mock configurations for accuracy
3. Verify environment setup matches requirements
4. Check API service status if integration tests fail
5. Review recent changes that might affect test behavior

## Contributing

When adding new end-to-end tests:

1. **Follow the pattern**: Use existing tests as templates
2. **Test real scenarios**: Focus on actual user workflows
3. **Include error cases**: Test both success and failure paths
4. **Document expectations**: Clearly state what each test validates
5. **Maintain performance**: Ensure tests run efficiently
6. **Update documentation**: Keep this README current