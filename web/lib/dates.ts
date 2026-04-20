const pad = (n: number) => String(n).padStart(2, '0')

function formatDateParts(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function parseDateInput(value: string): [number, number, number] {
  const [year, month, day] = value.split('-').map((part) => Number(part))
  return [year, month, day]
}

export function nowDatetimeLocal(): string {
  const d = new Date()
  return `${formatDateParts(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function datetimeLocalToIso(local: string): string {
  return new Date(local).toISOString()
}

export function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso)
  return `${formatDateParts(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function dateToDateInputValue(date: Date): string {
  return formatDateParts(date)
}

export function dateInputToStartOfDay(value: string): Date {
  const [year, month, day] = parseDateInput(value)
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

export function dateInputToEndOfDay(value: string): Date {
  const [year, month, day] = parseDateInput(value)
  return new Date(year, month - 1, day, 23, 59, 59, 999)
}
