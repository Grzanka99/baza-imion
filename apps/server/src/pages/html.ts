import { SITE_NAME } from "@baza-imion/shared"

// Small helpers for writing HTML as strings.

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
}

export function escapeHtml(text: string) {
  let escaped = ""
  for (const char of text) {
    escaped += ESCAPES[char] ?? char
  }
  return escaped
}

const numberFormat = new Intl.NumberFormat("pl-PL")

export const formatNumber = (value: number) => numberFormat.format(value)

/** The tags a page's head holds. A page with no `url` (absolute) is kept out of search results. */
export function headTags(page: {
  title: string
  description: string
  url?: string
}) {
  const title = escapeHtml(page.title)
  const description = escapeHtml(page.description)
  const tags = [
    `<title>${title}</title>`,
    `<meta name="description" content="${description}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta name="twitter:card" content="summary" />`,
  ]
  if (page.url) {
    const url = escapeHtml(page.url)
    tags.push(`<link rel="canonical" href="${url}" />`)
    tags.push(`<meta property="og:url" content="${url}" />`)
  } else {
    tags.push(`<meta name="robots" content="noindex" />`)
  }
  return tags.join("\n    ")
}

/** A table with a header row; `rows` are already escaped. */
export function table(caption: string, header: string[], rows: string[][]) {
  const cells = (tag: string, row: string[]) =>
    row.map((cell) => `<${tag} class="px-2 py-1">${cell}</${tag}>`).join("")
  return [
    `<table class="w-fit text-sm tabular-nums">`,
    `<caption class="mb-2 text-left text-lg font-semibold">${escapeHtml(caption)}</caption>`,
    `<thead><tr class="text-left text-muted-foreground">${cells("th", header)}</tr></thead>`,
    `<tbody>${rows.map((row) => `<tr class="border-t">${cells("td", row)}</tr>`).join("")}</tbody>`,
    `</table>`,
  ].join("\n")
}
