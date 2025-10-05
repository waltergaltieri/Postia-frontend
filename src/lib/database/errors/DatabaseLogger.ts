import * as fs from 'fs'
import * as path from 'path'

/**
 * Log levels for database operations
 */
export enum LogLevel {
  ERROR = 'ERROR',
  WARN = 'WARN',
  INFO = 'INFO',
  DEBUG = 'DEBUG',
}

/**
 * Log entry interface
 */
export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: Record<string, any>
  stack?: string
}

/**
 * Database logger for tracking operations, errors, and performance
 */
export class DatabaseLogger {
  private static logDir = path.join(process.cwd(), 'logs')
  private static logFile = path.join(this.logDir, 'database.log')
  private static errorLogFile = path.join(this.logDir, 'database-errors.log')
  private static performanceLogFile = path.join(
    this.logDir,
    'database-performance.log'
  )

  private static initialized = false
  private static logLevel: LogLevel =
    process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO

  /**
   * Initialize the logger (create log directory if needed)
   */
  private static initialize(): void {
    if (this.initialized) return

    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true })
      }
      this.initialized = true
    } catch (error) {
      console.error('Failed to initialize database logger:', error)
    }
  }

  /**
   * Set the minimum log level
   */
  static setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }

  /**
   * Check if a log level should be logged
   */
  private static shouldLog(level: LogLevel): boolean {
    const levels = [
      LogLevel.ERROR,
      LogLevel.WARN,
      LogLevel.INFO,
      LogLevel.DEBUG,
    ]
    const currentLevelIndex = levels.indexOf(this.logLevel)
    const messageLevelIndex = levels.indexOf(level)

    return messageLevelIndex <= currentLevelIndex
  }

  /**
   * Create a log entry
   */
  private static createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    stack?: string
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      stack,
    }
  }

  /**
   * Format log entry for file output
   */
  private static formatLogEntry(entry: LogEntry): string {
    const contextStr = entry.context
      ? ` | Context: ${JSON.stringify(entry.context)}`
      : ''
    const stackStr = entry.stack ? `\nStack: ${entry.stack}` : ''

    return `[${entry.timestamp}] ${entry.level}: ${entry.message}${contextStr}${stackStr}\n`
  }

  /**
   * Write log entry to file
   */
  private static writeToFile(filePath: string, entry: LogEntry): void {
    this.initialize()

    try {
      const logLine = this.formatLogEntry(entry)
      fs.appendFileSync(filePath, logLine, 'utf8')
    } catch (error) {
      console.error('Failed to write to log file:', error)
    }
  }

  /**
   * Log an error message
   */
  static error(
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): void {
    if (!this.shouldLog(LogLevel.ERROR)) return

    const entry = this.createLogEntry(
      LogLevel.ERROR,
      message,
      context,
      error?.stack
    )

    // Write to both general log and error-specific log
    this.writeToFile(this.logFile, entry)
    this.writeToFile(this.errorLogFile, entry)

    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[DB ERROR] ${message}`, context, error)
    }
  }

  /**
   * Log a warning message
   */
  static warn(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.WARN)) return

    const entry = this.createLogEntry(LogLevel.WARN, message, context)
    this.writeToFile(this.logFile, entry)

    if (process.env.NODE_ENV === 'development') {
      console.warn(`[DB WARN] ${message}`, context)
    }
  }

  /**
   * Log an info message
   */
  static info(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.INFO)) return

    const entry = this.createLogEntry(LogLevel.INFO, message, context)
    this.writeToFile(this.logFile, entry)

    if (process.env.NODE_ENV === 'development') {
      console.info(`[DB INFO] ${message}`, context)
    }
  }

  /**
   * Log a debug message
   */
  static debug(message: string, context?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return

    const entry = this.createLogEntry(LogLevel.DEBUG, message, context)
    this.writeToFile(this.logFile, entry)

    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DB DEBUG] ${message}`, context)
    }
  }

  /**
   * Log database query performance
   */
  static logQuery(
    query: string,
    duration: number,
    context?: Record<string, any>
  ): void {
    const entry = this.createLogEntry(
      LogLevel.INFO,
      `Query executed in ${duration}ms`,
      {
        query: query.replace(/\s+/g, ' ').trim(),
        duration,
        ...context,
      }
    )

    this.writeToFile(this.performanceLogFile, entry)

    // Log slow queries as warnings
    if (duration > 1000) {
      // Queries taking more than 1 second
      this.warn(`Slow query detected (${duration}ms)`, {
        query: query.replace(/\s+/g, ' ').trim(),
        duration,
        ...context,
      })
    }
  }

  /**
   * Log transaction performance
   */
  static logTransaction(
    operation: string,
    duration: number,
    success: boolean,
    context?: Record<string, any>
  ): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR
    const message = `Transaction ${operation} ${success ? 'completed' : 'failed'} in ${duration}ms`

    const entry = this.createLogEntry(level, message, {
      operation,
      duration,
      success,
      ...context,
    })

    this.writeToFile(this.performanceLogFile, entry)

    if (!success) {
      this.writeToFile(this.errorLogFile, entry)
    }
  }

  /**
   * Log connection events
   */
  static logConnection(
    event: 'connect' | 'disconnect' | 'error',
    context?: Record<string, any>
  ): void {
    const level = event === 'error' ? LogLevel.ERROR : LogLevel.INFO
    const message = `Database ${event}`

    const entry = this.createLogEntry(level, message, context)
    this.writeToFile(this.logFile, entry)

    if (event === 'error') {
      this.writeToFile(this.errorLogFile, entry)
    }
  }

  /**
   * Log migration events
   */
  static logMigration(
    version: number,
    direction: 'up' | 'down',
    success: boolean,
    duration?: number,
    error?: Error
  ): void {
    const level = success ? LogLevel.INFO : LogLevel.ERROR
    const message = `Migration ${version} ${direction} ${success ? 'completed' : 'failed'}${duration ? ` in ${duration}ms` : ''}`

    const entry = this.createLogEntry(
      level,
      message,
      {
        version,
        direction,
        success,
        duration,
      },
      error?.stack
    )

    this.writeToFile(this.logFile, entry)

    if (!success) {
      this.writeToFile(this.errorLogFile, entry)
    }
  }

  /**
   * Get recent log entries from file
   */
  static getRecentLogs(count: number = 100, level?: LogLevel): LogEntry[] {
    this.initialize()

    try {
      if (!fs.existsSync(this.logFile)) {
        return []
      }

      const content = fs.readFileSync(this.logFile, 'utf8')
      const lines = content
        .trim()
        .split('\n')
        .filter(line => line.trim())

      // Parse recent lines (simple parsing, assumes one line per log entry)
      const recentLines = lines.slice(-count)
      const entries: LogEntry[] = []

      for (const line of recentLines) {
        try {
          // Simple parsing - extract timestamp, level, and message
          const match = line.match(/^\[([^\]]+)\] (\w+): (.+)$/)
          if (match) {
            const [, timestamp, entryLevel, message] = match

            if (!level || entryLevel === level) {
              entries.push({
                timestamp,
                level: entryLevel as LogLevel,
                message,
              })
            }
          }
        } catch (parseError) {
          // Skip malformed lines
          continue
        }
      }

      return entries
    } catch (error) {
      console.error('Failed to read log file:', error)
      return []
    }
  }

  /**
   * Clear log files (useful for testing or maintenance)
   */
  static clearLogs(): void {
    this.initialize()

    const logFiles = [this.logFile, this.errorLogFile, this.performanceLogFile]

    for (const file of logFiles) {
      try {
        if (fs.existsSync(file)) {
          fs.writeFileSync(file, '', 'utf8')
        }
      } catch (error) {
        console.error(`Failed to clear log file ${file}:`, error)
      }
    }
  }

  /**
   * Get log file paths (useful for external log analysis tools)
   */
  static getLogFilePaths(): {
    general: string
    errors: string
    performance: string
  } {
    return {
      general: this.logFile,
      errors: this.errorLogFile,
      performance: this.performanceLogFile,
    }
  }
}
