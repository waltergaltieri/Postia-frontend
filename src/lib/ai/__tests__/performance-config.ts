/**
 * Performance Test Configuration
 * 
 * Centralized configuration for all performance and load tests.
 * Adjust these values based on your system capabilities and requirements.
 */

export interface PerformanceTestConfig {
  // Campaign size configurations
  campaigns: {
    small: number
    medium: number
    large: number
    xlarge: number
  }
  
  // Concurrency limits
  concurrency: {
    maxConcurrentCampaigns: number
    maxConcurrentRequests: number
    stressTestCampaigns: number
  }
  
  // Performance thresholds
  thresholds: {
    maxMemoryUsageMB: number
    expectedGenerationTimePerItemMS: number
    maxTimeoutPerItemMS: number
    expectedThroughputItemsPerSec: number
    maxErrorRate: number
    minSuccessRate: number
  }
  
  // API rate limiting
  apiLimits: {
    rateLimitRPM: number
    burstSize: number
    retryAttempts: number
    backoffBaseMS: number
    apiTimeoutMS: number
  }
  
  // Test execution settings
  execution: {
    testTimeoutMS: number
    memorySnapshotIntervalMS: number
    progressReportingIntervalMS: number
    batchProcessingDelay: number
  }
  
  // Mock API response times (for realistic testing)
  mockApiTiming: {
    textGenerationBaseMS: number
    imageGenerationBaseMS: number
    responseVariance: number
    errorRate: number
  }
}

// Default configuration - adjust based on your system
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceTestConfig = {
  campaigns: {
    small: 5,
    medium: 15,
    large: 30,
    xlarge: 50
  },
  
  concurrency: {
    maxConcurrentCampaigns: 5,
    maxConcurrentRequests: 10,
    stressTestCampaigns: 15
  },
  
  thresholds: {
    maxMemoryUsageMB: 1000,
    expectedGenerationTimePerItemMS: 5000,
    maxTimeoutPerItemMS: 15000,
    expectedThroughputItemsPerSec: 0.5,
    maxErrorRate: 0.05, // 5%
    minSuccessRate: 0.95 // 95%
  },
  
  apiLimits: {
    rateLimitRPM: 60,
    burstSize: 10,
    retryAttempts: 3,
    backoffBaseMS: 1000,
    apiTimeoutMS: 30000
  },
  
  execution: {
    testTimeoutMS: 600000, // 10 minutes
    memorySnapshotIntervalMS: 2000,
    progressReportingIntervalMS: 5000,
    batchProcessingDelay: 1000
  },
  
  mockApiTiming: {
    textGenerationBaseMS: 2000,
    imageGenerationBaseMS: 5000,
    responseVariance: 0.3, // 30% variance
    errorRate: 0.05 // 5% error rate
  }
}

// Environment-specific configurations
export const PERFORMANCE_CONFIGS = {
  // Configuration for CI/CD environments (faster, less resource intensive)
  ci: {
    ...DEFAULT_PERFORMANCE_CONFIG,
    campaigns: {
      small: 3,
      medium: 8,
      large: 15,
      xlarge: 25
    },
    concurrency: {
      maxConcurrentCampaigns: 3,
      maxConcurrentRequests: 5,
      stressTestCampaigns: 8
    },
    thresholds: {
      ...DEFAULT_PERFORMANCE_CONFIG.thresholds,
      maxMemoryUsageMB: 500,
      expectedGenerationTimePerItemMS: 3000
    },
    execution: {
      ...DEFAULT_PERFORMANCE_CONFIG.execution,
      testTimeoutMS: 300000 // 5 minutes
    }
  },
  
  // Configuration for local development (moderate load)
  development: {
    ...DEFAULT_PERFORMANCE_CONFIG,
    campaigns: {
      small: 5,
      medium: 12,
      large: 25,
      xlarge: 40
    },
    concurrency: {
      maxConcurrentCampaigns: 4,
      maxConcurrentRequests: 8,
      stressTestCampaigns: 12
    }
  },
  
  // Configuration for production-like testing (full load)
  production: {
    ...DEFAULT_PERFORMANCE_CONFIG,
    campaigns: {
      small: 10,
      medium: 25,
      large: 50,
      xlarge: 100
    },
    concurrency: {
      maxConcurrentCampaigns: 10,
      maxConcurrentRequests: 20,
      stressTestCampaigns: 25
    },
    thresholds: {
      ...DEFAULT_PERFORMANCE_CONFIG.thresholds,
      maxMemoryUsageMB: 2000,
      expectedThroughputItemsPerSec: 1.0
    },
    execution: {
      ...DEFAULT_PERFORMANCE_CONFIG.execution,
      testTimeoutMS: 1200000 // 20 minutes
    }
  }
}

/**
 * Get performance configuration based on environment
 */
export function getPerformanceConfig(): PerformanceTestConfig {
  const env = process.env.NODE_ENV || 'development'
  const testEnv = process.env.PERFORMANCE_TEST_ENV || env
  
  switch (testEnv) {
    case 'ci':
      return PERFORMANCE_CONFIGS.ci
    case 'production':
      return PERFORMANCE_CONFIGS.production
    case 'development':
    default:
      return PERFORMANCE_CONFIGS.development
  }
}

/**
 * Performance test categories and their descriptions
 */
