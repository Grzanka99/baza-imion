import { useEffect } from "react"

import { HOME_TITLE } from "@baza-imion/shared"

/** Puts `title` in the browser tab, and the home page's back once it is null or the caller unmounts. */
export function usePageTitle(title: string | null) {
  useEffect(() => {
    if (title === null) {
      return
    }
    document.title = title
    return () => {
      document.title = HOME_TITLE
    }
  }, [title])
}
