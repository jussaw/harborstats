import Link from 'next/link'
import { logoutAction } from './actions'

export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: 'var(--navy-900)' }}>
      <header
        className="border-b px-6 py-4"
        style={{ borderColor: 'color-mix(in srgb, var(--gold) 25%, transparent)' }}
      >
        <div className="mx-auto max-w-5xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link
              href="/admin"
              className="font-cinzel text-sm tracking-[0.3em] text-[var(--gold)] uppercase hover:text-[var(--cream)] transition-colors"
            >
              HarborStats <span className="opacity-40">//</span> Admin
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                href="/admin/games"
                className="font-cinzel text-xs tracking-widest text-[var(--cream)]/60 uppercase hover:text-[var(--gold)] transition-colors"
              >
                Games
              </Link>
              <Link
                href="/admin/players"
                className="font-cinzel text-xs tracking-widest text-[var(--cream)]/60 uppercase hover:text-[var(--gold)] transition-colors"
              >
                Players
              </Link>
              <Link
                href="/admin/settings"
                className="font-cinzel text-xs tracking-widest text-[var(--cream)]/60 uppercase hover:text-[var(--gold)] transition-colors"
              >
                Settings
              </Link>
              <Link
                href="/"
                className="font-cinzel text-xs tracking-widest text-[var(--cream)]/40 uppercase hover:text-[var(--cream)]/60 transition-colors"
              >
                ← Public
              </Link>
            </nav>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="font-cinzel text-xs tracking-widest text-[var(--cream)]/40 uppercase hover:text-red-400 transition-colors"
            >
              Logout
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  )
}
