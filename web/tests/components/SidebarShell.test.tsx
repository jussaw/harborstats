import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SidebarShell } from '@/components/SidebarShell'

let mockPathname = '/admin/games'

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

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
      <SidebarShell isAdmin logoutAction={vi.fn().mockResolvedValue(undefined)}>
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
      <SidebarShell isAdmin logoutAction={vi.fn().mockResolvedValue(undefined)}>
        <main>Dashboard</main>
      </SidebarShell>,
    )

    await user.click(await screen.findByLabelText('Collapse sidebar'))
    expect(localStorage.getItem('hs_sidebar_collapsed')).toBe('true')

    unmount()

    render(
      <SidebarShell isAdmin logoutAction={vi.fn().mockResolvedValue(undefined)}>
        <main>Dashboard</main>
      </SidebarShell>,
    )

    await waitFor(() => expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument())
  })

  it('shows the public Games link and marks it active on /games', () => {
    mockPathname = '/games'

    render(
      <SidebarShell isAdmin={false} logoutAction={vi.fn().mockResolvedValue(undefined)}>
        <main>Dashboard</main>
      </SidebarShell>,
    )

    const gamesLink = screen.getByRole('link', { name: 'Games' })

    expect(gamesLink).toHaveAttribute('href', '/games')
    expect(gamesLink).toHaveClass('bg-[var(--gold)]/10')
  })

  it('shows the public Players link and marks it active on /players', () => {
    mockPathname = '/players'

    render(
      <SidebarShell isAdmin={false} logoutAction={vi.fn().mockResolvedValue(undefined)}>
        <main>Dashboard</main>
      </SidebarShell>,
    )

    const playersLink = screen.getByRole('link', { name: 'Players' })

    expect(playersLink).toHaveAttribute('href', '/players')
    expect(playersLink).toHaveClass('bg-[var(--gold)]/10')
  })

  it('marks the Players link active on /players/[id]', () => {
    mockPathname = '/players/42'

    render(
      <SidebarShell isAdmin={false} logoutAction={vi.fn().mockResolvedValue(undefined)}>
        <main>Dashboard</main>
      </SidebarShell>,
    )

    expect(screen.getByRole('link', { name: 'Players' })).toHaveClass('bg-[var(--gold)]/10')
  })
})
