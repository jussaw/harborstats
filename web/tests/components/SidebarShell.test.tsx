import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SidebarShell } from '@/components/SidebarShell'

let mockPathname = '/admin/games'

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}))

describe('SidebarShell', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
  })

  function renderServerMarkup(ui: React.ReactElement) {
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window')
    const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'document')

    Object.defineProperty(globalThis, 'window', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(globalThis, 'document', {
      value: undefined,
      configurable: true,
      writable: true,
    })

    try {
      return renderToString(ui)
    } finally {
      if (windowDescriptor) {
        Object.defineProperty(globalThis, 'window', windowDescriptor)
      } else {
        Reflect.deleteProperty(globalThis, 'window')
      }

      if (documentDescriptor) {
        Object.defineProperty(globalThis, 'document', documentDescriptor)
      } else {
        Reflect.deleteProperty(globalThis, 'document')
      }
    }
  }

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

  it('hydrates without mismatch warnings when a collapsed preference is stored', async () => {
    mockPathname = '/stats'
    localStorage.setItem('hs_sidebar_collapsed', 'true')

    const container = document.createElement('div')
    container.innerHTML = renderServerMarkup(
      <SidebarShell isAdmin logoutAction={vi.fn().mockResolvedValue(undefined)}>
        <main>Dashboard</main>
      </SidebarShell>,
    )
    document.body.appendChild(container)

    const recoverableErrors: Error[] = []
    let root: ReturnType<typeof hydrateRoot> | null = null

    await act(async () => {
      root = hydrateRoot(
        container,
        <SidebarShell isAdmin logoutAction={vi.fn().mockResolvedValue(undefined)}>
          <main>Dashboard</main>
        </SidebarShell>,
        {
          onRecoverableError(error) {
            recoverableErrors.push(error)
          },
        },
      )
      await Promise.resolve()
    })

    await waitFor(() => expect(screen.getByLabelText('Expand sidebar')).toBeInTheDocument())

    expect(recoverableErrors).toHaveLength(0)

    await act(async () => {
      root?.unmount()
      await Promise.resolve()
    })
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
    expect(gamesLink).toHaveClass('bg-(--gold)/10')
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
    expect(playersLink).toHaveClass('bg-(--gold)/10')
  })

  it('marks the Players link active on /players/[id]', () => {
    mockPathname = '/players/42'

    render(
      <SidebarShell isAdmin={false} logoutAction={vi.fn().mockResolvedValue(undefined)}>
        <main>Dashboard</main>
      </SidebarShell>,
    )

    expect(screen.getByRole('link', { name: 'Players' })).toHaveClass('bg-(--gold)/10')
  })
})
