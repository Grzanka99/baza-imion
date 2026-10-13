import { useEffect, useState } from "react"

import { isFresh, recall, remember } from "@/lib/answer-cache"

const FALLBACK_ERROR = "Nie udało się pobrać danych"

interface Settled<T> {
  url: string
  data?: T
  error?: string
}

/**
 * Fetches JSON from `url`, or takes it from the answer cache when it was
 * fetched before. While a new URL loads, `data` keeps the previous answer so
 * the view does not flash empty.
 */
export function useApi<T>(url: string | null) {
  const [settled, setSettled] = useState<Settled<T>>()

  useEffect(() => {
    if (!url) return
    const known = recall(url)
    if (known && isFresh(known)) return

    const controller = new AbortController()
    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => null)
        if (!response.ok || !body) {
          throw new Error(body?.error ?? FALLBACK_ERROR)
        }
        if (controller.signal.aborted) return
        remember(url, body)
        setSettled({ url, data: body as T })
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) {
          setSettled({ url, error: error.message || FALLBACK_ERROR })
        }
      })
    return () => controller.abort()
  }, [url])

  // An answer past its age is still shown while its replacement loads.
  const known = url ? recall(url) : undefined
  const current = settled?.url === url
  return {
    data: known ? (known.data as T) : settled?.data,
    error: current ? settled?.error : undefined,
    loading: url !== null && !known && !current,
  }
}
