#!/usr/bin/env node

import { initializeDatabase, closeDatabase } from '../connection'
import { DatabaseMonitor } from './monitor'
import { DatabaseAnalyzer } from './analyzer'
import { MonitoringConfigManager } from './monitoring-config'
import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'

interface DashboardData {
  timestamp: number
  health: any
  performance: any
  alerts: any[]
  config: any
}

class MonitoringDashboard {
  private server: http.Server | null = null
  private monitor: DatabaseMonitor
  private analyzer: DatabaseAnalyzer
  private configManager: MonitoringConfigManager
  private port: number

  constructor(port: number = 3001) {
    this.port = port
    const db = initializeDatabase()
    this.monitor = new DatabaseMonitor(db)
    this.analyzer = new DatabaseAnalyzer(db)
    this.configManager = new MonitoringConfigManager()
  }

  async start(): Promise<void> {
    this.server = http.createServer(this.handleRequest.bind(this))

    this.server.listen(this.port, () => {
      console.log(`📊 Database Monitoring Dashboard started`)
      console.log(`🌐 Open http://localhost:${this.port} in your browser`)
      console.log('Press Ctrl+C to stop')
    })

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down dashboard...')
      this.stop()
    })
  }

  stop(): void {
    if (this.server) {
      this.server.close()
      this.server = null
    }
    closeDatabase()
    process.exit(0)
  }

  private async handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    const url = req.url || '/'

    try {
      if (url === '/') {
        await this.serveHTML(res)
      } else if (url === '/api/data') {
        await this.serveData(res)
      } else if (url === '/api/config') {
        if (req.method === 'GET') {
          await this.serveConfig(res)
        } else if (req.method === 'POST') {
          await this.updateConfig(req, res)
        }
      } else if (url.startsWith('/api/')) {
        await this.serveAPI(url, res)
      } else {
        this.serve404(res)
      }
    } catch (error) {
      console.error('Dashboard error:', error)
      this.serveError(res, error)
    }
  }

  private async serveHTML(res: http.ServerResponse): Promise<void> {
    const html = this.generateHTML()

    res.writeHead(200, {
      'Content-Type': 'text/html',
      'Content-Length': Buffer.byteLength(html),
    })
    res.end(html)
  }

  private async serveData(res: http.ServerResponse): Promise<void> {
    // Collect dashboard data
    const data: DashboardData = {
      timestamp: Date.now(),
      health: await this.collectHealthData(),
      performance: await this.collectPerformanceData(),
      alerts: this.monitor.getAlerts(),
      config: this.configManager.getConfig(),
    }

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    })
    res.end(JSON.stringify(data, null, 2))
  }

  private async serveConfig(res: http.ServerResponse): Promise<void> {
    const config = this.configManager.getConfig()

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    })
    res.end(JSON.stringify(config, null, 2))
  }

  private async updateConfig(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): Promise<void> {
    let body = ''

    req.on('data', chunk => {
      body += chunk.toString()
    })

    req.on('end', () => {
      try {
        const updates = JSON.parse(body)
        this.configManager.updateConfig(updates)

        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        })
        res.end(JSON.stringify({ success: true }))
      } catch (error) {
        res.writeHead(400, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        })
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
  }

  private async serveAPI(url: string, res: http.ServerResponse): Promise<void> {
    const path = url.replace('/api/', '')

    switch (path) {
      case 'health':
        const healthData = await this.collectHealthData()
        this.sendJSON(res, healthData)
        break

      case 'performance':
        const perfData = await this.collectPerformanceData()
        this.sendJSON(res, perfData)
        break

      case 'alerts':
        const alerts = this.monitor.getAlerts()
        this.sendJSON(res, alerts)
        break

      case 'clear-alerts':
        this.monitor.clearAlerts()
        this.sendJSON(res, { success: true })
        break

      default:
        this.serve404(res)
    }
  }

  private sendJSON(res: http.ServerResponse, data: any): void {
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    })
    res.end(JSON.stringify(data, null, 2))
  }

  private serve404(res: http.ServerResponse): void {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not Found')
  }

  private serveError(res: http.ServerResponse, error: any): void {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: error.message }))
  }

  private async collectHealthData(): Promise<any> {
    const db = initializeDatabase()

    try {
      // Database integrity
      const integrityResult = db.prepare('PRAGMA integrity_check').get()

      // WAL info
      const walInfo = db.prepare('PRAGMA wal_checkpoint(PASSIVE)').get()

      // Database size
      const pageCount = db.prepare('PRAGMA page_count').get()
      const pageSize = db.prepare('PRAGMA page_size').get()
      const totalSize = pageCount.page_count * pageSize.page_size

      return {
        integrity: integrityResult.integrity_check === 'ok',
        walPages: walInfo.busy,
        walCheckpointed: walInfo.log,
        databaseSize: totalSize,
        pageCount: pageCount.page_count,
        pageSize: pageSize.page_size,
      }
    } catch (error) {
      return { error: error.message }
    }
  }

  private async collectPerformanceData(): Promise<any> {
    // This would collect recent performance metrics
    // For now, return mock data
    return {
      avgQueryTime: 45,
      slowQueries: 3,
      totalQueries: 1247,
      queriesPerSecond: 12.5,
      recentQueries: [
        {
          time: '10:30:15',
          duration: 234,
          query: 'SELECT * FROM campaigns...',
        },
        {
          time: '10:30:12',
          duration: 45,
          query: 'SELECT COUNT(*) FROM resources...',
        },
        {
          time: '10:30:08',
          duration: 1205,
          query: 'SELECT p.*, c.name FROM publications p...',
        },
      ],
    }
  }

  private generateHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Database Monitoring Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
            line-height: 1.6;
        }
        
        .header {
            background: #2c3e50;
            color: white;
            padding: 1rem 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .header h1 {
            font-size: 1.5rem;
            font-weight: 600;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        
        .card {
            background: white;
            border-radius: 8px;
            padding: 1.5rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border: 1px solid #e1e8ed;
        }
        
        .card h2 {
            font-size: 1.2rem;
            margin-bottom: 1rem;
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 0.5rem;
        }
        
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 0.5rem 0;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .metric:last-child {
            border-bottom: none;
        }
        
        .metric-label {
            font-weight: 500;
        }
        
        .metric-value {
            font-weight: 600;
            color: #2c3e50;
        }
        
        .status-good { color: #27ae60; }
        .status-warning { color: #f39c12; }
        .status-error { color: #e74c3c; }
        
        .alert {
            padding: 0.75rem;
            margin: 0.5rem 0;
            border-radius: 4px;
            border-left: 4px solid;
        }
        
        .alert-low { border-color: #27ae60; background: #d5f4e6; }
        .alert-medium { border-color: #f39c12; background: #fef9e7; }
        .alert-high { border-color: #e67e22; background: #fdf2e9; }
        .alert-critical { border-color: #e74c3c; background: #fdedec; }
        
        .query-log {
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.85rem;
            background: #f8f9fa;
            padding: 0.5rem;
            border-radius: 4px;
            margin: 0.25rem 0;
            overflow-x: auto;
        }
        
        .refresh-btn {
            background: #3498db;
            color: white;
            border: none;
            padding: 0.5rem 1rem;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9rem;
            margin: 0.5rem 0.5rem 0.5rem 0;
        }
        
        .refresh-btn:hover {
            background: #2980b9;
        }
        
        .loading {
            opacity: 0.6;
            pointer-events: none;
        }
        
        .timestamp {
            color: #7f8c8d;
            font-size: 0.85rem;
            text-align: right;
            margin-top: 1rem;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Database Monitoring Dashboard</h1>
    </div>
    
    <div class="container">
        <div style="margin-bottom: 1rem;">
            <button class="refresh-btn" onclick="refreshData()">🔄 Refresh</button>
            <button class="refresh-btn" onclick="clearAlerts()">🗑️ Clear Alerts</button>
            <span id="auto-refresh">
                <label>
                    <input type="checkbox" id="auto-refresh-checkbox" onchange="toggleAutoRefresh()"> 
                    Auto-refresh (30s)
                </label>
            </span>
        </div>
        
        <div class="grid">
            <div class="card">
                <h2>🏥 Database Health</h2>
                <div id="health-metrics">
                    <div class="metric">
                        <span class="metric-label">Loading...</span>
                        <span class="metric-value">⏳</span>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h2>⚡ Performance</h2>
                <div id="performance-metrics">
                    <div class="metric">
                        <span class="metric-label">Loading...</span>
                        <span class="metric-value">⏳</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="grid">
            <div class="card">
                <h2>🚨 Recent Alerts</h2>
                <div id="alerts-list">
                    <div class="metric">
                        <span class="metric-label">Loading alerts...</span>
                    </div>
                </div>
            </div>
            
            <div class="card">
                <h2>📊 Recent Queries</h2>
                <div id="query-log">
                    <div class="metric">
                        <span class="metric-label">Loading queries...</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="timestamp" id="last-updated">
            Last updated: Loading...
        </div>
    </div>

    <script>
        let autoRefreshInterval = null;
        
        async function fetchData() {
            try {
                const response = await fetch('/api/data');
                const data = await response.json();
                updateDashboard(data);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            }
        }
        
        function updateDashboard(data) {
            updateHealthMetrics(data.health);
            updatePerformanceMetrics(data.performance);
            updateAlerts(data.alerts);
            updateQueryLog(data.performance.recentQueries || []);
            
            document.getElementById('last-updated').textContent = 
                'Last updated: ' + new Date(data.timestamp).toLocaleString();
        }
        
        function updateHealthMetrics(health) {
            const container = document.getElementById('health-metrics');
            container.innerHTML = '';
            
            if (health.error) {
                container.innerHTML = '<div class="metric"><span class="metric-label status-error">Error: ' + health.error + '</span></div>';
                return;
            }
            
            const metrics = [
                ['Integrity', health.integrity ? '✅ OK' : '❌ Failed', health.integrity ? 'status-good' : 'status-error'],
                ['Database Size', formatBytes(health.databaseSize), 'status-good'],
                ['WAL Pages', health.walPages.toLocaleString(), health.walPages > 1000 ? 'status-warning' : 'status-good'],
                ['Page Count', health.pageCount.toLocaleString(), 'status-good']
            ];
            
            metrics.forEach(([label, value, className]) => {
                const div = document.createElement('div');
                div.className = 'metric';
                div.innerHTML = '<span class="metric-label">' + label + '</span><span class="metric-value ' + className + '">' + value + '</span>';
                container.appendChild(div);
            });
        }
        
        function updatePerformanceMetrics(performance) {
            const container = document.getElementById('performance-metrics');
            container.innerHTML = '';
            
            const metrics = [
                ['Avg Query Time', performance.avgQueryTime + 'ms', performance.avgQueryTime > 100 ? 'status-warning' : 'status-good'],
                ['Slow Queries', performance.slowQueries.toString(), performance.slowQueries > 0 ? 'status-warning' : 'status-good'],
                ['Total Queries', performance.totalQueries.toLocaleString(), 'status-good'],
                ['Queries/sec', performance.queriesPerSecond.toFixed(1), 'status-good']
            ];
            
            metrics.forEach(([label, value, className]) => {
                const div = document.createElement('div');
                div.className = 'metric';
                div.innerHTML = '<span class="metric-label">' + label + '</span><span class="metric-value ' + className + '">' + value + '</span>';
                container.appendChild(div);
            });
        }
        
        function updateAlerts(alerts) {
            const container = document.getElementById('alerts-list');
            container.innerHTML = '';
            
            if (alerts.length === 0) {
                container.innerHTML = '<div class="metric"><span class="metric-label status-good">No alerts</span></div>';
                return;
            }
            
            alerts.slice(0, 5).forEach(alert => {
                const div = document.createElement('div');
                div.className = 'alert alert-' + alert.severity;
                div.innerHTML = '<strong>' + alert.type + '</strong><br>' + alert.message + '<br><small>' + new Date(alert.timestamp).toLocaleString() + '</small>';
                container.appendChild(div);
            });
        }
        
        function updateQueryLog(queries) {
            const container = document.getElementById('query-log');
            container.innerHTML = '';
            
            if (queries.length === 0) {
                container.innerHTML = '<div class="metric"><span class="metric-label">No recent queries</span></div>';
                return;
            }
            
            queries.forEach(query => {
                const div = document.createElement('div');
                div.className = 'query-log';
                const durationClass = query.duration > 1000 ? 'status-error' : query.duration > 500 ? 'status-warning' : 'status-good';
                div.innerHTML = '<span class="' + durationClass + '">' + query.time + ' (' + query.duration + 'ms)</span><br>' + query.query;
                container.appendChild(div);
            });
        }
        
        function formatBytes(bytes) {
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            if (bytes === 0) return '0 Bytes';
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
        }
        
        function refreshData() {
            document.body.classList.add('loading');
            fetchData().finally(() => {
                document.body.classList.remove('loading');
            });
        }
        
        function toggleAutoRefresh() {
            const checkbox = document.getElementById('auto-refresh-checkbox');
            
            if (checkbox.checked) {
                autoRefreshInterval = setInterval(fetchData, 30000);
            } else {
                if (autoRefreshInterval) {
                    clearInterval(autoRefreshInterval);
                    autoRefreshInterval = null;
                }
            }
        }
        
        async function clearAlerts() {
            try {
                await fetch('/api/clear-alerts');
                fetchData();
            } catch (error) {
                console.error('Failed to clear alerts:', error);
            }
        }
        
        // Initial load
        fetchData();
    </script>
</body>
</html>`
  }
}

// CLI entry point
async function main() {
  const args = process.argv.slice(2)
  const port = args[0] ? parseInt(args[0]) : 3001

  if (isNaN(port) || port < 1000 || port > 65535) {
    console.error(
      '❌ Invalid port number. Please provide a port between 1000-65535'
    )
    process.exit(1)
  }

  const dashboard = new MonitoringDashboard(port)
  await dashboard.start()
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Dashboard failed to start:', error)
    process.exit(1)
  })
}

export { MonitoringDashboard }
