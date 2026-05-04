interface StatsSectionHeaderProps {
  title: string
  subtitle: string
}

export function StatsSectionHeader({ title, subtitle }: StatsSectionHeaderProps) {
  return (
    <header className="mb-5 border-b border-(--gold)/20 pb-3">
      <h2 className="font-cinzel text-2xl tracking-wide text-(--gold)">{title}</h2>
      <p className="mt-1 text-sm text-(--cream)/55">{subtitle}</p>
    </header>
  )
}
