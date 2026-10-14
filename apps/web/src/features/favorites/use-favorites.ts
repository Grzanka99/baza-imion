import { useCallback, useMemo, useSyncExternalStore } from "react"

const STORAGE_KEY = "favorite-names"
const CHANGE_EVENT = "favoriteschange"

function read() {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "[]"
  } catch {
    // Storage can be blocked, for example in private browsing.
    return "[]"
  }
}

function subscribe(onChange: () => void) {
  // "storage" fires for changes made in other tabs.
  window.addEventListener("storage", onChange)
  window.addEventListener(CHANGE_EVENT, onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener(CHANGE_EVENT, onChange)
  }
}

function parse(stored: string): string[] {
  try {
    const value: unknown = JSON.parse(stored)
    if (!Array.isArray(value)) return []
    return value.filter((name) => typeof name === "string")
  } catch {
    return []
  }
}

/** Favourite names, kept in this browser's local storage. */
export function useFavorites() {
  const stored = useSyncExternalStore(subscribe, read)
  const names = useMemo(() => parse(stored).sort(), [stored])
  const set = useMemo(() => new Set(names), [names])

  const toggle = useCallback((name: string) => {
    const current = new Set(parse(read()))
    if (!current.delete(name)) current.add(name)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...current]))
    } catch {
      return
    }
    window.dispatchEvent(new Event(CHANGE_EVENT))
  }, [])

  return { names, has: (name: string) => set.has(name), toggle }
}
