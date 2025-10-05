import React from 'react'
import { cn } from '@/utils'

interface ChartContainerProps {
  title: string
  children: React.ReactNode
  className?: string
  action?: React.ReactNode
}

export function ChartContainer({
  title,
  children,
  className,
  action,
}: ChartContainerProps) {
  return (
    <div className={cn('chart-container', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="chart-title">{title}</h3>
        {action && <div>{action}</div>}
      </div>
      <div className="h-64">{children}</div>
    </div>
  )
}
