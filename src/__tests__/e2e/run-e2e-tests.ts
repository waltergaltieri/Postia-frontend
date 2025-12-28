/**
 * End-to-End Test Runner for AI Content Generation
 * 
 * Runs comprehensive end-to-end tests covering:
 * - Complete generation flow from step 4 to calendar
 * - Gemini API integration (when API keys available)
 * - UI flow and user interactions
 * - Error handling and edge cases
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import path from 'path'

interface TestSuite {
  name: string
  file: string
  description: string
  requiresApiKeys?: boolean
  timeout?: number
}

const testSuites: TestSuite[] = [
  {
    name: 'AI Content Generation Flow',
    file: 'ai-content-generation-flow.test.ts',
    description: 'Complete flow from step 4 to calendar visualization',
    timeout: 120000
  },
  {
    name: 'Gemini API Integration',
    file: 'gemini-api-integration.test.ts',
    description: 'Real API integration tests (requires API keys)',
    requiresApiKeys: true,
    timeout: 300000
  },
  {
    name: 'UI Generation Flow',
    file: 'ui-generation-flow.test.ts',
    description: 'User interface flow and interactions',
    timeout: 60000
  }
]

class E2ETestRunner {
  private hasApiKeys: boolean
  private testResults: Map<string, { passed: boolean; duration: number; error?: string }> = new Map()

  constructor() {
    this.hasApiKeys = this.checkApiKeys()
  }

  private checkApiKeys(): boolean {
    const geminiKey = process.env.GEMINI_API_KEY
    const nanoBananaKey = process.env.NANO_BANANA_API_KEY
    
    return !!(geminiKey && geminiKey !== 'test-gemini-key' && 
              nanoBananaKey && nanoBananaKey !== 'test-nano-banana-key')
  }

  private checkDatabaseSetup(): boolean {
    const dbPath = process.env.DATABASE_PATH || './data/postia.db'
    return existsSync(dbPath) || process.env.DATABASE_PATH === ':memory:'
  }

  private async runTestSuite(suite: TestSuite): Promise<void> {
    console.log(`\n🧪 Running ${suite.name}...`)
    console.log(`   ${suite.description}`)

    if (suite.requiresApiKeys && !this.hasApiKeys) {
      console.log(`   ⏭️  Skipped (requires API keys)`)
      this.testResults.set(suite.name, { passed: true, duration: 0 })
      return
    }

    const startTime = Date.now()
    
    try {
      const testFile = path.join(__dirname, suite.file)
      const timeout = suite.timeout || 60000
      
      execSync(`npx vitest run ${testFile} --reporter=verbose --testTimeout=${timeout}`, {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'test'
        }
      })

      const duration = Date.now() - startTime
      console.log(`   ✅ Passed (${duration}ms)`)
      this.testResults.set(suite.name, { passed: true, duration })

    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : String(error)
      console.log(`   ❌ Failed (${duration}ms)`)
      console.log(`   Error: ${errorMessage}`)
      this.testResults.set(suite.name, { passed: false, duration, error: errorMessage })
    }
  }

  private printSummary(): void {
    console.log('\n📊 Test Summary')
    console.log('================')

    let totalPassed = 0
    let totalFailed = 0
    let totalDuration = 0

    for (const [suiteName, result] of this.testResults) {
      const status = result.passed ? '✅' : '❌'
      const duration = result.duration > 0 ? `(${result.duration}ms)` : '(skipped)'
      
      console.log(`${status} ${suiteName} ${duration}`)
      
      if (result.error) {
        console.log(`    Error: ${result.error}`)
      }

      if (result.passed) {
        totalPassed++
      } else {
        totalFailed++
      }
      
      totalDuration += result.duration
    }

    console.log(`\nTotal: ${totalPassed + totalFailed} suites`)
    console.log(`Passed: ${totalPassed}`)
    console.log(`Failed: ${totalFailed}`)
    console.log(`Duration: ${totalDuration}ms`)

    if (totalFailed > 0) {
      console.log('\n❌ Some tests failed. Check the output above for details.')
      process.exit(1)
    } else {
      console.log('\n✅ All tests passed!')
    }
  }

  private printEnvironmentInfo(): void {
    console.log('🔧 Environment Information')
    console.log('==========================')
    console.log(`Node.js: ${process.version}`)
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`Database: ${process.env.DATABASE_PATH || 'default'}`)
    console.log(`API Keys Available: ${this.hasApiKeys ? 'Yes' : 'No'}`)
    console.log(`Database Setup: ${this.checkDatabaseSetup() ? 'Yes' : 'No'}`)
    
    if (!this.hasApiKeys) {
      console.log('\n⚠️  API integration tests will be skipped')
      console.log('   Set GEMINI_API_KEY and NANO_BANANA_API_KEY to run full tests')
    }
  }

  async runAll(): Promise<void> {
    console.log('🚀 Starting End-to-End Tests for AI Content Generation')
    console.log('======================================================')

    this.printEnvironmentInfo()

    // Check prerequisites
    if (!this.checkDatabaseSetup()) {
      console.log('\n❌ Database not properly set up')
      console.log('   Run database migrations before running tests')
      process.exit(1)
    }

    // Run all test suites
    for (const suite of testSuites) {
      await this.runTestSuite(suite)
    }

    this.printSummary()
  }

  async runSpecific(suiteName: string): Promise<void> {
    const suite = testSuites.find(s => s.name.toLowerCase().includes(suiteName.toLowerCase()))
    
    if (!suite) {
      console.log(`❌ Test suite "${suiteName}" not found`)
      console.log('Available suites:')
      testSuites.forEach(s => console.log(`  - ${s.name}`))
      process.exit(1)
    }

    console.log(`🚀 Running specific test suite: ${suite.name}`)
    this.printEnvironmentInfo()
    
    await this.runTestSuite(suite)
    this.printSummary()
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2)
  const runner = new E2ETestRunner()

  if (args.length === 0) {
    await runner.runAll()
  } else if (args[0] === '--suite' && args[1]) {
    await runner.runSpecific(args[1])
  } else if (args[0] === '--help' || args[0] === '-h') {
    console.log('End-to-End Test Runner for AI Content Generation')
    console.log('')
    console.log('Usage:')
    console.log('  npm run test:e2e                    # Run all E2E tests')
    console.log('  npm run test:e2e --suite flow       # Run specific test suite')
    console.log('  npm run test:e2e --suite api        # Run API integration tests')
    console.log('  npm run test:e2e --suite ui         # Run UI flow tests')
    console.log('')
    console.log('Available test suites:')
    testSuites.forEach(suite => {
      console.log(`  - ${suite.name}: ${suite.description}`)
    })
    console.log('')
    console.log('Environment variables:')
    console.log('  GEMINI_API_KEY         # Required for API integration tests')
    console.log('  NANO_BANANA_API_KEY    # Required for image generation tests')
    console.log('  DATABASE_PATH          # Database path (default: ./data/postia.db)')
  } else {
    console.log('❌ Invalid arguments. Use --help for usage information.')
    process.exit(1)
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Test runner failed:', error)
    process.exit(1)
  })
}

export { E2ETestRunner, testSuites }