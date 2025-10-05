export interface MonitoringConfiguration {
  // Performance thresholds
  performance: {
    slowQueryThreshold: number // milliseconds
    criticalQueryThreshold: number // milliseconds
    maxQueryTime: number // milliseconds
    memoryWarningThreshold: number // bytes
    memoryCriticalThreshold: number // bytes
  }

  // Alert settings
  alerts: {
    enabled: boolean
    retentionDays: number
    emailNotifications: boolean
    webhookUrl?: string
    severityLevels: {
      low: { color: string; icon: string }
      medium: { color: string; icon: string }
      high: { color: string; icon: string }
      critical: { color: string; icon: string }
    }
  }

  // Logging configuration
  logging: {
    enabled: boolean
    retentionDays: number
    maxFileSize: number // bytes
    logLevel: 'debug' | 'info' | 'warn' | 'error'
    includeQueryParameters: boolean
    truncateQueryLength: number
  }

  // Health check settings
  healthCheck: {
    intervalMinutes: number
    checks: {
      integrity: boolean
      walSize: boolean
      lockTimeout: boolean
      diskSpace: boolean
    }
    walSizeWarningMB: number
    diskSpaceWarningPercent: number
  }

  // Backup settings
  backup: {
    autoBackupEnabled: boolean
    autoBackupIntervalHours: number
    maxAutoBackups: number
    compressionEnabled: boolean
    verifyBackups: boolean
  }

  // Analysis settings
  analysis: {
    indexUsageTracking: boolean
    queryPatternAnalysis: boolean
    performanceTrendAnalysis: boolean
    suggestOptimizations: boolean
  }
}

export const defaultMonitoringConfig: MonitoringConfiguration = {
  performance: {
    slowQueryThreshold: 1000, // 1 second
    criticalQueryThreshold: 5000, // 5 seconds
    maxQueryTime: 30000, // 30 seconds
    memoryWarningThreshold: 100 * 1024 * 1024, // 100MB
    memoryCriticalThreshold: 500 * 1024 * 1024, // 500MB
  },

  alerts: {
    enabled: true,
    retentionDays: 30,
    emailNotifications: false,
    severityLevels: {
      low: { color: 'green', icon: '🟢' },
      medium: { color: 'yellow', icon: '🟡' },
      high: { color: 'orange', icon: '🟠' },
      critical: { color: 'red', icon: '🔴' },
    },
  },

  logging: {
    enabled: true,
    retentionDays: 30,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    logLevel: 'info',
    includeQueryParameters: false,
    truncateQueryLength: 200,
  },

  healthCheck: {
    intervalMinutes: 15,
    checks: {
      integrity: true,
      walSize: true,
      lockTimeout: true,
      diskSpace: true,
    },
    walSizeWarningMB: 100,
    diskSpaceWarningPercent: 85,
  },

  backup: {
    autoBackupEnabled: true,
    autoBackupIntervalHours: 24,
    maxAutoBackups: 10,
    compressionEnabled: false,
    verifyBackups: true,
  },

  analysis: {
    indexUsageTracking: true,
    queryPatternAnalysis: true,
    performanceTrendAnalysis: true,
    suggestOptimizations: true,
  },
}

export class MonitoringConfigManager {
  private configPath: string
  private config: MonitoringConfiguration

  constructor(configPath?: string) {
    this.configPath = configPath || 'monitoring-config.json'
    this.config = this.loadConfig()
  }

  private loadConfig(): MonitoringConfiguration {
    try {
      const fs = require('fs')
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8')
        const loadedConfig = JSON.parse(configData)

        // Merge with defaults to ensure all properties exist
        return this.mergeWithDefaults(loadedConfig)
      }
    } catch (error) {
      console.warn('Failed to load monitoring config, using defaults:', error)
    }

    return { ...defaultMonitoringConfig }
  }

  private mergeWithDefaults(
    config: Partial<MonitoringConfiguration>
  ): MonitoringConfiguration {
    return {
      performance: {
        ...defaultMonitoringConfig.performance,
        ...config.performance,
      },
      alerts: { ...defaultMonitoringConfig.alerts, ...config.alerts },
      logging: { ...defaultMonitoringConfig.logging, ...config.logging },
      healthCheck: {
        ...defaultMonitoringConfig.healthCheck,
        ...config.healthCheck,
      },
      backup: { ...defaultMonitoringConfig.backup, ...config.backup },
      analysis: { ...defaultMonitoringConfig.analysis, ...config.analysis },
    }
  }

  getConfig(): MonitoringConfiguration {
    return { ...this.config }
  }

  updateConfig(updates: Partial<MonitoringConfiguration>): void {
    this.config = this.mergeWithDefaults({ ...this.config, ...updates })
    this.saveConfig()
  }

  saveConfig(): void {
    try {
      const fs = require('fs')
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2))
    } catch (error) {
      console.error('Failed to save monitoring config:', error)
    }
  }

  resetToDefaults(): void {
    this.config = { ...defaultMonitoringConfig }
    this.saveConfig()
  }

  // Validation methods
  validateConfig(): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    // Validate performance thresholds
    if (this.config.performance.slowQueryThreshold <= 0) {
      errors.push('Slow query threshold must be positive')
    }

    if (
      this.config.performance.criticalQueryThreshold <=
      this.config.performance.slowQueryThreshold
    ) {
      errors.push(
        'Critical query threshold must be greater than slow query threshold'
      )
    }

    // Validate retention periods
    if (this.config.alerts.retentionDays <= 0) {
      errors.push('Alert retention days must be positive')
    }

    if (this.config.logging.retentionDays <= 0) {
      errors.push('Log retention days must be positive')
    }

    // Validate health check interval
    if (this.config.healthCheck.intervalMinutes <= 0) {
      errors.push('Health check interval must be positive')
    }

    // Validate backup settings
    if (this.config.backup.autoBackupIntervalHours <= 0) {
      errors.push('Auto backup interval must be positive')
    }

    if (this.config.backup.maxAutoBackups <= 0) {
      errors.push('Max auto backups must be positive')
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  // Helper methods for common config access
  isSlowQuery(executionTime: number): boolean {
    return executionTime > this.config.performance.slowQueryThreshold
  }

  isCriticalQuery(executionTime: number): boolean {
    return executionTime > this.config.performance.criticalQueryThreshold
  }

  shouldLogQuery(executionTime: number): boolean {
    return (
      this.config.logging.enabled &&
      (this.config.logging.logLevel === 'debug' ||
        this.isSlowQuery(executionTime))
    )
  }

  getAlertIcon(severity: string): string {
    return (
      this.config.alerts.severityLevels[
        severity as keyof typeof this.config.alerts.severityLevels
      ]?.icon || '⚪'
    )
  }

  getAlertColor(severity: string): string {
    return (
      this.config.alerts.severityLevels[
        severity as keyof typeof this.config.alerts.severityLevels
      ]?.color || 'gray'
    )
  }
}
