import { LoginForm } from './LoginForm'

interface Props {
  searchParams: Promise<{ error?: string; next?: string }>
}

export default async function AdminLoginPage({ searchParams }: Props) {
  const params = await searchParams
  const hasError = params.error === '1'
  const next = params.next ?? '/admin'

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <p className="font-cinzel text-xs tracking-[0.4em] text-[var(--gold)]/60 uppercase mb-3">
            HarborStats
          </p>
          <h1 className="font-cinzel text-2xl tracking-widest text-[var(--cream)] uppercase">
            Admin Access
          </h1>
          <div className="mt-4 mx-auto w-16 h-px bg-[var(--gold)]/40" />
        </div>

        <div className="rounded-lg border border-[var(--gold)]/20 bg-[var(--navy-900)]/80 p-8 backdrop-blur-sm">
          <LoginForm next={next} hasError={hasError} />
        </div>
      </div>
    </main>
  )
}
