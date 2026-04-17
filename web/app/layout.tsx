import type { Metadata } from 'next'
import { Cinzel } from 'next/font/google'
import './globals.css'

const cinzel = Cinzel({
  subsets: ['latin'],
  variable: '--font-cinzel',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'HarborStats',
  description: 'Catan game recorder for the harbor crew',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={cinzel.variable}>
      <body className="harbor-bg min-h-screen">
        {children}
      </body>
    </html>
  )
}
