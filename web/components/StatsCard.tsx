import type { ReactNode } from 'react'
import { Card } from './ui/Card'

interface Props {
  id: string
  title: string
  description: string
  badge: string | undefined
  span: 'single' | 'full'
  children: ReactNode
}

interface StatsCardDetailSlotProps {
  size: 'compact' | 'roomy' | 'tall'
  className?: string
  children: ReactNode
}

export function StatsCard({
  id,
  title,
  description,
  badge,
  span,
  children,
}: Props) {
  return (
    <section
      id={id}
      className={`
        scroll-mt-28
        sm:scroll-mt-8
        ${span === 'full' ? `lg:col-span-2` : ''}
      `}
    >
      <Card title={title} description={description} badge={badge} className="
        h-full
      " contentClassName="flex-1">
        {children}
      </Card>
    </section>
  )
}

function getDetailSlotHeightClass(size: StatsCardDetailSlotProps['size']) {
  if (size === 'tall') {
    return 'h-44'
  }

  if (size === 'roomy') {
    return 'h-24'
  }

  return 'h-20'
}

export function StatsCardDetailSlot({
  size,
  className = '',
  children,
}: StatsCardDetailSlotProps) {
  return (
    <div
      data-testid="stats-card-detail-slot"
      data-detail-size={size}
      className={`
        flex min-w-0 flex-col justify-start
        ${getDetailSlotHeightClass(size)}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
