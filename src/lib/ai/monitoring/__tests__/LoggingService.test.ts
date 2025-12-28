import { LoggingService } from '../LoggingService'
import { GenerationErrorFactory } from '../../types/errors'

describe('LoggingService', () => {
  let loggingService: LoggingService

  beforeEach(() => {
    loggingService = new LoggingService({
      level: 'debug',
      enableConsole: false, // Disable console for tests
      maxEntries: 100
    })
  })

  describe('basic logging', () => {
    it('should log debug messages', () => {
      loggingService.debug('Debug message', { key: 'value' })
      
      const logs = loggingService.getLogs({ level: 'debug' })
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('debug')
      expect(logs[0].message).toBe('Debug message')
      expect(logs[0].context).toEqual({ key: 'value' })
    })

    it('should log info messages', () => {
      loggingService.info('Info message', { info: 'data' })
      
      const logs = loggingService.getLogs({ level: 'info' })
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('info')
      expect(logs[0].message).toBe('Info message')
    })

    it('should log warning messages', () => {
      loggingService.warn('Warning message', { warning: 'data' })
      
      const logs = loggingService.getLogs({ level: 'warn' })
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('warn')
      expect(logs[0].message).toBe('Warning message')
    })

    it('should log error messages with error objects', () => {
      const error = GenerationErrorFactory.createGeminiError(
        'API failed',
        { model: 'gemini-pro' }
      )
      
      loggingService.error('Error occurred', error, { context: 'test' })
      
      const logs = loggingService.getLogs({ level: 'error' })
      expect(logs).toHaveLength(1)
      expect(logs[0].level).toBe('error')
      expect(logs[0].message).toBe('Error occurred')
      expect(logs[0].error).toEqual(error)
    })
  })

  describe('specialized logging methods', () => {
    it('should log AI operations', () => {
      loggingService.logAIOperation(
        'generateText',
        'text-only',
        'pub-123',
        'campaign-456',
        true,
        1500,
        { tokens: 100 }
      )
      
      const logs = loggingService.getLogs({ category: 'ai-generation' })
      expect(logs).toHaveLength(1)
      expect(logs[0].message).toContain('generateText')
      expect(logs[0].message).toContain('SUCCESS')
      expect(logs[0].context?.agentType).toBe('text-only')
      expect(logs[0].context?.duration).toBe(1500)
    })

    it('should log Gemini API calls', () => {
      loggingService.logGeminiAPI(
        'gemini-pro',
        'generateContent',
        true,
        2000,
        150
      )
      
      const logs = loggingService.getLogs({ category: 'gemini-api' })
      expect(logs).toHaveLength(1)
      expect(logs[0].message).toContain('gemini-pro')
      expect(logs[0].message).toContain('SUCCESS')
      expect(logs[0].context?.tokenCount).toBe(150)
    })

    it('should log Nano Banana operations', () => {
      loggingService.logNanoBanana(
        'generateImage',
        'job-789',
        true,
        5000,
        500000
      )
      
      const logs = loggingService.getLogs({ category: 'nano-banana' })
      expect(logs).toHaveLength(1)
      expect(logs[0].message).toContain('generateImage')
      expect(logs[0].message).toContain('SUCCESS')
      expect(logs[0].context?.imageSize).toBe(500000)
    })

    it('should log retry attempts', () => {
      const error = GenerationErrorFactory.createNetworkError('Connection failed')
      
      loggingService.logRetry(
        'generateText',
        2,
        3,
        1000,
        error
      )
      
      const logs = loggingService.getLogs({ category: 'retry-middleware' })
      expect(logs).toHaveLength(1)
      expect(logs[0].message).toContain('Attempt 2/3')
      expect(logs[0].message).toContain('Delay 1000ms')
      expect(logs[0].error).toEqual(error)
    })
  })

  describe('performance tracking', () => {
    it('should start and end performance tracking', () => {
      const trackingId = loggingService.startPerformanceTracking('testOperation', { test: true })
      
      expect(trackingId).toBeDefined()
      
      // Simulate some work
      const metric = loggingService.endPerformanceTracking(trackingId, true)
      
      expect(metric).toBeDefined()
      expect(metric?.success).toBe(true)
      expect(metric?.duration).toBeGreaterThan(0)
    })

    it('should handle performance tracking with errors', () => {
      const trackingId = loggingService.startPerformanceTracking('failedOperation')
      const error = GenerationErrorFactory.createGeminiError('Failed', { model: 'test' })
      
      const metric = loggingService.endPerformanceTracking(trackingId, false, error)
      
      expect(metric?.success).toBe(false)
      expect(metric?.error).toEqual(error)
    })

    it('should return null for unknown tracking ID', () => {
      const metric = loggingService.endPerformanceTracking('unknown-id', true)
      expect(metric).toBeNull()
    })
  })

  describe('error statistics', () => {
    it('should record error statistics', () => {
      const error = GenerationErrorFactory.createGeminiError('API failed', { model: 'gemini-pro' })
      
      loggingService.recordErrorStats(error, 'text-only')
      
      const stats = loggingService.getErrorStats('text-only')
      expect(stats).toHaveLength(1)
      expect(stats[0].totalErrors).toBe(1)
      expect(stats[0].errorsByType['GEMINI_API_FAILURE']).toBe(1)
      expect(stats[0].errorsByAgent['text-only']).toBe(1)
    })

    it('should accumulate error statistics', () => {
      const error1 = GenerationErrorFactory.createGeminiError('API failed', { model: 'gemini-pro' })
      const error2 = GenerationErrorFactory.createNetworkError('Network failed')
      
      loggingService.recordErrorStats(error1, 'text-only')
      loggingService.recordErrorStats(error2, 'text-only')
      
      const stats = loggingService.getErrorStats('text-only')
      expect(stats).toHaveLength(2) // One entry per error type
      
      const totalErrors = stats.reduce((sum, stat) => sum + stat.totalErrors, 0)
      expect(totalErrors).toBe(2)
    })
  })

  describe('log filtering', () => {
    beforeEach(() => {
      // Add various logs for filtering tests
      loggingService.debug('Debug message')
      loggingService.info('Info message', {}, 'test-category')
      loggingService.warn('Warning message')
      loggingService.error('Error message')
      
      loggingService.logAIOperation('op1', 'text-only', 'pub-1', 'camp-1', true, 1000)
      loggingService.logAIOperation('op2', 'text-image', 'pub-2', 'camp-2', false, 2000)
    })

    it('should filter by log level', () => {
      const errorLogs = loggingService.getLogs({ level: 'error' })
      expect(errorLogs.length).toBeGreaterThan(0)
      expect(errorLogs.every(log => ['error'].includes(log.level))).toBe(true)
      
      const warnAndAbove = loggingService.getLogs({ level: 'warn' })
      expect(warnAndAbove.every(log => ['warn', 'error'].includes(log.level))).toBe(true)
    })

    it('should filter by category', () => {
      const aiLogs = loggingService.getLogs({ category: 'ai-generation' })
      expect(aiLogs.length).toBe(2) // Two AI operations logged
      expect(aiLogs.every(log => log.category === 'ai-generation')).toBe(true)
    })

    it('should filter by publication ID', () => {
      const pub1Logs = loggingService.getLogs({ publicationId: 'pub-1' })
      expect(pub1Logs).toHaveLength(1)
      expect(pub1Logs[0].publicationId).toBe('pub-1')
    })

    it('should filter by campaign ID', () => {
      const camp1Logs = loggingService.getLogs({ campaignId: 'camp-1' })
      expect(camp1Logs).toHaveLength(1)
      expect(camp1Logs[0].campaignId).toBe('camp-1')
    })

    it('should filter by agent type', () => {
      const textOnlyLogs = loggingService.getLogs({ agentType: 'text-only' })
      expect(textOnlyLogs).toHaveLength(1)
      expect(textOnlyLogs[0].agentType).toBe('text-only')
    })

    it('should filter by time range', () => {
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      
      const recentLogs = loggingService.getLogs({ 
        startTime: oneHourAgo,
        endTime: now
      })
      
      expect(recentLogs.length).toBeGreaterThan(0)
      expect(recentLogs.every(log => 
        log.timestamp >= oneHourAgo && log.timestamp <= now
      )).toBe(true)
    })
  })

  describe('error report generation', () => {
    beforeEach(() => {
      // Add some errors and operations for report
      const error1 = GenerationErrorFactory.createGeminiError('API failed', { model: 'gemini-pro' })
      const error2 = GenerationErrorFactory.createNetworkError('Network failed')
      
      loggingService.recordErrorStats(error1, 'text-only')
      loggingService.recordErrorStats(error2, 'text-image')
      loggingService.recordErrorStats(error1, 'text-only') // Duplicate to test aggregation
      
      // Add some performance metrics
      const trackingId1 = loggingService.startPerformanceTracking('op1')
      loggingService.endPerformanceTracking(trackingId1, true)
      
      const trackingId2 = loggingService.startPerformanceTracking('op2')
      loggingService.endPerformanceTracking(trackingId2, false, error1)
    })

    it('should generate comprehensive error report', () => {
      const report = loggingService.generateErrorReport()
      
      expect(report.summary.totalErrors).toBe(3)
      expect(report.summary.errorRate).toBeGreaterThan(0)
      expect(report.summary.mostCommonError).toBe('GEMINI_API_FAILURE')
      expect(report.summary.mostProblematicAgent).toBe('text-only')
      
      expect(report.details).toHaveLength(2) // Two different error types
      expect(report.recommendations).toBeInstanceOf(Array)
    })

    it('should provide relevant recommendations', () => {
      // Create high error rate scenario
      const error = GenerationErrorFactory.createRateLimitError('Rate limited', 100, 0, new Date())
      for (let i = 0; i < 10; i++) {
        loggingService.recordErrorStats(error, 'text-only')
      }
      
      const report = loggingService.generateErrorReport()
      
      expect(report.recommendations.some(r => 
        r.includes('rate limiting') || r.includes('Rate limits')
      )).toBe(true)
    })
  })

  describe('log management', () => {
    it('should respect max entries limit', () => {
      const smallLoggingService = new LoggingService({
        maxEntries: 3,
        enableConsole: false
      })
      
      // Add more logs than the limit
      smallLoggingService.info('Log 1')
      smallLoggingService.info('Log 2')
      smallLoggingService.info('Log 3')
      smallLoggingService.info('Log 4')
      smallLoggingService.info('Log 5')
      
      const logs = smallLoggingService.getLogs()
      expect(logs).toHaveLength(3)
      
      // Should keep the most recent logs
      expect(logs[0].message).toBe('Log 5')
      expect(logs[1].message).toBe('Log 4')
      expect(logs[2].message).toBe('Log 3')
    })

    it('should clean up old logs', () => {
      // Add logs and then clean up
      loggingService.info('Old log')
      loggingService.info('Recent log')
      
      const removedCount = loggingService.cleanupOldLogs()
      
      // Since we just added logs, they shouldn't be cleaned up
      expect(removedCount).toBe(0)
      
      const logs = loggingService.getLogs()
      expect(logs.length).toBeGreaterThan(0)
    })

    it('should export logs to JSON', () => {
      loggingService.info('Test log for export', { test: true })
      
      const exported = loggingService.exportLogs()
      const parsed = JSON.parse(exported)
      
      expect(parsed.exportDate).toBeDefined()
      expect(parsed.totalLogs).toBeGreaterThan(0)
      expect(parsed.logs).toBeInstanceOf(Array)
      expect(parsed.config).toBeDefined()
    })

    it('should export filtered logs', () => {
      loggingService.info('Info log', {}, 'category1')
      loggingService.error('Error log', undefined, {}, 'category2')
      
      const exported = loggingService.exportLogs({ category: 'category1' })
      const parsed = JSON.parse(exported)
      
      expect(parsed.logs.every((log: any) => log.category === 'category1')).toBe(true)
    })
  })

  describe('service statistics', () => {
    beforeEach(() => {
      loggingService.debug('Debug log')
      loggingService.info('Info log', {}, 'test-category')
      loggingService.warn('Warning log')
      loggingService.error('Error log')
      
      const trackingId = loggingService.startPerformanceTracking('test-op')
      loggingService.endPerformanceTracking(trackingId, true)
    })

    it('should provide service statistics', () => {
      const stats = loggingService.getServiceStats()
      
      expect(stats.totalLogs).toBeGreaterThan(0)
      expect(stats.logsByLevel.debug).toBeGreaterThan(0)
      expect(stats.logsByLevel.info).toBeGreaterThan(0)
      expect(stats.logsByLevel.warn).toBeGreaterThan(0)
      expect(stats.logsByLevel.error).toBeGreaterThan(0)
      expect(stats.logsByCategory['test-category']).toBe(1)
      expect(stats.totalMetrics).toBeGreaterThan(0)
      expect(stats.memoryUsage).toBeGreaterThan(0)
    })
  })

  describe('configuration management', () => {
    it('should update configuration', () => {
      loggingService.updateConfig({
        level: 'error',
        maxEntries: 500
      })
      
      const config = loggingService.getConfig()
      expect(config.level).toBe('error')
      expect(config.maxEntries).toBe(500)
    })

    it('should respect log level filtering', () => {
      loggingService.updateConfig({ level: 'warn' })
      
      loggingService.debug('Debug message') // Should be filtered out
      loggingService.info('Info message')   // Should be filtered out
      loggingService.warn('Warning message') // Should be logged
      loggingService.error('Error message')  // Should be logged
      
      const logs = loggingService.getLogs()
      expect(logs.every(log => ['warn', 'error'].includes(log.level))).toBe(true)
    })

    it('should respect category filtering', () => {
      loggingService.updateConfig({ categories: ['allowed-category'] })
      
      loggingService.info('Allowed message', {}, 'allowed-category')
      loggingService.info('Filtered message', {}, 'filtered-category')
      
      const logs = loggingService.getLogs()
      expect(logs.every(log => log.category === 'allowed-category')).toBe(true)
    })
  })
})