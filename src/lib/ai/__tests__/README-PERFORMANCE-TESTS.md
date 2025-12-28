# Performance and Load Tests for AI Content Generation

This directory contains comprehensive performance and load tests for the AI content generation system. These tests validate that the system can handle production workloads efficiently and reliably.

## Test Files Overview

### 1. `performance.test.ts`
**Main Performance Tests**
- Single campaign performance (small, medium, large campaigns)
- Concurrent campaign load tests
- API rate limiting and error handling
- Resource usage and optimization
- Performance regression detection

### 2. `api-load.test.ts`
**API-Specific Load Tests**
- Gemini API rate limiting simulation
- Concurrent request handling
- Stress testing with high request volumes
- Error recovery and resilience testing
- Mixed API response time handling

### 3. `campaign-load.test.ts`
**Campaign Generation Load Tests**
- Complete campaign generation pipeline testing
- Multiple concurrent campaigns
- Mixed campaign sizes under load
- Memory constraint testing
- Stress testing with many campaigns

### 4. `run-performance-tests.ts`
**Test Runner and Reporting**
- Automated test execution
- Performance report generation
- Environment-specific configurations
- Comprehensive metrics collection

### 5. `performance-config.ts`
**Configuration Management**
- Centralized test configuration
- Environment-specific settings
- Performance thresholds and limits
- Test data generation parameters

## Running Performance Tests

### Quick Start
```bash
# Run all performance tests with default configuration
npm run test:performance

# Run performance tests for CI environment (faster, less resource intensive)
npm run test:performance:ci

# Run performance tests for production-like environment (full load)
npm run test:performance:prod

# Run only load tests using vitest directly
npm run test:load
```

### Individual Test Execution
```bash
# Run specific test file
npx vitest run src/lib/ai/__tests__/performance.test.ts

# Run with specific timeout
npx vitest run src/lib/ai/__tests__/campaign-load.test.ts --testTimeout=600000

# Run with verbose output
npx vitest run src/lib/ai/__tests__/api-load.test.ts --reporter=verbose
```

## Test Categories

### 1. Unit Performance Tests (1-5 minutes)
- Individual component performance
- Service response times
- Memory usage per operation
- Basic error handling

### 2. Integration Performance Tests (5-15 minutes)
- End-to-end workflow performance
- Multi-component interactions
- Database operations under load
- API integration performance

### 3. Load Tests (10-30 minutes)
- Expected production load simulation
- Multiple concurrent users/campaigns
- Sustained operation testing
- Resource utilization monitoring

### 4. Stress Tests (20-60 minutes)
- Beyond normal capacity testing
- System breaking point identification
- Recovery behavior validation
- Resource exhaustion scenarios

## Performance Metrics

### Key Performance Indicators (KPIs)

| Metric | Target | Critical Threshold |
|--------|--------|--------------------|
| **Throughput** | > 0.5 items/sec | < 0.2 items/sec |
| **Memory Usage** | < 1GB peak | > 2GB peak |
| **API Response Time** | < 10s per item | > 30s per item |
| **Concurrent Campaigns** | 5+ campaigns | < 2 campaigns |
| **Error Rate** | < 5% | > 15% |
| **Success Rate** | > 95% | < 80% |

### Measured Metrics

1. **Throughput**: Content items generated per second
2. **Latency**: Time to generate a single content item
3. **Memory Usage**: Peak and average memory consumption
4. **Error Rate**: Percentage of failed generation attempts
5. **Concurrency**: Number of simultaneous operations
6. **Scalability**: Performance degradation with increased load

## Test Configuration

### Environment Configurations

#### CI Environment (`PERFORMANCE_TEST_ENV=ci`)
- **Purpose**: Fast feedback in CI/CD pipelines
- **Campaign Sizes**: Small (3), Medium (8), Large (15)
- **Concurrency**: 3 campaigns, 5 requests
- **Timeout**: 5 minutes
- **Memory Limit**: 500MB

#### Development Environment (default)
- **Purpose**: Local development and testing
- **Campaign Sizes**: Small (5), Medium (12), Large (25)
- **Concurrency**: 4 campaigns, 8 requests
- **Timeout**: 10 minutes
- **Memory Limit**: 1GB

#### Production Environment (`PERFORMANCE_TEST_ENV=production`)
- **Purpose**: Production readiness validation
- **Campaign Sizes**: Small (10), Medium (25), Large (50)
- **Concurrency**: 10 campaigns, 20 requests
- **Timeout**: 20 minutes
- **Memory Limit**: 2GB

### Custom Configuration

You can create custom test configurations by modifying `performance-config.ts`:

