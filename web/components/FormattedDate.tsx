'use client'

const fmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

const dateOnlyFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

interface Props {
  iso: string
  className: string
  dateOnly?: boolean
}

export function FormattedDate({ iso, className, dateOnly = false }: Props) {
  const label = (dateOnly ? dateOnlyFmt : fmt).format(new Date(iso))

  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {label}
    </time>
  )
}

FormattedDate.defaultProps = {
  dateOnly: false,
}
