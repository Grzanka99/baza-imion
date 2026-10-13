export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quoted) {
      if (char !== '"') field += char
      else if (text[i + 1] === '"') field += text[i++]
      else quoted = false
    } else if (char === '"') {
      quoted = true
    } else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else if (char !== "\r") {
      field += char
    }
  }
  if (field !== "" || row.length > 0) rows.push([...row, field])
  return rows
}

/** A whole number in a CSV cell, or NaN. */
export function toCount(cell: string | undefined) {
  if (!cell?.trim()) return NaN
  const value = Number(cell)
  if (!Number.isInteger(value)) return NaN
  return value
}

export const isBlank = (line: string[]) =>
  line.length === 1 && line[0].trim() === ""
