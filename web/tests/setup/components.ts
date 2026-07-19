import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { applyTestEnv } from '../helpers/test-env'

applyTestEnv()

// Testing Library's default async budget (1000ms) is too tight for `findBy*`/
// `waitFor` when the full component suite saturates all CPU cores: a cold
// accessible-role scan can miss a promptly-rendered node before the budget
// expires, flaking load-dependent assertions (e.g. GameForm's validation
// alert). Green assertions still resolve as soon as the condition holds, so
// this only widens the retry window; it does not slow passing tests.
//
// Keep this comfortably below Vitest's 5000ms component `testTimeout`: if the
// two were equal, a genuinely missing element would trip the test timeout at
// the same instant, masking Testing Library's descriptive locator error with a
// generic "Test timed out" and leaving no room for the final retry. A truly
// failing assertion now surfaces up to ~3s slower, but with the precise error.
configure({ asyncUtilTimeout: 3000 })

if (typeof HTMLDialogElement !== 'undefined') {
  if (!HTMLDialogElement.prototype.showModal) {
    HTMLDialogElement.prototype.showModal = function showModal() {
      this.open = true
    }
  }

  if (!HTMLDialogElement.prototype.close) {
    HTMLDialogElement.prototype.close = function close() {
      this.open = false
    }
  }
}

if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
}

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})
