'use client'

import Link from 'next/link'
import {
  Home,
  ScrollText,
  BarChart3,
  ShieldCheck,
  User,
  LogOut,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Users,
  Settings,
} from 'lucide-react'
import { PlayerTier } from '@/lib/player-tier'
import type { Player } from '@/lib/players'

interface Props {
  players: Player[]
  isAdmin: boolean
  pathname: string
  collapsed: boolean
  onToggleCollapse: () => void
  onNavigate: () => void
  logoutAction: () => Promise<void>
}

export function Sidebar({
  players,
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
        className={`flex items-center border-b border-[var(--gold)]/15 px-3 py-4 ${collapsed ? 'sm:justify-center' : 'justify-between'}`}
      >
        <Link
          href="/"
          onClick={onNavigate}
          className={`font-cinzel text-sm tracking-[0.2em] text-[var(--gold)] uppercase ${collapsed ? 'sm:hidden' : ''}`}
        >
          HarborStats
        </Link>
        <button
          onClick={onToggleCollapse}
          className="hidden sm:flex items-center justify-center rounded p-1 text-[var(--cream)]/40 hover:text-[var(--gold)] transition-colors"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
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

        {isAdmin && (
          <div className="pt-3">
            <p
              className={`px-2 pb-1 text-xs font-cinzel tracking-widest text-[var(--cream)]/30 uppercase ${collapsed ? 'sm:hidden' : ''}`}
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
                  className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-xs text-[var(--cream)]/40 hover:bg-red-950/30 hover:text-red-400 transition-colors ${collapsed ? 'sm:justify-center' : ''}`}
                >
                  <LogOut className="h-4 w-4 shrink-0" />
                  <span
                    className={`font-cinzel tracking-widest uppercase ${collapsed ? 'sm:hidden' : ''}`}
                  >
                    Logout
                  </span>
                </button>
              </form>
            </div>
          </div>
        )}

        {players.length > 0 && (
          <div className="pt-3">
            <p
              className={`px-2 pb-1 text-xs font-cinzel tracking-widest text-[var(--cream)]/30 uppercase ${collapsed ? 'sm:hidden' : ''}`}
            >
              Players
            </p>
            <div className="space-y-0.5">
              {players.map((player) => (
                <NavLink
                  key={player.id}
                  href={`/players/${player.id}`}
                  Icon={User}
                  label={player.name}
                  active={isActive(`/players/${player.id}`, true)}
                  collapsed={collapsed}
                  onClick={onNavigate}
                  premium={player.tier === PlayerTier.Premium}
                />
              ))}
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

interface NavLinkProps {
  href: string
  Icon: React.ElementType
  label: string
  active: boolean
  collapsed: boolean
  onClick: () => void
  premium?: boolean
}

function NavLink({ href, Icon, label, active, collapsed, onClick, premium }: NavLinkProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`flex items-center gap-3 rounded-md px-2 py-2 text-xs transition-colors ${
        collapsed ? 'sm:justify-center' : ''
      } ${
        active
          ? 'bg-[var(--gold)]/10 text-[var(--gold)]'
          : 'text-[var(--cream)]/60 hover:bg-[var(--navy-800)]/50 hover:text-[var(--cream)]'
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span
        className={`truncate font-cinzel tracking-widest uppercase ${collapsed ? 'sm:hidden' : ''} ${premium ? 'text-[var(--gold)]' : ''}`}
      >
        {label}
      </span>
    </Link>
  )
}
