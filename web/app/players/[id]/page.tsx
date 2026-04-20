import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { PlayerTier } from '@/lib/player-tier'
import { getPlayerById } from '@/lib/players'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const player = await getPlayerById(parseInt(id, 10))
  return { title: player ? `${player.name} — HarborStats` : 'Player — HarborStats' }
}

export default async function PlayerProfilePage({ params }: Props) {
  const { id } = await params
  const numericId = parseInt(id, 10)
  if (Number.isNaN(numericId)) notFound()

  const player = await getPlayerById(numericId)
  if (!player) notFound()

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="rounded-lg border border-[var(--gold)]/30 bg-[var(--navy-900)]/60 p-8 mb-8">
        <div className="flex items-center gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[var(--gold)]/30 bg-[var(--navy-800)]">
            <span className="font-cinzel text-xl text-[var(--gold)]">
              {player.name[0].toUpperCase()}
            </span>
          </div>
          <div>
            <h1 className="font-cinzel text-2xl tracking-wide text-[var(--gold)]">{player.name}</h1>
            {player.tier === PlayerTier.Premium && (
              <span className="mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-cinzel tracking-widest bg-[var(--gold)]/15 text-[var(--gold)] uppercase">
                PREMIUM
              </span>
            )}
          </div>
        </div>
      </div>

      <p className="py-8 text-center text-sm text-[var(--cream)]/40">
        Full profile stats coming soon.
      </p>
    </main>
  )
}
