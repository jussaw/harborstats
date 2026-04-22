'use client'

import { useSyncExternalStore } from 'react'

export const localTimeLoadingMessage = 'Loading your local-time view...'

function subscribe() {
  return () => {}
}

function getClientTimeZoneSnapshot() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
}

export function useResolvedTimeZone(explicitTimeZone?: string): string | null {
  const resolvedTimeZone = useSyncExternalStore(subscribe, getClientTimeZoneSnapshot, () => null)
  return explicitTimeZone ?? resolvedTimeZone
}
