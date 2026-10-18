import { DATASETS, defaultYear, namePath } from "@baza-imion/shared"
import { loadScope } from "../names/scope.ts"
import { escapeHtml } from "./html.ts"

/**
 * Names borne by fewer living people, and given to fewer children since 2000,
 * stay out of the sitemap: their pages are a few small numbers. They can
 * still be found and indexed through links.
 */
const MIN_COUNT = 100

/** The most addresses one sitemap file may list. */
const MAX_URLS = 50_000

/** The home page and the page of every name common enough in either dataset. */
export async function sitemap(site: string) {
  const scopes = await Promise.all(
    DATASETS.map((dataset) => loadScope(dataset, defaultYear(dataset), "all"))
  )
  const names = new Set<string>()
  for (const scope of scopes) {
    // Rows come most common first.
    for (const row of scope.rows) {
      if (row.count < MIN_COUNT) {
        break
      }
      names.add(row.name)
    }
  }
  const urls = [
    `${site}/`,
    ...[...names].map((name) => site + namePath(name)),
  ].slice(0, MAX_URLS)
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls.map((url) => `<url><loc>${escapeHtml(url)}</loc></url>`),
    `</urlset>`,
    ``,
  ].join("\n")
}

export function robots(site: string) {
  return `User-agent: *\nAllow: /\n\nSitemap: ${site}/sitemap.xml\n`
}
