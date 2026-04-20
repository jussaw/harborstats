import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SidebarShell } from '@/components/SidebarShell'
import { PlayerTier } from '@/lib/player-tier'

let mockPathname = '/admin/games'

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

const players = [{ id: 1, name: 'Alice', tier: PlayerTier.Premium }]

describe('SidebarShell', () => {
  function getMobileBackdrop() {
    return (
      screen.getByRole('complementary').parentElement?.querySelector(
        ':scope > div[aria-hidden="true"]',
      ) ?? null
    )
  }

  it('opens and closes the mobile navigation', async () => {
    mockPathname = '/admin/games'
    const user = userEvent.setup()

    render(
      <SidebarShell players={players} isAdmin logoutAction={vi.fn().mockResolvedValue(undefined)}>
        <main>Dashboard</main>
      </SidebarShell>,
    )

    await user.click(screen.getByLabelText('Open navigation'))

    expect(getMobileBackdrop()).not.toBeNull()
    expect(screen.getByRole('complementary')).toHaveClass('translate-x-0')

    await user.click(getMobileBackdrop() as HTMLElement)

    expect(getMobileBackdrop()).toBeNull()
    expect(screen.getByRole('complementary')).not.toHaveClass('translate-x-0')
  })

  it('persists the collapsed sidebar state in localStorage', async () => {
    mockPathname = '/admin/games'
    const user = userEvent.setup()

    const { unmount } = render(
      <SidebarShell players={players} isAdmin logoutAction={vi.fn().mockResolvedValue(undefined)}>
        <main>Dashboard</main>
      </SidebarShell>,
    )

    await user.click(await screen.findByLabelText('Collapse sidebar'))
    expect(localStorage.getItem('hs_sidebar_collapsed')).toBe('true')

    unmount()

    render(
      <SidebarShell players={players} isAdmin logoutAction={vi.fn().mockResolvedValue(undefined)}>
        <main>Dashboard</main>
      </SidebarShell>,
    )

    await waitFor(() => expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument())
  })

  it('shows the public Games link and marks it active on /games', () => {
    mockPathname = '/games'

    render(
      <SidebarShell players={players} isAdmin={false} logoutAction={vi.fn().mockResolvedValue(undefined)}>
        <main>Dashboard</main>
      </SidebarShell>,
    )

    const gamesLink = screen.getByRole('link', { name: 'Games' })

    expect(gamesLink).toHaveAttribute('href', '/games')
    expect(gamesLink).toHaveClass('bg-[var(--gold)]/10')
  })
})