```typescript
import { createTestConfig } from './performance-config'

const customConfig = createTestConfig({
  campaigns: {
    small: 8,
    medium: 20,
    large: 40,
    xlarge: 80
  },
  thresholds: {
    maxMemoryUsageMB: 1500,
    expectedThroughputItemsPerSec: 0.8
  }
})
```

## Test Data Generation

### Mock Data Types

1. **Workspaces**: Various industries, brand voices, content pillars
2. **Resources**: Different file types, sizes, and formats
3. **Templates**: Single and carousel templates with various configurations
4. **Content Plans**: Mixed content types, social networks, scheduling

### Realistic Simulation

- **API Response Times**: Configurable delays with variance
- **Error Rates**: Simulated API failures and recoveries
- **Rate Limiting**: Realistic API rate limit enforcement
- **Memory Pressure**: Large dataset processing simulation

## Performance Reports

### Report Generation

Performance tests automatically generate detailed reports:

```
performance-reports/
├── performance-report-2024-01-15T10-30-00.json    # Detailed JSON data
└── performance-summary-2024-01-15T10-30-00.md     # Human-readable summary
```

### Report Contents

1. **Test Summary**: Pass/fail counts, duration, environment info
2. **Individual Test Results**: Detailed metrics per test
3. **Performance Metrics**: Throughput, latency, memory usage
4. **Recommendations**: Actionable insights and optimizations
5. **Environment Information**: Node version, platform, resources

### Sample Report Structure

```markdown
# Performance Test Report

## Test Summary
- Total Tests: 25
- Passed: 23 ✅
- Failed: 2 ❌
- Total Duration: 15.3 minutes

## Key Metrics
- Average Throughput: 0.7 items/sec
- Peak Memory Usage: 850MB
- Average Response Time: 4.2s
- Error Rate: 2.1%

## Recommendations
- All performance tests passed!
- System is ready for production load.
```

## Troubleshooting

### Common Issues

#### 1. Memory Errors
```
Error: JavaScript heap out of memory
```
**Solution**: Reduce campaign sizes or increase Node.js memory limit:
```bash
NODE_OPTIONS="--max-old-space-size=4096" npm run test:performance
```

#### 2. Timeout Errors
```
Test timeout exceeded
```
**Solution**: Increase test timeout or use CI configuration:
```bash
npm run test:performance:ci
```

#### 3. API Rate Limiting
```
Rate limit exceeded
```
**Solution**: Adjust rate limiting configuration in `performance-config.ts`

#### 4. Concurrent Resource Conflicts
```
Database locked
```
**Solution**: Use separate test databases or reduce concurrency

### Performance Optimization Tips

1. **Memory Management**
   - Monitor memory usage during tests
   - Use garbage collection between test runs
   - Avoid memory leaks in test setup/teardown

2. **Test Isolation**
   - Use separate databases for concurrent tests
   - Clean up resources after each test
   - Avoid shared state between tests

3. **Realistic Testing**
   - Use production-like data volumes
   - Simulate real API response times
   - Test with actual network conditions

## Continuous Integration

### CI/CD Integration

Add performance tests to your CI pipeline:

```yaml
# .github/workflows/performance.yml
name: Performance Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:performance:ci
      - uses: actions/upload-artifact@v3
        with:
          name: performance-reports
          path: performance-reports/
```

### Performance Monitoring

Set up alerts for performance regressions:

1. **Threshold Monitoring**: Alert when metrics exceed thresholds
2. **Trend Analysis**: Track performance over time
3. **Regression Detection**: Compare against baseline performance
4. **Resource Monitoring**: Track memory and CPU usage

## Best Practices

### Test Design

1. **Realistic Scenarios**: Test with production-like data and load
2. **Incremental Load**: Start small and gradually increase load
3. **Error Simulation**: Include failure scenarios and recovery testing
4. **Resource Monitoring**: Track memory, CPU, and network usage

### Test Maintenance

1. **Regular Updates**: Keep tests aligned with system changes
2. **Baseline Updates**: Update performance baselines as system improves
3. **Configuration Review**: Regularly review and adjust test parameters
4. **Documentation**: Keep test documentation current and comprehensive

### Performance Culture

1. **Early Testing**: Include performance tests in development workflow
2. **Continuous Monitoring**: Run performance tests regularly
3. **Performance Budgets**: Set and enforce performance budgets
4. **Team Awareness**: Share performance results with the team

## Contributing

### Adding New Tests

1. Follow existing test patterns and naming conventions
2. Include comprehensive documentation and comments
3. Add appropriate configuration options
4. Update this README with new test information

### Modifying Configurations

1. Test changes with multiple environments
2. Update documentation for configuration changes
3. Consider backward compatibility
4. Validate thresholds with realistic expectations

---

For questions or issues with performance tests, please refer to the main project documentation or create an issue in the project repository.