import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { resetStores } from './helpers'

const jsdomWin = (globalThis as { jsdom?: { window: Window } }).jsdom?.window
if (jsdomWin && typeof globalThis.localStorage === 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: jsdomWin.localStorage,
    configurable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: jsdomWin.sessionStorage,
    configurable: true,
  })
}

vi.mock('valtio-persist', async () => {
  const { proxy } = await vi.importActual<typeof import('valtio')>('valtio')

  return {
    persist: async <T extends object>(initialState: T) => ({
      store: proxy(structuredClone(initialState)),
    }),
  }
})

beforeEach(() => {
  localStorage.clear()
  resetStores()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  localStorage.clear()
  resetStores()
})
