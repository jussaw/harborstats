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
          <p className="
            font-cinzel mb-3 text-xs tracking-[0.4em] text-(--gold)/60 uppercase
          ">
            HarborStats
          </p>
          <h1 className="
            font-cinzel text-2xl tracking-widest text-(--cream) uppercase
          ">
            Admin Access
          </h1>
          <div className="mx-auto mt-4 h-px w-16 bg-(--gold)/40" />
        </div>

        <div className="
          rounded-lg border border-(--gold)/20 bg-(--navy-900)/80 p-8
          backdrop-blur-sm
        ">
          <LoginForm next={next} hasError={hasError} />
        </div>
      </div>
    </main>
  )
}
