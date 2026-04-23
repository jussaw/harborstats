'use client'

import { useMemo } from 'react'
import { useResolvedTimeZone } from '@/lib/use-resolved-time-zone'

const unresolvedDatePlaceholder = '...'

function createFormatter(dateOnly: boolean, timeZone?: string) {
  if (dateOnly) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone,
    })
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone,
  })
}

interface Props {
  iso: string
  className: string
  dateOnly?: boolean
  timeZone?: string
}

export function FormattedDate({ iso, className, dateOnly = false, timeZone = undefined }: Props) {
  const resolvedTimeZone = useResolvedTimeZone(timeZone)
  const label = useMemo(() => {
    if (!resolvedTimeZone) {
      return unresolvedDatePlaceholder
    }

    return createFormatter(dateOnly, resolvedTimeZone).format(new Date(iso))
  }, [dateOnly, iso, resolvedTimeZone])

  return (
    <time dateTime={iso} className={className}>
      {label}
    </time>
  )
}

FormattedDate.defaultProps = {
  dateOnly: false,
  timeZone: undefined,
}
