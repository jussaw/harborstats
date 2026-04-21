'use client'

import { useEffect, useState } from 'react'

export const localTimeLoadingMessage = 'Loading your local-time view...'

export function useResolvedTimeZone(explicitTimeZone?: string): string | null {
  const [resolvedTimeZone, setResolvedTimeZone] = useState<string | null>(explicitTimeZone ?? null)

  useEffect(() => {
    if (explicitTimeZone) {
      setResolvedTimeZone(explicitTimeZone)
      return
    }

    setResolvedTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC')
  }, [explicitTimeZone])

  return explicitTimeZone ?? resolvedTimeZone
}
