'use client'

interface Props {
  formAction: (formData: FormData) => Promise<void>
  hiddenFields: Record<string, string>
  confirmMessage: string
  label?: string
  className?: string
}

export function ConfirmDeleteButton({
  formAction,
  hiddenFields,
  confirmMessage,
  label = 'Delete',
  className = 'font-cinzel text-xs tracking-widest text-red-500/60 uppercase hover:text-red-400 transition-colors',
}: Props) {
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault()
      }}
    >
      {Object.entries(hiddenFields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  )
}
