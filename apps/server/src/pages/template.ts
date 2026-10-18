import { readFile } from "node:fs/promises"

// The web app's built index.html, with the parts each page fills in marked
// by comments: <!-- seo … --> to <!-- /seo --> in <head>, and
// <!-- page --> to <!-- /page --> inside #root.

const PARTS = {
  head: ["<!-- seo", "<!-- /seo -->"],
  body: ["<!-- page -->", "<!-- /page -->"],
} as const

const templates = new Map<string, Promise<string>>()

/** Read once per process; a failed read is tried again next time. */
export function loadTemplate(path: string) {
  let template = templates.get(path)
  if (!template) {
    template = readFile(path, "utf8")
    template.catch(() => templates.delete(path))
    templates.set(path, template)
  }
  return template
}

function replacePart(
  html: string,
  [open, close]: readonly string[],
  content: string
) {
  const start = html.indexOf(open)
  const end = html.indexOf(close, start)
  if (start === -1 || end === -1) {
    throw new Error(`index.html has no ${open} … ${close} part`)
  }
  return html.slice(0, start) + content + html.slice(end + close.length)
}

/** The template with this page's head tags and body content. */
export function fillTemplate(
  template: string,
  page: { head: string; body: string }
) {
  const withHead = replacePart(template, PARTS.head, page.head)
  return replacePart(withHead, PARTS.body, page.body)
}
