'use client'

interface Props {
  formAction: (formData: FormData) => Promise<void>
  hiddenFields: Record<string, string>
  confirmMessage: string
  label: string
  className: string
}

export function ConfirmDeleteButton({
  formAction,
  hiddenFields,
  confirmMessage,
  label,
  className,
}: Props) {
  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        if (!window.confirm(confirmMessage)) e.preventDefault()
      }}
      className="flex items-center"
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
