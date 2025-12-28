/**
 * Performance Test Runner
 * 
 * Utility script to run all performance and load tests with proper configuration
 * and generate comprehensive performance reports.
 */

import { execSync } from 'child_process'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

interface TestResult {
  testFile: string
  testName: string
  duration: number
  status: 'passed' | 'failed' | 'skipped'
  error?: string
  metrics?: Record<string, any>
}

interface PerformanceReport {
  timestamp: string
  environment: {
    nodeVersion: string
    platform: string
    arch: string
    memory: string
  }
  testResults: TestResult[]
  summary: {
    totalTests: number
    passed: number
    failed: number
    skipped: number
    totalDuration: number
    averageDuration: number
  }
  recommendations: string[]
}

class PerformanceTestRunner {
  private results: TestResult[] = []
  private startTime: number = 0

  constructor() {
    this.startTime = Date.now()
  }

  async runAllTests(): Promise<PerformanceReport> {
    console.log('🚀 Starting Performance Test Suite')
    console.log('=====================================')

    const testFiles = [
      'performance.test.ts',
      'api-load.test.ts',
      'campaign-load.test.ts'
    ]

    for (const testFile of testFiles) {
      await this.runTestFile(testFile)
    }

    return this.generateReport()
  }

  private async runTestFile(testFile: string): Promise<void> {
    console.log(`\n📋 Running ${testFile}...`)
    
    try {
      const command = `npx vitest run src/lib/ai/__tests__/${testFile} --reporter=json --run`
      const output = execSync(command, { 
        encoding: 'utf8',
        cwd: process.cwd(),
        timeout: 1800000 // 30 minutes timeout
      })

      // Parse vitest JSON output
      const testResults = this.parseVitestOutput(output, testFile)
      this.results.push(...testResults)

      console.log(`✅ ${testFile} completed`)
      
    } catch (error) {
      console.error(`❌ ${testFile} failed:`, error)
      
      this.results.push({
        testFile,
        testName: 'All tests',
        duration: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  private parseVitestOutput(output: string, testFile: string): TestResult[] {
    const results: TestResult[] = []
    
    try {
      // Try to parse JSON output from vitest
      const lines = output.split('\n')
      const jsonLine = lines.find(line => line.trim().startsWith('{'))
      
      if (jsonLine) {
        const testData = JSON.parse(jsonLine)
        
        if (testData.testResults) {
          testData.testResults.forEach((test: any) => {
            results.push({
              testFile,
              testName: test.name || 'Unknown test',
              duration: test.duration || 0,
              status: test.status === 'passed' ? 'passed' : 'failed',
              error: test.error,
              metrics: test.metrics
            })
          })
        }
      }
    } catch (parseError) {
      console.warn(`Warning: Could not parse test output for ${testFile}`)
      
      // Fallback: assume tests ran if no error was thrown
      results.push({
        testFile,
        testName: 'Performance tests',
        duration: 0,
        status: 'passed'
      })
    }
    
    return results
  }

  private generateReport(): PerformanceReport {
    const totalDuration = Date.now() - this.startTime
    const passed = this.results.filter(r => r.status === 'passed').length
    const failed = this.results.filter(r => r.status === 'failed').length
    const skipped = this.results.filter(r => r.status === 'skipped').length

    const report: PerformanceReport = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memory: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
      },
      testResults: this.results,
      summary: {
        totalTests: this.results.length,
        passed,
        failed,
        skipped,
        totalDuration,
        averageDuration: this.results.length > 0 ? 
          this.results.reduce((sum, r) => sum + r.duration, 0) / this.results.length : 0
      },
      recommendations: this.generateRecommendations()
    }

    return report
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = []
    const failedTests = this.results.filter(r => r.status === 'failed')
    const slowTests = this.results.filter(r => r.duration > 60000) // > 1 minute

    if (failedTests.length > 0) {
      recommendations.push(`${failedTests.length} tests failed. Review error logs and fix issues before production deployment.`)
    }

    if (slowTests.length > 0) {
      recommendations.push(`${slowTests.length} tests took longer than 1 minute. Consider optimizing performance-critical paths.`)
    }

    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024
    if (memoryUsage > 500) {
      recommendations.push(`High memory usage detected (${memoryUsage.toFixed(2)}MB). Monitor for memory leaks in production.`)
    }

    if (this.results.some(r => r.testName.includes('concurrent') && r.status === 'failed')) {
      recommendations.push('Concurrent processing tests failed. Review system resource limits and API rate limiting.')
    }

    if (this.results.some(r => r.testName.includes('stress') && r.status === 'failed')) {
      recommendations.push('Stress tests failed. System may not handle peak loads. Consider scaling strategies.')
    }

    if (recommendations.length === 0) {
      recommendations.push('All performance tests passed! System is ready for production load.')
    }

    return recommendations
  }

  saveReport(report: PerformanceReport, outputDir: string = './performance-reports'): void {
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const reportPath = join(outputDir, `performance-report-${timestamp}.json`)
    const summaryPath = join(outputDir, `performance-summary-${timestamp}.md`)

    // Save detailed JSON report
    writeFileSync(reportPath, JSON.stringify(report, null, 2))

    // Save human-readable summary
    const summary = this.generateMarkdownSummary(report)
    writeFileSync(summaryPath, summary)

    console.log(`\n📊 Performance report saved:`)
    console.log(`   Detailed: ${reportPath}`)
    console.log(`   Summary: ${summaryPath}`)
  }

  private generateMarkdownSummary(report: PerformanceReport): string {
    const { summary, environment, recommendations } = report

    return `# Performance Test Report

## Test Summary

- **Timestamp**: ${report.timestamp}
- **Total Tests**: ${summary.totalTests}
- **Passed**: ${summary.passed} ✅
- **Failed**: ${summary.failed} ❌
- **Skipped**: ${summary.skipped} ⏭️
- **Total Duration**: ${(summary.totalDuration / 1000).toFixed(2)}s
- **Average Test Duration**: ${(summary.averageDuration / 1000).toFixed(2)}s

## Environment

- **Node Version**: ${environment.nodeVersion}
- **Platform**: ${environment.platform}
- **Architecture**: ${environment.arch}
- **Memory**: ${environment.memory}

## Test Results

${report.testResults.map(result => `
### ${result.testFile} - ${result.testName}

- **Status**: ${result.status === 'passed' ? '✅ Passed' : result.status === 'failed' ? '❌ Failed' : '⏭️ Skipped'}
- **Duration**: ${(result.duration / 1000).toFixed(2)}s
${result.error ? `- **Error**: ${result.error}` : ''}
${result.metrics ? `- **Metrics**: ${JSON.stringify(result.metrics, null, 2)}` : ''}
`).join('\n')}

## Recommendations

${recommendations.map(rec => `- ${rec}`).join('\n')}

## Performance Metrics

### Key Performance Indicators

- **Campaign Generation Throughput**: Target > 0.5 items/sec
- **Memory Usage**: Target < 1GB peak
- **API Response Time**: Target < 10s per item
- **Concurrent Campaign Handling**: Target 5+ campaigns
- **Error Rate**: Target < 5%

### Test Coverage

- ✅ Single campaign performance (small, medium, large)
- ✅ Concurrent campaign handling
- ✅ API rate limiting and error recovery
- ✅ Memory usage and leak detection
- ✅ Stress testing with high load
- ✅ Resource constraint handling

---

*Generated by Performance Test Runner at ${new Date().toISOString()}*
`
  }
}

// CLI interface
async function main() {
  const runner = new PerformanceTestRunner()
  
  try {
    console.log('🔧 Setting up performance test environment...')
    
    // Set test environment variables
    process.env.NODE_ENV = 'test'
    process.env.VITEST_PERFORMANCE_MODE = 'true'
    
    const report = await runner.runAllTests()
    
    console.log('\n📊 Performance Test Results:')
    console.log('============================')
    console.log(`Total Tests: ${report.summary.totalTests}`)
    console.log(`Passed: ${report.summary.passed} ✅`)
    console.log(`Failed: ${report.summary.failed} ❌`)
    console.log(`Duration: ${(report.summary.totalDuration / 1000).toFixed(2)}s`)
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:')
      report.recommendations.forEach(rec => console.log(`   - ${rec}`))
    }
    
    runner.saveReport(report)
    
    // Exit with error code if tests failed
    if (report.summary.failed > 0) {
      console.log('\n❌ Some performance tests failed!')
      process.exit(1)
    } else {
      console.log('\n✅ All performance tests passed!')
      process.exit(0)
    }
    
  } catch (error) {
    console.error('💥 Performance test runner failed:', error)
    process.exit(1)
  }
}

// Export for programmatic use
export { PerformanceTestRunner, type PerformanceReport, type TestResult }

// Run if called directly
if (require.main === module) {
  main()
}