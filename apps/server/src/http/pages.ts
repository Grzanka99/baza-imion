import { NAME_PATH, nameFromPath } from "@baza-imion/shared"
import { namePage } from "../pages/name-page.ts"
import { robots, sitemap } from "../pages/sitemap.ts"
import { fillTemplate, loadTemplate } from "../pages/template.ts"

// What crawlers read, unlike the JSON in handlers.ts. vercel.json rewrites
// /imie/:name, /sitemap.xml and /robots.txt to these, and so does the Node
// server (src/index.ts).

// The HTML names the build's own scripts, so browsers ask again on every
// visit. Vercel's CDN keeps it as long as API answers (see respond.ts); each
// deployment has a cache of its own.
const PAGE_CACHE =
  "public, max-age=0, s-maxage=604800, stale-while-revalidate=864000"

/** Where canonical links point: SITE_URL when set, so the vercel.app address points at the real domain, else the request's origin. */
function siteOf(request: Request) {
  let site = process.env.SITE_URL?.trim() || new URL(request.url).origin
  while (site.endsWith("/")) {
    site = site.slice(0, -1)
  }
  return site
}

function respond(body: string, status: number, type: string, cache: string) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": `${type};charset=utf-8`,
      "Cache-Control": cache,
    },
  })
}

/** Answers ?name= with the page of that name, built from the web app's index.html at `templatePath`. */
export function namePageHandler(templatePath: string) {
  return async (request: Request) => {
    const template = await loadTemplate(templatePath)
    // Turns the rewritten path segment, encoded or not, into the registry's
    // capitals.
    const param = new URL(request.url).searchParams.get("name") ?? ""
    const name = nameFromPath(NAME_PATH + param) ?? ""
    try {
      const page = await namePage(name, siteOf(request))
      const html = fillTemplate(template, page)
      return respond(html, page.status, "text/html", PAGE_CACHE)
    } catch (error) {
      console.error(error)
      // The app still starts, and asks the API itself.
      return respond(template, 503, "text/html", "no-store")
    }
  }
}

export async function handleSitemap(request: Request) {
  try {
    const xml = await sitemap(siteOf(request))
    return respond(xml, 200, "application/xml", PAGE_CACHE)
  } catch (error) {
    console.error(error)
    return respond("", 503, "application/xml", "no-store")
  }
}

export async function handleRobots(request: Request) {
  return respond(robots(siteOf(request)), 200, "text/plain", PAGE_CACHE)
}
