'use client'

const fmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

interface Props {
  iso: string
  className: string
}

export function FormattedDate({ iso, className }: Props) {
  const label = fmt.format(new Date(iso))

  return (
    <time dateTime={iso} className={className} suppressHydrationWarning>
      {label}
    </time>
  )
}
