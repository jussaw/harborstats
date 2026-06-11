import type { ChangeEvent, ReactNode } from 'react'

export const fieldClasses = `
  rounded-lg border border-(--border-gold) bg-(--navy-950)/60 px-3 py-2
  text-sm text-(--cream)
  placeholder:text-(--cream)/35
  focus:border-(--gold) focus:ring-2 focus:ring-(--gold)/30 focus:outline-none
`

export const labelClasses = 'block text-xs font-medium tracking-wide text-(--cream)/70'

interface LabelProps {
  htmlFor: string
  children: ReactNode
  className?: string
}

export function Label({ htmlFor, children, className = '' }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className={`
      ${labelClasses}
      ${className}
    `}>
      {children}
    </label>
  )
}

interface InputProps {
  id?: string
  name?: string
  type?: 'text' | 'password' | 'date' | 'search' | 'number'
  value?: string
  defaultValue?: string
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  autoComplete?: string
  maxLength?: number
  className?: string
  'aria-label'?: string
}

export function Input({
  id,
  name,
  type = 'text',
  value,
  defaultValue,
  onChange,
  onBlur,
  placeholder,
  required,
  disabled,
  autoComplete,
  maxLength,
  className = '',
  'aria-label': ariaLabel,
}: InputProps) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      autoComplete={autoComplete}
      maxLength={maxLength}
      aria-label={ariaLabel}
      className={`
        ${fieldClasses}
        ${className}
      `}
    />
  )
}

interface SelectProps {
  children: ReactNode
  id?: string
  name?: string
  value?: string
  defaultValue?: string
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void
  required?: boolean
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

export function Select({
  children,
  id,
  name,
  value,
  defaultValue,
  onChange,
  required,
  disabled,
  className = '',
  'aria-label': ariaLabel,
}: SelectProps) {
  return (
    <select
      id={id}
      name={name}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      required={required}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`
        ${fieldClasses}
        ${className}
      `}
    >
      {children}
    </select>
  )
}

interface TextareaProps {
  id?: string
  name?: string
  value?: string
  defaultValue?: string
  onChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  rows?: number
  maxLength?: number
  className?: string
  'aria-label'?: string
}

export function Textarea({
  id,
  name,
  value,
  defaultValue,
  onChange,
  placeholder,
  rows,
  maxLength,
  className = '',
  'aria-label': ariaLabel,
}: TextareaProps) {
  return (
    <textarea
      id={id}
      name={name}
      value={value}
      defaultValue={defaultValue}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      maxLength={maxLength}
      aria-label={ariaLabel}
      className={`
        ${fieldClasses}
        ${className}
      `}
    />
  )
}
