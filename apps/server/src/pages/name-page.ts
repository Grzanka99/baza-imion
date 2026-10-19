import {
  defaultYear,
  displayName,
  namePath,
  nameTitle,
  SITE_NAME,
} from "@baza-imion/shared"
import type { Dataset } from "@baza-imion/shared"
import { loadScope } from "../names/scope.ts"
import { queryTrend } from "../names/trend.ts"
import { escapeHtml, headTags } from "./html.ts"
import {
  childrenSentence,
  description,
  FOOTNOTE,
  populationSentence,
  trendTable,
} from "./name-text.ts"
import type { Figures } from "./name-text.ts"

/** What goes into the template: the status, the head tags and the body. */
export interface Page {
  status: number
  head: string
  body: string
}

async function figures(
  dataset: Dataset,
  name: string
): Promise<Figures | undefined> {
  const [trend, scope] = await Promise.all([
    queryTrend(dataset, name),
    loadScope(dataset, defaultYear(dataset), "all"),
  ])
  if (!trend) {
    return undefined
  }
  return { trend, row: scope.rows.find((row) => row.name === name) }
}

function main(content: string[]) {
  return [
    `<main class="mx-auto flex max-w-3xl flex-col gap-6 p-6">`,
    `<a class="w-fit text-sm text-muted-foreground underline" href="/">${SITE_NAME}: wszystkie imiona</a>`,
    ...content,
    `</main>`,
  ].join("\n")
}

/** The page of `name` (in capitals); `site` is the origin its links start with. */
export async function namePage(name: string, site: string): Promise<Page> {
  if (!name || name.length > 100) {
    return missingPage()
  }
  const [population, children] = await Promise.all([
    figures("population", name),
    figures("children", name),
  ])
  const found = population ?? children
  if (!found) {
    return missingPage()
  }
  const shown = displayName(found.trend.name)
  const escaped = escapeHtml(shown)

  const content = [
    `<h1 class="text-2xl font-semibold tracking-tight">Imię ${escaped}</h1>`,
  ]
  if (population?.row) {
    content.push(
      `<p>${escapeHtml(populationSentence(shown, population.row))}</p>`
    )
  }
  if (children) {
    // The children's ranking sums the same years as its trend, so a name
    // given to children always has a row there.
    const row = children.row!
    content.push(
      `<p>${escapeHtml(childrenSentence(shown, row, children.trend))}</p>`
    )
  }
  if (population) {
    content.push(
      trendTable(
        "population",
        `Liczba osób o imieniu ${shown} w kolejnych latach`,
        population.trend
      )
    )
  }
  if (children) {
    content.push(
      trendTable(
        "children",
        `Imię ${shown} nadane noworodkom rok po roku`,
        children.trend
      )
    )
  }
  content.push(
    `<p class="text-xs text-muted-foreground">${escapeHtml(FOOTNOTE)}</p>`
  )

  return {
    status: 200,
    head: headTags({
      title: nameTitle(found.trend.name),
      description: description(shown, population?.row, children?.row),
      url: site + namePath(found.trend.name),
    }),
    body: main(content),
  }
}

function missingPage(): Page {
  return {
    status: 404,
    head: headTags({
      title: `Brak imienia w danych | ${SITE_NAME}`,
      description: "Tego imienia nie ma w opublikowanych danych PESEL.",
    }),
    body: main([
      `<h1 class="text-2xl font-semibold tracking-tight">Brak imienia w danych</h1>`,
      `<p>Opublikowane dane z rejestru PESEL nie wykazują tego imienia ani wśród żyjących osób, ani wśród imion nadanych dzieciom od 2000 roku. Rejestr pomija imiona bardzo rzadkie.</p>`,
    ]),
  }
}
