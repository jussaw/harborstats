import type { Metadata, Viewport } from 'next'
import { Cinzel, Inter } from 'next/font/google'
import './globals.css'
import { SidebarShell } from '@/components/SidebarShell'
import { isAdminSession } from '@/lib/admin-auth'
import { logoutAction } from '@/app/admin/actions'

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'HarborStats',
  description: 'Catan game recorder for the harbor crew',
}

export const viewport: Viewport = {
  themeColor: '#07181f',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const isAdmin = await isAdminSession()

  return (
    <html lang="en" className={`${cinzel.variable} ${inter.variable}`}>
      <body className="min-h-screen">
        <SidebarShell isAdmin={isAdmin} logoutAction={logoutAction}>
          {children}
        </SidebarShell>
      </body>
    </html>
  )
}
