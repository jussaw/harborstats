export type ActivityView = 'week' | 'month'

interface Props {
  view: ActivityView
  onChange: (view: ActivityView) => void
}

function ToggleButton({
  active,
  label,
  onClick,
}: {
  active: boolean
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`
        rounded-full px-3 py-1 text-xs font-semibold tracking-[0.2em] uppercase
        transition-colors
        ${
          active
            ? 'bg-(--gold) text-(--navy-900)'
            : `
              text-(--cream)/60
              hover:text-(--cream)
            `
        }
      `}
    >
      {label}
    </button>
  )
}

export function ActivityViewToggle({ view, onChange }: Props) {
  return (
    <div
      className="
        inline-flex items-center gap-1 rounded-full border border-(--gold)/15
        bg-(--navy-900)/50 p-1
      "
    >
      <ToggleButton active={view === 'week'} label="Week" onClick={() => onChange('week')} />
      <ToggleButton active={view === 'month'} label="Month" onClick={() => onChange('month')} />
    </div>
  )
}
