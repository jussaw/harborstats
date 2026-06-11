'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import Link from 'next/link'
import { Sidebar } from './Sidebar'

const SIDEBAR_COLLAPSED_KEY = 'hs_sidebar_collapsed'
const SIDEBAR_COLLAPSED_EVENT = 'hs-sidebar-collapsed'

function subscribeToCollapsedPreference(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)
  window.addEventListener(SIDEBAR_COLLAPSED_EVENT, onStoreChange)

  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener(SIDEBAR_COLLAPSED_EVENT, onStoreChange)
  }
}

function getCollapsedPreferenceSnapshot() {
  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true'
}

interface Props {
  isAdmin: boolean
  logoutAction: () => Promise<void>
  children: React.ReactNode
}

export function SidebarShell({ isAdmin, logoutAction, children }: Props) {
  const pathname = usePathname()
  const collapsed = useSyncExternalStore(
    subscribeToCollapsedPreference,
    getCollapsedPreferenceSnapshot,
    () => false,
  )
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleCollapsed = useCallback(() => {
    const next = !collapsed

    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next))
    window.dispatchEvent(new Event(SIDEBAR_COLLAPSED_EVENT))
  }, [collapsed])

  const closeMobile = useCallback(() => {
    setMobileOpen(false)
  }, [])

  return (
    <div className="flex min-h-screen">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="
            fixed inset-0 z-20 bg-black/60 backdrop-blur-sm
            sm:hidden
          "
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed inset-y-0 left-0 z-30 flex flex-col',
          'bg-(--navy-950)/65 backdrop-blur-md border-r border-(--border-gold-subtle)',
          'transition-all duration-200',
          'w-60',
          collapsed ? 'sm:w-16' : 'sm:w-60',
          mobileOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0',
        ].join(' ')}
      >
        <Sidebar
          isAdmin={isAdmin}
          pathname={pathname}
          collapsed={collapsed}
          onToggleCollapse={toggleCollapsed}
          onNavigate={closeMobile}
          logoutAction={logoutAction}
        />
      </aside>

      {/* Main content */}
      <div
        data-sidebar-collapsed={String(collapsed)}
        className={collapsed ? `
          min-w-0 flex-1
          sm:pl-16
        ` : `
          min-w-0 flex-1
          sm:pl-60
        `}
      >
        {/* Mobile header */}
        <div className="
          flex h-12 items-center border-b border-(--border-gold-subtle)
          bg-(--navy-950)/80 px-4 backdrop-blur-md
          sm:hidden
        ">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="
              text-(--cream)/60 transition-colors
              hover:text-(--gold)
            "
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <Link
            href="/"
            className="
              font-cinzel ml-3 text-sm font-bold tracking-[0.2em] text-(--cream)
              uppercase
            "
          >
            Harbor<span className="text-(--gold)">Stats</span>
          </Link>
        </div>
        {children}
      </div>
    </div>
  )
}