export const TEST_CATEGORIES = {
  unit: {
    name: 'Unit Performance Tests',
    description: 'Test individual component performance',
    timeout: 60000 // 1 minute
  },
  
  integration: {
    name: 'Integration Performance Tests',
    description: 'Test end-to-end workflow performance',
    timeout: 300000 // 5 minutes
  },
  
  load: {
    name: 'Load Tests',
    description: 'Test system behavior under expected load',
    timeout: 600000 // 10 minutes
  },
  
  stress: {
    name: 'Stress Tests',
    description: 'Test system behavior under extreme load',
    timeout: 1200000 // 20 minutes
  },
  
  endurance: {
    name: 'Endurance Tests',
    description: 'Test system behavior over extended periods',
    timeout: 3600000 // 1 hour
  }
}

/**
 * Performance metrics definitions
 */
export const PERFORMANCE_METRICS = {
  throughput: {
    name: 'Throughput',
    unit: 'items/second',
    description: 'Number of content items generated per second'
  },
  
  latency: {
    name: 'Latency',
    unit: 'milliseconds',
    description: 'Time taken to generate a single content item'
  },
  
  memory: {
    name: 'Memory Usage',
    unit: 'MB',
    description: 'Peak memory consumption during generation'
  },
  
  errorRate: {
    name: 'Error Rate',
    unit: 'percentage',
    description: 'Percentage of failed generation attempts'
  },
  
  concurrency: {
    name: 'Concurrency',
    unit: 'campaigns',
    description: 'Number of campaigns processed simultaneously'
  },
  
  scalability: {
    name: 'Scalability',
    unit: 'ratio',
    description: 'Performance degradation with increased load'
  }
}

/**
 * Test data generators configuration
 */
export const TEST_DATA_CONFIG = {
  workspace: {
    industries: ['Technology', 'Healthcare', 'Finance', 'Education', 'Retail'],
    brandVoices: ['Professional', 'Casual', 'Authoritative', 'Friendly', 'Technical'],
    contentPillars: [
      ['Innovation', 'Quality', 'Service'],
      ['Education', 'Community', 'Growth'],
      ['Reliability', 'Expertise', 'Trust'],
      ['Creativity', 'Collaboration', 'Excellence']
    ]
  },
  
  content: {
    types: ['text-only', 'text-with-image', 'text-with-template', 'text-with-carousel'],
    socialNetworks: ['linkedin', 'instagram', 'twitter', 'facebook'],
    hashtagSets: [
      ['#tech', '#innovation', '#digital'],
      ['#business', '#growth', '#success'],
      ['#education', '#learning', '#development'],
      ['#health', '#wellness', '#lifestyle']
    ]
  },
  
  resources: {
    types: ['image', 'video', 'document'],
    sizes: [1024 * 1024, 2 * 1024 * 1024, 5 * 1024 * 1024], // 1MB, 2MB, 5MB
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4']
  },
  
  templates: {
    types: ['single', 'carousel'],
    categories: ['social', 'marketing', 'educational', 'promotional'],
    textFieldSets: [
      ['title', 'description'],
      ['headline', 'body', 'cta'],
      ['slide1', 'slide2', 'slide3'],
      ['header', 'content', 'footer']
    ]
  }
}

/**
 * Utility function to create test-specific configuration
 */
export function createTestConfig(overrides: Partial<PerformanceTestConfig> = {}): PerformanceTestConfig {
  const baseConfig = getPerformanceConfig()
  
  return {
    ...baseConfig,
    ...overrides,
    campaigns: { ...baseConfig.campaigns, ...overrides.campaigns },
    concurrency: { ...baseConfig.concurrency, ...overrides.concurrency },
    thresholds: { ...baseConfig.thresholds, ...overrides.thresholds },
    apiLimits: { ...baseConfig.apiLimits, ...overrides.apiLimits },
    execution: { ...baseConfig.execution, ...overrides.execution },
    mockApiTiming: { ...baseConfig.mockApiTiming, ...overrides.mockApiTiming }
  }
}

/**
 * Validate performance test configuration
 */
export function validateConfig(config: PerformanceTestConfig): string[] {
  const errors: string[] = []
  
  if (config.campaigns.small <= 0) {
    errors.push('Small campaign size must be greater than 0')
  }
  
  if (config.campaigns.medium <= config.campaigns.small) {
    errors.push('Medium campaign size must be greater than small campaign size')
  }
  
  if (config.campaigns.large <= config.campaigns.medium) {
    errors.push('Large campaign size must be greater than medium campaign size')
  }
  
  if (config.thresholds.maxMemoryUsageMB <= 0) {
    errors.push('Maximum memory usage must be greater than 0')
  }
  
  if (config.thresholds.expectedThroughputItemsPerSec <= 0) {
    errors.push('Expected throughput must be greater than 0')
  }
  
  if (config.thresholds.maxErrorRate < 0 || config.thresholds.maxErrorRate > 1) {
    errors.push('Maximum error rate must be between 0 and 1')
  }
  
  if (config.thresholds.minSuccessRate < 0 || config.thresholds.minSuccessRate > 1) {
    errors.push('Minimum success rate must be between 0 and 1')
  }
  
  if (config.apiLimits.rateLimitRPM <= 0) {
    errors.push('Rate limit RPM must be greater than 0')
  }
  
  return errors
}