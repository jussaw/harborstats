'use client'

import Link from 'next/link'
import {
  Home,
  ScrollText,
  BarChart3,
  ShieldCheck,
  LogOut,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Users,
  Settings,
} from 'lucide-react'

const cinzelStyle = {
  fontFamily: 'var(--font-cinzel), Georgia, serif',
}

interface Props {
  isAdmin: boolean
  pathname: string
  collapsed: boolean
  onToggleCollapse: () => void
  onNavigate: () => void
  logoutAction: () => Promise<void>
}

interface NavLinkProps {
  href: string
  Icon: React.ElementType
  label: string
  active: boolean
  collapsed: boolean
  onClick: () => void
}

function NavLink({ href, Icon, label, active, collapsed, onClick }: NavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`
        flex items-center gap-3 rounded-md p-2 text-xs transition-colors
        ${
        collapsed ? 'sm:justify-center' : ''
      }
        ${
        active
          ? 'bg-(--gold)/10 text-(--gold)'
          : `
            text-(--cream)/60
            hover:bg-(--navy-800)/50 hover:text-(--cream)
          `
      }
      `}
    >
      <Icon className="size-4 shrink-0" />
      <span
        style={cinzelStyle}
        className={`
          truncate tracking-widest uppercase
          ${collapsed ? 'sm:hidden' : ''}
        `}
      >
        {label}
      </span>
    </Link>
  )
}

export function Sidebar({
  isAdmin,
  pathname,
  collapsed,
  onToggleCollapse,
  onNavigate,
  logoutAction,
}: Props) {
  function isActive(href: string, exact = false) {
    return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header: brand + collapse toggle */}
      <div
        className={`
          flex items-center border-b border-(--gold)/15 px-3 py-4
          ${collapsed ? `sm:justify-center` : `justify-between`}
        `}
      >
        <Link
          href="/"
          onClick={onNavigate}
          style={cinzelStyle}
          className={`
            text-sm tracking-[0.2em] text-(--gold) uppercase
            ${collapsed ? `sm:hidden` : ''}
          `}
        >
          HarborStats
        </Link>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="
            hidden items-center justify-center rounded-sm p-1 text-(--cream)/40
            transition-colors
            hover:text-(--gold)
            sm:flex
          "
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="size-4" /> : <ChevronLeft className="
            size-4
          " />}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        <NavLink
          href="/"
          Icon={Home}
          label="Home"
          active={isActive('/', true)}
          collapsed={collapsed}
          onClick={onNavigate}
        />
        <NavLink
          href="/games"
          Icon={ScrollText}
          label="Games"
          active={isActive('/games', true)}
          collapsed={collapsed}
          onClick={onNavigate}
        />
        <NavLink
          href="/stats"
          Icon={BarChart3}
          label="Stats"
          active={isActive('/stats', true)}
          collapsed={collapsed}
          onClick={onNavigate}
        />
        <NavLink
          href="/players"
          Icon={Users}
          label="Players"
          active={isActive('/players')}
          collapsed={collapsed}
          onClick={onNavigate}
        />

        {isAdmin && (
          <div className="pt-3">
            <p
              style={cinzelStyle}
              className={`
                px-2 pb-1 text-xs tracking-widest text-(--cream)/30 uppercase
                ${collapsed ? `sm:hidden` : ''}
              `}
            >
              Admin
            </p>
            <div className="space-y-0.5">
              <NavLink
                href="/admin/games"
                Icon={LayoutGrid}
                label="Games"
                active={isActive('/admin/games')}
                collapsed={collapsed}
                onClick={onNavigate}
              />
              <NavLink
                href="/admin/players"
                Icon={Users}
                label="Players"
                active={isActive('/admin/players')}
                collapsed={collapsed}
                onClick={onNavigate}
              />
              <NavLink
                href="/admin/settings"
                Icon={Settings}
                label="Settings"
                active={isActive('/admin/settings')}
                collapsed={collapsed}
                onClick={onNavigate}
              />
              <form action={logoutAction}>
                <button
                  type="submit"
                  title={collapsed ? 'Logout' : undefined}
                  className={`
                    flex w-full items-center gap-3 rounded-md p-2 text-xs
                    text-(--cream)/40 transition-colors
                    hover:bg-red-950/30 hover:text-red-400
                    ${collapsed ? `sm:justify-center` : ''}
                  `}
                >
                  <LogOut className="size-4 shrink-0" />
                  <span
                    style={cinzelStyle}
                    className={`
                      tracking-widest uppercase
                      ${collapsed ? `sm:hidden` : ''}
                    `}
                  >
                    Logout
                  </span>
                </button>
              </form>
            </div>
          </div>
        )}

        {!isAdmin && (
          <div className="pt-3">
            <NavLink
              href="/admin"
              Icon={ShieldCheck}
              label="Admin"
              active={isActive('/admin')}
              collapsed={collapsed}
              onClick={onNavigate}
            />
          </div>
        )}
      </nav>
    </div>
  )
}
