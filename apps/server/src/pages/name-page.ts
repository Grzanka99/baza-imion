import {
  defaultYear,
  displayName,
  namePath,
  nameTitle,
  SITE_NAME,
  type Dataset,
} from "@baza-imion/shared"
import { queryNames } from "../names/list.ts"
import { queryTrend } from "../names/trend.ts"
import { escapeHtml, headTags } from "./html.ts"
import {
  childrenSentence,
  description,
  FOOTNOTE,
  populationSentence,
  trendTable,
  type Figures,
} from "./name-text.ts"

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
  const trend = await queryTrend(dataset, name)
  if (!trend) {
    return undefined
  }
  const { rows } = await queryNames({
    dataset,
    year: defaultYear(dataset),
    sex: "all",
    search: "",
    sort: "count",
    order: "desc",
    page: 1,
    perPage: 1,
    random: false,
    only: [name],
  })
  return { trend, row: rows[0] }
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
    content.push(`<p>${escapeHtml(childrenSentence(shown, children))}</p>`)
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
      description: description(shown, population, children),
      url: site + namePath(found.trend.name),
    }),
    body: main(content),
  }
}

function missingPage(): Page {
  return {
    status: 404,
    head: headTags({
      title: `Nie ma takiego imienia | ${SITE_NAME}`,
      description: "W rejestrze PESEL nie ma takiego imienia.",
    }),
    body: main([
      `<h1 class="text-2xl font-semibold tracking-tight">Nie ma takiego imienia</h1>`,
      `<p>Rejestr PESEL nie wykazuje tego imienia ani wśród żyjących osób, ani wśród imion nadanych dzieciom od 2000 roku.</p>`,
    ]),
  }
}
