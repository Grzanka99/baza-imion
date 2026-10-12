import { useEffect, useState } from "react"

const FALLBACK_ERROR = "Nie udało się pobrać danych"

interface Settled<T> {
  url: string
  data?: T
  error?: string
}

/**
 * Fetches JSON from `url`. While a new URL loads, `data` keeps the previous
 * answer so the view does not flash empty.
 */
export function useApi<T>(url: string | null) {
  const [settled, setSettled] = useState<Settled<T>>()

  useEffect(() => {
    if (!url) return
    const controller = new AbortController()
    fetch(url, { signal: controller.signal })
      .then(async (response) => {
        const body = await response.json().catch(() => null)
        if (!response.ok || !body) {
          throw new Error(body?.error ?? FALLBACK_ERROR)
        }
        if (!controller.signal.aborted) setSettled({ url, data: body as T })
      })
      .catch((error: Error) => {
        if (!controller.signal.aborted) {
          setSettled({ url, error: error.message || FALLBACK_ERROR })
        }
      })
    return () => controller.abort()
  }, [url])

  const current = settled?.url === url
  return {
    data: settled?.data,
    error: current ? settled?.error : undefined,
    loading: url !== null && !current,
  }
}
