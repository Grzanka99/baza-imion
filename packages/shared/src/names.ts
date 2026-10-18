// Name helpers both sides need: the web app links to name pages and the
// server renders them.

/** Each name has a page: ZOFIA at /imie/zofia. */
export const NAME_PATH = "/imie/"

export const SITE_NAME = "Baza imion"

export function namePath(name: string) {
  return NAME_PATH + encodeURIComponent(name.toLocaleLowerCase("pl"))
}

/** The name, in the source's capitals, whose page `pathname` is; null for any other path. */
export function nameFromPath(pathname: string): string | null {
  if (!pathname.startsWith(NAME_PATH)) {
    return null
  }
  let slug: string
  try {
    slug = decodeURIComponent(pathname.slice(NAME_PATH.length))
  } catch {
    return null
  }
  const name = slug.trim().toUpperCase()
  if (!name || name.includes("/")) {
    return null
  }
  return name
}

/** The source spells names in capitals: "ANNA MARIA" becomes "Anna Maria". */
export function displayName(name: string) {
  return name
    .toLocaleLowerCase("pl")
    .replace(/(^|[\s'-])(\p{L})/gu, (_, before: string, letter: string) => {
      return before + letter.toLocaleUpperCase("pl")
    })
}

/** The browser tab's and search result's title for a name's page. */
export function nameTitle(name: string) {
  return `Imię ${displayName(name)} – popularność w Polsce | ${SITE_NAME}`
}

/** Picks the Polish plural form: 1 imię, 2 imiona, 5 imion. */
export function plural(count: number, one: string, few: string, many: string) {
  const lastTwo = count % 100
  const last = count % 10
  if (count === 1) {
    return one
  }
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) {
    return few
  }
  return many
}

/** The home page's title; index.html holds the same text. */
export const HOME_TITLE = `${SITE_NAME} – ranking imion w Polsce z rejestru PESEL`
