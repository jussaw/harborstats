import type { ReactNode } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md'

const baseClasses = `
  inline-flex cursor-pointer items-center justify-center rounded-lg
  font-semibold transition-all
  disabled:cursor-not-allowed disabled:opacity-50
`

const variantClasses: Record<ButtonVariant, string> = {
  primary: `
    border border-(--gold-600) bg-(image:--gradient-gold) text-(--navy-900)
    shadow-[0_6px_16px_rgb(232_178_58/0.25)]
    hover:brightness-110
  `,
  secondary: `
    border border-(--border-gold) text-(--gold)
    hover:border-(--gold) hover:bg-(--gold)/10
  `,
  ghost: `
    text-(--cream)/70
    hover:bg-(--cream)/10 hover:text-(--cream)
  `,
  danger: `
    border border-red-400/40 text-red-300
    hover:border-red-400/60 hover:bg-red-400/10
  `,
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
}

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
  return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]}`
}

interface ButtonProps {
  children: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  type?: 'button' | 'submit'
  disabled?: boolean
  onClick?: () => void
  title?: string
  className?: string
  'aria-label'?: string
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled,
  onClick,
  title,
  className = '',
  'aria-label': ariaLabel,
}: ButtonProps) {
  return (
    <button
      type={type === 'submit' ? 'submit' : 'button'}
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      className={`
        ${buttonClasses(variant, size)}
        ${className}
      `}
    >
      {children}
    </button>
  )
}
