// Vercel serves each file in api/ as a function; the handler comes built
// from apps/server, so this file needs no TypeScript compile.
export { handleTrend as GET } from "@baza-imion/server/handlers"
