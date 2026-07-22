/**
 * Global test setup.
 *
 * Runs once before each test file. Configures:
 *  - `@testing-library/jest-dom` matchers (toBeInTheDocument, etc.)
 *  - automatic cleanup of rendered React trees between tests
 *  - default mocks for browser-only globals that jsdom doesn't ship.
 *
 * Per-test mocks (supabase client, useRealtimeRows, fetch...) live in the
 * test files themselves via `vi.mock(...)`. Keep this file minimal so the
 * mocks stay close to the assertions that depend on them.
 */
import "@testing-library/jest-dom/vitest"
import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

afterEach(() => {
  cleanup()
})

// jsdom doesn't ship matchMedia; many UI libs read it on mount.
if (typeof window !== "undefined" && !window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// jsdom's ResizeObserver is missing — some Radix/shadcn primitives use it.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}

// jsdom's IntersectionObserver is missing — virtualized lists and some
// scroll-based components use it.
if (typeof globalThis.IntersectionObserver === "undefined") {
  // @ts-expect-error: minimal shape suffices for components we test.
  globalThis.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
}

// happy-dom 20.x exposes `window.localStorage` as an object but doesn't
// implement its Storage methods, so any code that reads/writes it (saved
// table views, CRM toolbar filters) throws "setItem is not a function"
// under test. Provide an in-memory Storage shim.
if (
  typeof window !== "undefined" &&
  typeof window.localStorage?.setItem !== "function"
) {
  const store = new Map<string, string>()
  const localStorageShim: Storage = {
    getItem: (key) => (store.has(key) ? store.get(key)! : null),
    setItem: (key, value) => {
      store.set(key, String(value))
    },
    removeItem: (key) => {
      store.delete(key)
    },
    clear: () => {
      store.clear()
    },
    key: (index) => Array.from(store.keys())[index] ?? null,
    get length() {
      return store.size
    },
  }
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: localStorageShim,
  })
}
