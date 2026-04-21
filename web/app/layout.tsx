import type { Metadata } from 'next'
import { Cinzel } from 'next/font/google'
import './globals.css'
import { SidebarShell } from '@/components/SidebarShell'
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
  const isAdmin = await isAdminSession()

  return (
    <html lang="en" className={cinzel.variable}>
      <body className="min-h-screen bg-(--navy-800)">
        <SidebarShell isAdmin={isAdmin} logoutAction={logoutAction}>
          {children}
        </SidebarShell>
      </body>
    </html>
  )
}
