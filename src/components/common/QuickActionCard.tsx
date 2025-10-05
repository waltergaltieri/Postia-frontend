import React from 'react'
import { cn } from '@/utils'

interface QuickActionCardProps {
  title: string
  description: string
  icon: React.ReactNode
  onClick: () => void
  className?: string
}

export function QuickActionCard({
  title,
  description,
  icon,
  onClick,
  className,
}: QuickActionCardProps) {
  return (
    <div className={cn('quick-action-card', className)} onClick={onClick}>
      <div className="quick-action-icon">{icon}</div>
      <div className="quick-action-title">{title}</div>
      <div className="quick-action-description">{description}</div>
    </div>
  )
}
