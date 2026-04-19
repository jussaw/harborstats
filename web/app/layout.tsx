import type { Metadata } from 'next'
import { Cinzel } from 'next/font/google'
import './globals.css'
import { SidebarShell } from '@/components/SidebarShell'
import { getPlayers } from '@/lib/players'
import { isAdminSession } from '@/lib/admin-auth'
import { logoutAction } from '@/app/admin/actions'

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'HarborStats',
  description: 'Catan game recorder for the harbor crew',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [players, isAdmin] = await Promise.all([getPlayers(), isAdminSession()])

  return (
    <html lang="en" className={cinzel.variable}>
      <body className="harbor-bg min-h-screen">
        <SidebarShell players={players} isAdmin={isAdmin} logoutAction={logoutAction}>
          {children}
        </SidebarShell>
      </body>
    </html>
  )
}
