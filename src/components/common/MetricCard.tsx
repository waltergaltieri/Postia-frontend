import React from 'react'
import { cn } from '@/utils'

interface MetricCardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: {
    value: string
    isPositive: boolean
  }
  iconBgColor?: string
  className?: string
  onClick?: () => void
}

export function MetricCard({
  title,
  value,
  icon,
  trend,
  iconBgColor = 'bg-primary-100',
  className,
  onClick,
}: MetricCardProps) {
  return (
    <div
      className={cn('metric-card', onClick && 'cursor-pointer', className)}
      onClick={onClick}
    >
      <div className={cn('metric-card-icon', iconBgColor)}>{icon}</div>

      <div className="metric-card-value">{value}</div>

      <div className="metric-card-label">{title}</div>

      {trend && (
        <div
          className={cn(
            'metric-card-trend',
            trend.isPositive ? 'positive' : 'negative'
          )}
        >
          <span>{trend.isPositive ? '↗' : '↘'}</span>
          <span>{trend.value}</span>
        </div>
      )}
    </div>
  )
}
