export function formatPercent(value: number, digits = 0): string {
  return `${(value * 100).toFixed(digits)}%`
}

export function formatAverage(value: number, digits = 1): string {
  return value.toFixed(digits)
}

export function formatSignedNumber(value: number, digits = 1): string {
  const formatted = value.toFixed(digits)
  return value > 0 ? `+${formatted}` : formatted
}
