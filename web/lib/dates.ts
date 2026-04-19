const pad = (n: number) => String(n).padStart(2, '0')

export function nowDatetimeLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function datetimeLocalToIso(local: string): string {
  return new Date(local).toISOString()
}

export function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
