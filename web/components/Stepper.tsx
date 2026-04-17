'use client'

import { useCallback, useEffect, useRef } from 'react'

interface StepperProps {
  value: number
  onChange: (v: number) => void
  min?: number
}

export function Stepper({ value, onChange, min = 0 }: StepperProps) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const valueRef = useRef(value)
  valueRef.current = value

  const clear = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
  }, [])

  useEffect(() => clear, [clear])

  const step = (delta: number) => {
    const next = Math.max(min, valueRef.current + delta)
    onChange(next)
  }

  const startHold = (delta: number) => {
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        step(delta)
      }, 90)
    }, 350)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10)
    onChange(isNaN(parsed) ? min : Math.max(min, parsed))
  }

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onPointerDown={() => { step(-1); startHold(-1) }}
        onPointerUp={clear}
        onPointerLeave={clear}
        className="w-8 h-8 flex items-center justify-center rounded border border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-[var(--navy-900)] transition-colors select-none"
        aria-label="Decrease"
      >
        −
      </button>
      <input
        type="number"
        value={value}
        min={min}
        onChange={(e) => {
          const parsed = parseInt(e.target.value, 10)
          if (!isNaN(parsed)) onChange(Math.max(min, parsed))
        }}
        onBlur={handleBlur}
        className="w-12 text-center bg-transparent border border-[var(--gold)] rounded text-[var(--cream)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none h-8"
      />
      <button
        type="button"
        onPointerDown={() => { step(1); startHold(1) }}
        onPointerUp={clear}
        onPointerLeave={clear}
        className="w-8 h-8 flex items-center justify-center rounded border border-[var(--gold)] text-[var(--gold)] hover:bg-[var(--gold)] hover:text-[var(--navy-900)] transition-colors select-none"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  )
}
