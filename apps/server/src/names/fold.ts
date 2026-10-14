/** Uppercases and strips diacritics, so "lukasz" finds "ŁUKASZ". */
export function fold(text: string) {
  return text
    .toUpperCase()
    .replaceAll("Ł", "L")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
}
